alter table public.published_character_profiles
  add column display_name text,
  add column handle text,
  add column school_role text;

create table public.profile_theme_presets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  source_character_id uuid references public.characters(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 60),
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profile_theme_presets_account_idx
  on public.profile_theme_presets(account_id, updated_at desc);
create index profile_theme_presets_source_character_idx
  on public.profile_theme_presets(source_character_id)
  where source_character_id is not null;

alter table public.profile_theme_presets enable row level security;

create policy profile_theme_presets_owner_all
on public.profile_theme_presets
for all
to authenticated
using (account_id = (select auth.uid()))
with check (
  account_id = (select auth.uid())
  and (
    source_character_id is null
    or exists (
      select 1 from public.characters c
      where c.id = profile_theme_presets.source_character_id
        and c.account_id = (select auth.uid())
    )
  )
);

grant select, insert, update, delete on public.profile_theme_presets to authenticated;

create or replace function private.enforce_profile_theme_preset_limit()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if (
    select count(*) from public.profile_theme_presets p
    where p.account_id = new.account_id
  ) >= 20 then
    raise exception 'An account may save at most 20 profile themes.';
  end if;
  return new;
end;
$$;

create trigger profile_theme_presets_limit
  before insert on public.profile_theme_presets
  for each row
  execute function private.enforce_profile_theme_preset_limit();

create or replace function public.publish_character_profile(p_character_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.character_profiles%rowtype;
  v_character public.characters%rowtype;
  v_published_at timestamptz := now();
  v_display_name text;
begin
  select * into v_profile
  from public.character_profiles
  where character_id = p_character_id;

  if not found then
    raise exception 'Profile not found or not owned by current account.';
  end if;

  select * into v_character
  from public.characters
  where id = p_character_id
    and account_id = (select auth.uid());

  if not found then
    raise exception 'Character not found or not owned by current account.';
  end if;

  v_display_name := coalesce(
    nullif(trim(v_character.display_name), ''),
    nullif(trim(concat_ws(' ', v_character.first_name, v_character.last_name)), ''),
    'Hanami Student'
  );

  insert into public.published_character_profiles (
    character_id, avatar_path, banner_path, bio, custom_status, pronouns,
    profile_visibility, guestbook_visibility, theme, published_at,
    display_name, handle, school_role
  ) values (
    p_character_id, v_profile.avatar_path, v_profile.banner_path, v_profile.bio,
    v_profile.custom_status, v_profile.pronouns, v_profile.profile_visibility,
    v_profile.guestbook_visibility, v_profile.theme_draft, v_published_at,
    v_display_name, v_character.handle, v_character.school_role
  )
  on conflict (character_id) do update set
    avatar_path = excluded.avatar_path,
    banner_path = excluded.banner_path,
    bio = excluded.bio,
    custom_status = excluded.custom_status,
    pronouns = excluded.pronouns,
    profile_visibility = excluded.profile_visibility,
    guestbook_visibility = excluded.guestbook_visibility,
    theme = excluded.theme,
    published_at = excluded.published_at,
    display_name = excluded.display_name,
    handle = excluded.handle,
    school_role = excluded.school_role;

  delete from public.published_profile_widgets
  where character_id = p_character_id;

  insert into public.published_profile_widgets (
    id, character_id, widget_type, title, config, x, y, width, height, z_index, published_at
  )
  select
    w.id, w.character_id, w.widget_type, w.title, w.config,
    w.x, w.y, w.width, w.height, w.z_index, v_published_at
  from public.profile_widgets w
  where w.character_id = p_character_id
    and w.is_visible;

  update public.character_profiles
  set theme_published = theme_draft,
      published_at = v_published_at,
      updated_at = v_published_at
  where character_id = p_character_id;

  return v_published_at;
end;
$$;
