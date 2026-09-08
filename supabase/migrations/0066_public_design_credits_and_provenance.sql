begin;

create table public.character_profile_theme_source (
  character_id uuid primary key references public.characters(id) on delete cascade,
  source_listing_id uuid not null references public.creator_theme_listings(id) on delete restrict,
  source_version_id uuid not null references public.creator_theme_versions(id) on delete restrict,
  source_author_account_id uuid not null references public.accounts(id) on delete restrict,
  attribution_text text not null,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_theme_remix_sessions
  add column backup_source_listing_id uuid references public.creator_theme_listings(id) on delete set null,
  add column backup_source_version_id uuid references public.creator_theme_versions(id) on delete set null,
  add column backup_source_author_account_id uuid references public.accounts(id) on delete set null,
  add column backup_source_attribution_text text;

create trigger character_profile_theme_source_touch_updated_at
before update on public.character_profile_theme_source
for each row execute function private.touch_updated_at();

alter table public.character_profile_theme_source enable row level security;
create policy character_profile_theme_source_owner_read on public.character_profile_theme_source
for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))
);
revoke all on public.character_profile_theme_source from anon;
grant select on public.character_profile_theme_source to authenticated;

create or replace function private.capture_remix_source_backup()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_source public.character_profile_theme_source%rowtype;
begin
  if new.session_state='active' and (
    tg_op='INSERT'
    or old.source_listing_id is distinct from new.source_listing_id
    or old.source_version_id is distinct from new.source_version_id
    or old.started_at is distinct from new.started_at
    or old.session_state is distinct from 'active'
  ) then
    select * into v_source from public.character_profile_theme_source s where s.character_id=new.character_id;
    new.backup_source_listing_id:=v_source.source_listing_id;
    new.backup_source_version_id:=v_source.source_version_id;
    new.backup_source_author_account_id:=v_source.source_author_account_id;
    new.backup_source_attribution_text:=v_source.attribution_text;
  end if;
  return new;
end;
$$;

create or replace function private.sync_remix_profile_source()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_creator_name text;
begin
  if new.session_state='active' and (
    tg_op='INSERT'
    or old.source_listing_id is distinct from new.source_listing_id
    or old.source_version_id is distinct from new.source_version_id
    or old.started_at is distinct from new.started_at
    or old.session_state is distinct from 'active'
  ) then
    select coalesce(cp.display_name,'Hanami Creator') into v_creator_name
    from public.creator_profiles cp where cp.account_id=new.source_author_account_id;

    insert into public.character_profile_theme_source(
      character_id,source_listing_id,source_version_id,source_author_account_id,attribution_text,applied_at
    ) values(
      new.character_id,new.source_listing_id,new.source_version_id,new.source_author_account_id,
      'Theme based on "'||new.source_title||'" by '||coalesce(v_creator_name,'Hanami Creator'),now()
    )
    on conflict(character_id) do update set
      source_listing_id=excluded.source_listing_id,
      source_version_id=excluded.source_version_id,
      source_author_account_id=excluded.source_author_account_id,
      attribution_text=excluded.attribution_text,
      applied_at=excluded.applied_at,
      updated_at=now();
  elsif new.session_state='restored' and old.session_state is distinct from 'restored' then
    if new.backup_source_listing_id is null or new.backup_source_version_id is null or new.backup_source_author_account_id is null then
      delete from public.character_profile_theme_source where character_id=new.character_id;
    else
      insert into public.character_profile_theme_source(
        character_id,source_listing_id,source_version_id,source_author_account_id,attribution_text,applied_at
      ) values(
        new.character_id,new.backup_source_listing_id,new.backup_source_version_id,new.backup_source_author_account_id,
        coalesce(new.backup_source_attribution_text,'Community theme source'),now()
      )
      on conflict(character_id) do update set
        source_listing_id=excluded.source_listing_id,
        source_version_id=excluded.source_version_id,
        source_author_account_id=excluded.source_author_account_id,
        attribution_text=excluded.attribution_text,
        applied_at=excluded.applied_at,
        updated_at=now();
    end if;
  end if;
  return new;
end;
$$;

create trigger creator_theme_remix_capture_source_backup
before insert or update on public.creator_theme_remix_sessions
for each row execute function private.capture_remix_source_backup();

create trigger creator_theme_remix_sync_profile_source
after insert or update on public.creator_theme_remix_sessions
for each row execute function private.sync_remix_profile_source();

-- Backfill current active/converted remix provenance created before this migration.
insert into public.character_profile_theme_source(
  character_id,source_listing_id,source_version_id,source_author_account_id,attribution_text,applied_at
)
select
  s.character_id,s.source_listing_id,s.source_version_id,s.source_author_account_id,
  'Theme based on "'||s.source_title||'" by '||coalesce(cp.display_name,'Hanami Creator'),s.started_at
from public.creator_theme_remix_sessions s
left join public.creator_profiles cp on cp.account_id=s.source_author_account_id
where s.session_state in ('active','converted')
on conflict(character_id) do nothing;

create or replace function public.profile_design_credits(p_character_id uuid)
returns table(
  credit_type text,
  source_id uuid,
  source_title text,
  source_creator text,
  version_label text,
  attribution_text text,
  item_count integer,
  applied_at timestamptz
)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_view_character_interactive_profile(p_character_id) then raise exception 'Profile unavailable' using errcode='42501'; end if;

  return query
  select
    'theme'::text,
    s.source_listing_id,
    l.title,
    coalesce(cp.display_name,'Hanami Creator'),
    'v'||v.version_no::text,
    s.attribution_text,
    1,
    s.applied_at
  from public.character_profile_theme_source s
  join public.creator_theme_listings l on l.id=s.source_listing_id
  join public.creator_theme_versions v on v.id=s.source_version_id
  left join public.creator_profiles cp on cp.account_id=s.source_author_account_id
  where s.character_id=p_character_id;

  return query
  select
    'component'::text,
    a.kit_id,
    k.title,
    coalesce(cp.display_name,'Hanami Creator'),
    'v'||kv.version_no::text,
    min(a.attribution_text),
    count(*)::integer,
    min(a.installed_at)
  from public.profile_widget_attribution a
  join public.profile_widgets w on w.id=a.widget_id
  join public.creator_widget_kits k on k.id=a.kit_id
  join public.creator_widget_kit_versions kv on kv.id=a.version_id
  left join public.creator_profiles cp on cp.account_id=a.source_author_account_id
  where w.character_id=p_character_id
  group by a.install_group_id,a.kit_id,k.title,cp.display_name,kv.version_no
  order by min(a.installed_at);
end;
$$;

revoke all on function public.profile_design_credits(uuid) from public,anon;
grant execute on function public.profile_design_credits(uuid) to authenticated;

commit;
