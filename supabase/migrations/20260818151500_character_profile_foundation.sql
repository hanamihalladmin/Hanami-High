create table public.character_profiles (
  character_id uuid primary key references public.characters(id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 120),
  bio text not null default '' check (char_length(bio) <= 2000),
  status_message text not null default '' check (char_length(status_message) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.character_profiles enable row level security;
grant select, insert, update on public.character_profiles to authenticated;
revoke delete on public.character_profiles from authenticated;

create policy "members read own character profiles"
on public.character_profiles for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_profiles.character_id
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "members create own character profiles"
on public.character_profiles for insert to authenticated
with check (
  exists (
    select 1 from public.characters c
    where c.id = character_profiles.character_id
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "members update own character profiles"
on public.character_profiles for update to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = character_profiles.character_id
      and c.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = character_profiles.character_id
      and c.owner_user_id = (select auth.uid())
  )
);
