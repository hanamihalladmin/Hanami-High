create table public.profile_widgets (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  widget_type text not null check (length(trim(widget_type)) > 0),
  title text,
  config jsonb not null default '{}'::jsonb,
  x smallint not null default 1 check (x between 1 and 12),
  y integer not null default 1 check (y between 1 and 200),
  width smallint not null default 4 check (width between 1 and 12),
  height smallint not null default 3 check (height between 1 and 20),
  z_index smallint not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profile_widgets_character_layout_idx
  on public.profile_widgets(character_id, y, x, z_index);

alter table public.profile_widgets enable row level security;

create policy profile_widgets_owner_all
on public.profile_widgets
for all
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = profile_widgets.character_id
      and c.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = profile_widgets.character_id
      and c.account_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.profile_widgets to authenticated;

create or replace function private.enforce_profile_widget_limit()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  if (
    select count(*) from public.profile_widgets w
    where w.character_id = new.character_id
  ) >= 40 then
    raise exception 'A character profile may have at most 40 widgets.';
  end if;
  return new;
end;
$$;

create trigger profile_widgets_limit
  before insert on public.profile_widgets
  for each row
  execute function private.enforce_profile_widget_limit();

create table public.published_character_profiles (
  character_id uuid primary key references public.characters(id) on delete cascade,
  avatar_path text,
  banner_path text,
  bio text,
  custom_status text,
  pronouns text,
  profile_visibility text not null check (profile_visibility in ('hanami', 'friends', 'private')),
  guestbook_visibility text not null check (guestbook_visibility in ('hanami', 'friends', 'disabled')),
  theme jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now()
);

alter table public.published_character_profiles enable row level security;

create policy published_profiles_select_visible
on public.published_character_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = published_character_profiles.character_id
      and (
        c.account_id = (select auth.uid())
        or (
          published_character_profiles.profile_visibility = 'hanami'
          and c.character_state = 'active'
        )
      )
  )
);

create policy published_profiles_insert_own
on public.published_character_profiles
for insert
to authenticated
with check (
  exists (
    select 1 from public.characters c
    where c.id = published_character_profiles.character_id
      and c.account_id = (select auth.uid())
  )
);

create policy published_profiles_update_own
on public.published_character_profiles
for update
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = published_character_profiles.character_id
      and c.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = published_character_profiles.character_id
      and c.account_id = (select auth.uid())
  )
);

create policy published_profiles_delete_own
on public.published_character_profiles
for delete
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = published_character_profiles.character_id
      and c.account_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.published_character_profiles to authenticated;

create table public.published_profile_widgets (
  id uuid primary key,
  character_id uuid not null references public.published_character_profiles(character_id) on delete cascade,
  widget_type text not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  x smallint not null,
  y integer not null,
  width smallint not null,
  height smallint not null,
  z_index smallint not null default 0,
  published_at timestamptz not null default now()
);

create index published_profile_widgets_character_layout_idx
  on public.published_profile_widgets(character_id, y, x, z_index);

alter table public.published_profile_widgets enable row level security;

create policy published_widgets_select_visible
on public.published_profile_widgets
for select
to authenticated
using (
  exists (
    select 1
    from public.published_character_profiles p
    join public.characters c on c.id = p.character_id
    where p.character_id = published_profile_widgets.character_id
      and (
        c.account_id = (select auth.uid())
        or (p.profile_visibility = 'hanami' and c.character_state = 'active')
      )
  )
);

create policy published_widgets_insert_own
on public.published_profile_widgets
for insert
to authenticated
with check (
  exists (
    select 1 from public.characters c
    where c.id = published_profile_widgets.character_id
      and c.account_id = (select auth.uid())
  )
);

create policy published_widgets_update_own
on public.published_profile_widgets
for update
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = published_profile_widgets.character_id
      and c.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = published_profile_widgets.character_id
      and c.account_id = (select auth.uid())
  )
);

create policy published_widgets_delete_own
on public.published_profile_widgets
for delete
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = published_profile_widgets.character_id
      and c.account_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.published_profile_widgets to authenticated;

create or replace function public.publish_character_profile(p_character_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_profile public.character_profiles%rowtype;
  v_published_at timestamptz := now();
begin
  select * into v_profile
  from public.character_profiles
  where character_id = p_character_id;

  if not found then
    raise exception 'Profile not found or not owned by current account.';
  end if;

  insert into public.published_character_profiles (
    character_id, avatar_path, banner_path, bio, custom_status, pronouns,
    profile_visibility, guestbook_visibility, theme, published_at
  ) values (
    p_character_id, v_profile.avatar_path, v_profile.banner_path, v_profile.bio,
    v_profile.custom_status, v_profile.pronouns, v_profile.profile_visibility,
    v_profile.guestbook_visibility, v_profile.theme_draft, v_published_at
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
    published_at = excluded.published_at;

  delete from public.published_profile_widgets where character_id = p_character_id;

  insert into public.published_profile_widgets (
    id, character_id, widget_type, title, config, x, y, width, height, z_index, published_at
  )
  select
    w.id, w.character_id, w.widget_type, w.title, w.config,
    w.x, w.y, w.width, w.height, w.z_index, v_published_at
  from public.profile_widgets w
  where w.character_id = p_character_id and w.is_visible;

  update public.character_profiles
  set theme_published = theme_draft,
      published_at = v_published_at,
      updated_at = v_published_at
  where character_id = p_character_id;

  return v_published_at;
end;
$$;

grant execute on function public.publish_character_profile(uuid) to authenticated;
