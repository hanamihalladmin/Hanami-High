create type public.character_role as enum ('student', 'faculty');
create type public.profile_visibility as enum ('public', 'friends_only', 'private');

create table public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New Hanami Member' check (char_length(display_name) between 1 and 60),
  discord_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.account_profiles(user_id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  role public.character_role not null,
  display_name text not null check (char_length(display_name) between 1 and 60),
  handle text not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  visibility public.profile_visibility not null default 'private',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, slot),
  unique (handle)
);

alter table public.account_profiles enable row level security;
alter table public.characters enable row level security;

create policy "members read own account profile"
on public.account_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "members update own account profile"
on public.account_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "members read own characters"
on public.characters for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "members create own characters"
on public.characters for insert to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy "members update own characters"
on public.characters for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy "members delete own characters"
on public.characters for delete to authenticated
using ((select auth.uid()) = owner_user_id);

grant select, update on table public.account_profiles to authenticated;
grant select, insert, update, delete on table public.characters to authenticated;

create or replace function public.create_account_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_profiles (user_id, display_name, discord_username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), 'New Hanami Member'),
    nullif(new.raw_user_meta_data ->> 'user_name', '')
  );
  return new;
end;
$$;

create trigger create_account_profile_after_signup
after insert on auth.users
for each row execute function public.create_account_profile();
