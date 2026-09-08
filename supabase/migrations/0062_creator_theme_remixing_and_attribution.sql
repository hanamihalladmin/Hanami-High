begin;

create table public.creator_theme_remix_sessions (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  source_version_id uuid not null references public.creator_theme_versions(id) on delete restrict,
  source_author_account_id uuid not null references public.accounts(id) on delete restrict,
  source_title text not null,
  backup_theme jsonb not null default '{}'::jsonb,
  backup_widgets jsonb not null default '[]'::jsonb,
  session_state text not null default 'active' check (session_state in ('active','converted','restored')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_theme_lineage (
  listing_id uuid primary key references public.creator_theme_listings(id) on delete cascade,
  source_listing_id uuid not null references public.creator_theme_listings(id) on delete restrict,
  source_version_id uuid not null references public.creator_theme_versions(id) on delete restrict,
  source_author_account_id uuid not null references public.accounts(id) on delete restrict,
  remix_depth smallint not null default 1 check (remix_depth between 1 and 20),
  attribution_text text not null,
  created_at timestamptz not null default now()
);

create index creator_theme_lineage_source_idx on public.creator_theme_lineage(source_listing_id,created_at desc);
create trigger creator_theme_remix_sessions_touch_updated_at before update on public.creator_theme_remix_sessions for each row execute function private.touch_updated_at();

alter table public.creator_theme_remix_sessions enable row level security;
alter table public.creator_theme_lineage enable row level security;

create policy creator_theme_remix_sessions_self_read on public.creator_theme_remix_sessions
for select to authenticated using (account_id=(select auth.uid()));

create policy creator_theme_lineage_visible on public.creator_theme_lineage
for select to authenticated using (
  exists(
    select 1 from public.creator_theme_listings l
    where l.id=listing_id
      and (l.author_account_id=(select auth.uid()) or (l.state='published' and l.visibility in ('public','unlisted')))
  )
);

revoke all on public.creator_theme_remix_sessions,public.creator_theme_lineage from anon;
grant select on public.creator_theme_remix_sessions,public.creator_theme_lineage to authenticated;

create or replace function private.has_active_plus_for_account(p_account_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.hanami_plus_entitlements e where e.account_id=p_account_id and e.ends_at>now());
$$;

create or replace function public.begin_creator_theme_remix(p_listing_id uuid)
returns table(character_id uuid, source_listing_id uuid, source_version_id uuid, source_title text)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_listing public.creator_theme_listings%rowtype;
  v_version public.creator_theme_versions%rowtype;
  v_backup_theme jsonb;
  v_backup_widgets jsonb;
  v_widgets jsonb;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required' using errcode='42501'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  if v_character is null then raise exception 'Choose an active character first' using errcode='22023'; end if;

  select * into v_listing from public.creator_theme_listings l
  where l.id=p_listing_id and l.state='published' and l.visibility in ('public','unlisted');
  if v_listing.id is null then raise exception 'Published theme not found' using errcode='P0002'; end if;

  select * into v_version from public.creator_theme_versions v
  where v.listing_id=v_listing.id and v.version_no=v_listing.current_version;
  if v_version.id is null then raise exception 'Theme version not found' using errcode='P0002'; end if;

  select coalesce(p.theme_draft,'{}'::jsonb) into v_backup_theme from public.character_profiles p where p.character_id=v_character;
  select coalesce(jsonb_agg(jsonb_build_object(
    'widget_type',w.widget_type,'title',w.title,'config',w.config,'x',w.x,'y',w.y,'width',w.width,'height',w.height,'z_index',w.z_index,'is_visible',w.is_visible
  ) order by w.z_index,w.y,w.x),'[]'::jsonb) into v_backup_widgets
  from public.profile_widgets w where w.character_id=v_character;

  insert into public.creator_theme_remix_sessions(character_id,account_id,source_listing_id,source_version_id,source_author_account_id,source_title,backup_theme,backup_widgets,session_state,started_at)
  values(v_character,v_account,v_listing.id,v_version.id,v_listing.author_account_id,v_listing.title,coalesce(v_backup_theme,'{}'::jsonb),coalesce(v_backup_widgets,'[]'::jsonb),'active',now())
  on conflict(character_id) do update set account_id=excluded.account_id,source_listing_id=excluded.source_listing_id,source_version_id=excluded.source_version_id,source_author_account_id=excluded.source_author_account_id,source_title=excluded.source_title,backup_theme=excluded.backup_theme,backup_widgets=excluded.backup_widgets,session_state='active',started_at=now(),updated_at=now();

  update public.character_profiles set theme_draft=coalesce(v_version.theme_payload->'theme','{}'::jsonb),updated_at=now() where character_id=v_character;
  delete from public.profile_widgets where character_id=v_character;
  v_widgets:=coalesce(v_version.theme_payload->'widgets','[]'::jsonb);
  insert into public.profile_widgets(character_id,widget_type,title,config,x,y,width,height,z_index,is_visible)
  select v_character,
    coalesce(nullif(w->>'widget_type',''),'note'),
    nullif(w->>'title',''),
    coalesce(w->'config','{}'::jsonb),
    greatest(1,least(12,coalesce((w->>'x')::smallint,1))),
    greatest(1,least(200,coalesce((w->>'y')::integer,1))),
    greatest(1,least(12,coalesce((w->>'width')::smallint,4))),
    greatest(1,least(20,coalesce((w->>'height')::smallint,3))),
    coalesce((w->>'z_index')::smallint,0),
    coalesce((w->>'is_visible')::boolean,(w->>'visible')::boolean,true)
  from jsonb_array_elements(v_widgets) w;

  return query select v_character,v_listing.id,v_version.id,v_listing.title;
end;
$$;

create or replace function public.restore_creator_theme_remix_backup()
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_session public.creator_theme_remix_sessions%rowtype;
  v_widgets jsonb;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  select * into v_session from public.creator_theme_remix_sessions s where s.character_id=v_character and s.account_id=v_account and s.session_state in ('active','converted');
  if v_session.character_id is null then raise exception 'No remix backup is available' using errcode='P0002'; end if;

  update public.character_profiles set theme_draft=v_session.backup_theme,updated_at=now() where character_id=v_character;
  delete from public.profile_widgets where character_id=v_character;
  v_widgets:=coalesce(v_session.backup_widgets,'[]'::jsonb);
  insert into public.profile_widgets(character_id,widget_type,title,config,x,y,width,height,z_index,is_visible)
  select v_character,coalesce(nullif(w->>'widget_type',''),'note'),nullif(w->>'title',''),coalesce(w->'config','{}'::jsonb),
    greatest(1,least(12,coalesce((w->>'x')::smallint,1))),greatest(1,least(200,coalesce((w->>'y')::integer,1))),
    greatest(1,least(12,coalesce((w->>'width')::smallint,4))),greatest(1,least(20,coalesce((w->>'height')::smallint,3))),
    coalesce((w->>'z_index')::smallint,0),coalesce((w->>'is_visible')::boolean,true)
  from jsonb_array_elements(v_widgets) w;
  update public.creator_theme_remix_sessions set session_state='restored',updated_at=now() where character_id=v_character;
  return true;
end;
$$;

create or replace function public.create_creator_remix_listing(p_title text,p_slug text,p_description text default null,p_tags text[] default '{}'::text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_session public.creator_theme_remix_sessions%rowtype;
  v_listing_id uuid;
  v_depth smallint;
  v_source_creator text;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required' using errcode='42501'; end if;
  if length(trim(p_title))<1 or length(trim(p_slug))<1 then raise exception 'Title and slug required' using errcode='22023'; end if;
  if not exists(select 1 from public.creator_profiles cp where cp.account_id=v_account) then raise exception 'Create a Creator Studio portfolio first' using errcode='22023'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  select * into v_session from public.creator_theme_remix_sessions s where s.character_id=v_character and s.account_id=v_account and s.session_state='active';
  if v_session.character_id is null then raise exception 'Start a theme remix first' using errcode='P0002'; end if;

  select coalesce(l.remix_depth,0)+1 into v_depth from public.creator_theme_lineage l where l.listing_id=v_session.source_listing_id;
  v_depth:=coalesce(v_depth,1);
  select coalesce(cp.display_name,'Hanami Creator') into v_source_creator from public.creator_profiles cp where cp.account_id=v_session.source_author_account_id;

  insert into public.creator_theme_listings(author_account_id,author_character_id,slug,title,description,tags,state,visibility)
  values(v_account,v_character,lower(trim(p_slug)),trim(p_title),nullif(trim(coalesce(p_description,'')),''),coalesce(p_tags,'{}'::text[]),'draft','public')
  returning id into v_listing_id;

  insert into public.creator_theme_lineage(listing_id,source_listing_id,source_version_id,source_author_account_id,remix_depth,attribution_text)
  values(v_listing_id,v_session.source_listing_id,v_session.source_version_id,v_session.source_author_account_id,v_depth,'Remixed from "'||v_session.source_title||'" by '||coalesce(v_source_creator,'Hanami Creator'));
  update public.creator_theme_remix_sessions set session_state='converted',updated_at=now() where character_id=v_character;
  return v_listing_id;
end;
$$;

revoke all on function public.begin_creator_theme_remix(uuid),public.restore_creator_theme_remix_backup(),public.create_creator_remix_listing(text,text,text,text[]) from public,anon;
grant execute on function public.begin_creator_theme_remix(uuid),public.restore_creator_theme_remix_backup(),public.create_creator_remix_listing(text,text,text,text[]) to authenticated;

commit;
