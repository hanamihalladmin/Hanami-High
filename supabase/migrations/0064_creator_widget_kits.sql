begin;

create table public.creator_widget_kits (
  id uuid primary key default gen_random_uuid(),
  author_account_id uuid not null references public.accounts(id) on delete cascade,
  author_character_id uuid references public.characters(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,47}$'),
  title text not null check (length(title) between 1 and 80),
  description text check (description is null or length(description) <= 400),
  tags text[] not null default '{}'::text[],
  kit_kind text not null default 'mixed' check (kit_kind in ('mixed','header','links','music','photos','journal','social','club','decorative','utility')),
  state text not null default 'draft' check (state in ('draft','published','hidden','retired')),
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  current_version integer not null default 0 check (current_version >= 0),
  install_count integer not null default 0 check (install_count >= 0),
  favorite_count integer not null default 0 check (favorite_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_widget_kit_versions (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.creator_widget_kits(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  widget_payload jsonb not null default '[]'::jsonb,
  widget_count smallint not null check (widget_count between 1 and 12),
  changelog text check (changelog is null or length(changelog) <= 500),
  created_at timestamptz not null default now(),
  unique(kit_id,version_no)
);

create table public.creator_widget_kit_favorites (
  account_id uuid not null references public.accounts(id) on delete cascade,
  kit_id uuid not null references public.creator_widget_kits(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(account_id,kit_id)
);

create table public.profile_widget_attribution (
  widget_id uuid primary key references public.profile_widgets(id) on delete cascade,
  kit_id uuid not null references public.creator_widget_kits(id) on delete restrict,
  version_id uuid not null references public.creator_widget_kit_versions(id) on delete restrict,
  source_author_account_id uuid not null references public.accounts(id) on delete restrict,
  attribution_text text not null,
  installed_at timestamptz not null default now()
);

create index creator_widget_kits_browse_idx on public.creator_widget_kits(state,visibility,published_at desc);
create index creator_widget_kit_versions_kit_idx on public.creator_widget_kit_versions(kit_id,version_no desc);
create index profile_widget_attribution_kit_idx on public.profile_widget_attribution(kit_id,installed_at desc);

create trigger creator_widget_kits_touch_updated_at before update on public.creator_widget_kits for each row execute function private.touch_updated_at();

alter table public.creator_widget_kits enable row level security;
alter table public.creator_widget_kit_versions enable row level security;
alter table public.creator_widget_kit_favorites enable row level security;
alter table public.profile_widget_attribution enable row level security;

create policy creator_widget_kits_read on public.creator_widget_kits
for select to authenticated using (
  author_account_id=(select auth.uid())
  or (state='published' and visibility in ('public','unlisted'))
);
create policy creator_widget_kits_plus_insert on public.creator_widget_kits
for insert to authenticated with check (
  author_account_id=(select auth.uid())
  and private.has_active_plus_for_account((select auth.uid()))
);
create policy creator_widget_kits_plus_update on public.creator_widget_kits
for update to authenticated using (
  author_account_id=(select auth.uid()) and private.has_active_plus_for_account((select auth.uid()))
) with check (author_account_id=(select auth.uid()));
create policy creator_widget_kits_plus_delete on public.creator_widget_kits
for delete to authenticated using (
  author_account_id=(select auth.uid()) and private.has_active_plus_for_account((select auth.uid()))
);

create policy creator_widget_kit_versions_read on public.creator_widget_kit_versions
for select to authenticated using (
  exists(
    select 1 from public.creator_widget_kits k where k.id=kit_id
      and (k.author_account_id=(select auth.uid()) or (k.state='published' and k.visibility in ('public','unlisted')))
  )
);

create policy creator_widget_kit_favorites_self_read on public.creator_widget_kit_favorites
for select to authenticated using (account_id=(select auth.uid()));

create policy profile_widget_attribution_owner_read on public.profile_widget_attribution
for select to authenticated using (
  exists(
    select 1 from public.profile_widgets w
    join public.characters c on c.id=w.character_id
    where w.id=widget_id and c.account_id=(select auth.uid())
  )
);

revoke all on public.creator_widget_kits,public.creator_widget_kit_versions,public.creator_widget_kit_favorites,public.profile_widget_attribution from anon;
grant select,insert,update,delete on public.creator_widget_kits to authenticated;
grant select on public.creator_widget_kit_versions to authenticated;
grant select on public.creator_widget_kit_favorites to authenticated;
grant select on public.profile_widget_attribution to authenticated;

create or replace function public.publish_creator_widget_kit(p_kit_id uuid,p_widget_ids uuid[],p_changelog text default null)
returns table(version_id uuid,version_no integer,widget_count integer)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_kit public.creator_widget_kits%rowtype;
  v_next_version integer;
  v_count integer;
  v_min_y integer;
  v_payload jsonb;
  v_version_id uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required' using errcode='42501'; end if;
  if coalesce(array_length(p_widget_ids,1),0) between 1 and 12 is false then raise exception 'Choose between 1 and 12 widgets' using errcode='22023'; end if;
  if exists(select 1 from unnest(p_widget_ids) x group by x having count(*)>1) then raise exception 'Duplicate widget selection' using errcode='22023'; end if;

  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  if v_character is null then raise exception 'Choose an active character first' using errcode='22023'; end if;
  select * into v_kit from public.creator_widget_kits k where k.id=p_kit_id and k.author_account_id=v_account;
  if v_kit.id is null then raise exception 'Widget kit not found' using errcode='P0002'; end if;

  select count(*),min(w.y) into v_count,v_min_y from public.profile_widgets w where w.id=any(p_widget_ids) and w.character_id=v_character;
  if v_count<>array_length(p_widget_ids,1) then raise exception 'Every selected widget must belong to the active character' using errcode='42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'widget_type',w.widget_type,
    'title',w.title,
    'config',w.config,
    'x',w.x,
    'relative_y',w.y-v_min_y,
    'width',w.width,
    'height',w.height,
    'z_index',w.z_index,
    'is_visible',w.is_visible
  ) order by w.y,w.x,w.z_index),'[]'::jsonb)
  into v_payload
  from public.profile_widgets w where w.id=any(p_widget_ids) and w.character_id=v_character;

  v_next_version:=v_kit.current_version+1;
  insert into public.creator_widget_kit_versions(kit_id,version_no,widget_payload,widget_count,changelog)
  values(v_kit.id,v_next_version,v_payload,v_count,nullif(trim(coalesce(p_changelog,'')),''))
  returning id into v_version_id;

  update public.creator_widget_kits set current_version=v_next_version,state='published',published_at=coalesce(published_at,now()),updated_at=now() where id=v_kit.id;
  return query select v_version_id,v_next_version,v_count;
end;
$$;

create or replace function public.install_creator_widget_kit(p_kit_id uuid)
returns table(inserted_count integer,version_id uuid)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_kit public.creator_widget_kits%rowtype;
  v_version public.creator_widget_kit_versions%rowtype;
  v_base_y integer;
  v_entry jsonb;
  v_new_widget uuid;
  v_inserted integer:=0;
  v_creator_name text;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required' using errcode='42501'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  if v_character is null then raise exception 'Choose an active character first' using errcode='22023'; end if;

  select * into v_kit from public.creator_widget_kits k where k.id=p_kit_id and k.state='published' and k.visibility in ('public','unlisted');
  if v_kit.id is null then raise exception 'Published widget kit not found' using errcode='P0002'; end if;
  select * into v_version from public.creator_widget_kit_versions v where v.kit_id=v_kit.id and v.version_no=v_kit.current_version;
  if v_version.id is null then raise exception 'Widget kit version not found' using errcode='P0002'; end if;

  select coalesce(max(w.y+w.height),0)+2 into v_base_y from public.profile_widgets w where w.character_id=v_character;
  select coalesce(cp.display_name,'Hanami Creator') into v_creator_name from public.creator_profiles cp where cp.account_id=v_kit.author_account_id;

  for v_entry in select value from jsonb_array_elements(v_version.widget_payload)
  loop
    insert into public.profile_widgets(character_id,widget_type,title,config,x,y,width,height,z_index,is_visible)
    values(
      v_character,
      coalesce(nullif(v_entry->>'widget_type',''),'note'),
      nullif(v_entry->>'title',''),
      coalesce(v_entry->'config','{}'::jsonb),
      greatest(1,least(12,coalesce((v_entry->>'x')::smallint,1))),
      greatest(1,least(200,v_base_y+coalesce((v_entry->>'relative_y')::integer,0))),
      greatest(1,least(12,coalesce((v_entry->>'width')::smallint,4))),
      greatest(1,least(20,coalesce((v_entry->>'height')::smallint,3))),
      coalesce((v_entry->>'z_index')::smallint,0),
      coalesce((v_entry->>'is_visible')::boolean,true)
    ) returning id into v_new_widget;

    insert into public.profile_widget_attribution(widget_id,kit_id,version_id,source_author_account_id,attribution_text)
    values(v_new_widget,v_kit.id,v_version.id,v_kit.author_account_id,'From "'||v_kit.title||'" by '||coalesce(v_creator_name,'Hanami Creator'));
    v_inserted:=v_inserted+1;
  end loop;

  update public.creator_widget_kits set install_count=install_count+1 where id=v_kit.id;
  return query select v_inserted,v_version.id;
end;
$$;

create or replace function public.toggle_creator_widget_kit_favorite(p_kit_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_exists boolean;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.creator_widget_kits k where k.id=p_kit_id and (k.author_account_id=v_account or (k.state='published' and k.visibility in ('public','unlisted')))) then raise exception 'Widget kit not found' using errcode='P0002'; end if;
  select exists(select 1 from public.creator_widget_kit_favorites f where f.account_id=v_account and f.kit_id=p_kit_id) into v_exists;
  if v_exists then
    delete from public.creator_widget_kit_favorites where account_id=v_account and kit_id=p_kit_id;
    update public.creator_widget_kits set favorite_count=greatest(0,favorite_count-1) where id=p_kit_id;
    return false;
  end if;
  insert into public.creator_widget_kit_favorites(account_id,kit_id) values(v_account,p_kit_id);
  update public.creator_widget_kits set favorite_count=favorite_count+1 where id=p_kit_id;
  return true;
end;
$$;

revoke all on function public.publish_creator_widget_kit(uuid,uuid[],text),public.install_creator_widget_kit(uuid),public.toggle_creator_widget_kit_favorite(uuid) from public,anon;
grant execute on function public.publish_creator_widget_kit(uuid,uuid[],text),public.install_creator_widget_kit(uuid),public.toggle_creator_widget_kit_favorite(uuid) to authenticated;

commit;
