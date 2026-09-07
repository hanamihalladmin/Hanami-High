-- Hanami High v2: identity, character slots, profiles, and capability foundation.
-- New project baseline. All public tables are RLS protected and use explicit grants.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

-- New public objects should be opt-in to the Data API.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_user_id text unique,
  account_state text not null default 'active'
    check (account_state in ('active', 'restricted', 'suspended', 'archived')),
  active_character_id uuid,
  first_enrollment_reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  slot_no smallint not null check (slot_no between 1 and 2),
  handle citext unique,
  first_name text,
  last_name text,
  display_name text,
  character_kind text not null default 'student'
    check (character_kind in ('student', 'faculty')),
  character_state text not null default 'draft'
    check (character_state in (
      'draft', 'submitted', 'changes_requested', 'denied', 'accepted',
      'active', 'inactive', 'graduated', 'archived', 'suspended'
    )),
  school_role text
    check (school_role is null or school_role in (
      'new_student', 'student', 'new_faculty', 'faculty', 'administration'
    )),
  orientation_completed_at timestamptz,
  promoted_to_student_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, slot_no)
);

alter table public.accounts
  add constraint accounts_active_character_fk
  foreign key (active_character_id) references public.characters(id) on delete set null;

create table public.character_profiles (
  character_id uuid primary key references public.characters(id) on delete cascade,
  avatar_path text,
  banner_path text,
  pronouns text,
  custom_status text,
  bio text,
  profile_visibility text not null default 'hanami'
    check (profile_visibility in ('hanami', 'friends', 'private')),
  guestbook_visibility text not null default 'hanami'
    check (guestbook_visibility in ('hanami', 'friends', 'disabled')),
  theme_draft jsonb not null default '{}'::jsonb,
  theme_published jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.capabilities (
  code citext primary key,
  description text not null
);

create table public.platform_role_capabilities (
  role_id uuid not null references public.platform_roles(id) on delete cascade,
  capability_code citext not null references public.capabilities(code) on delete cascade,
  primary key (role_id, capability_code)
);

create table public.account_platform_roles (
  account_id uuid not null references public.accounts(id) on delete cascade,
  role_id uuid not null references public.platform_roles(id) on delete cascade,
  granted_by uuid references public.accounts(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (account_id, role_id)
);

create table private.audit_events (
  id bigint generated always as identity primary key,
  actor_account_id uuid references public.accounts(id) on delete set null,
  actor_character_id uuid references public.characters(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index characters_account_id_idx on public.characters(account_id);
create index characters_school_role_idx on public.characters(school_role) where school_role is not null;
create index account_platform_roles_account_idx on public.account_platform_roles(account_id);
create index audit_events_actor_idx on private.audit_events(actor_account_id, created_at desc);
create index audit_events_target_idx on private.audit_events(target_type, target_id, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_touch_updated_at
before update on public.accounts
for each row execute function private.touch_updated_at();

create trigger characters_touch_updated_at
before update on public.characters
for each row execute function private.touch_updated_at();

create trigger character_profiles_touch_updated_at
before update on public.character_profiles
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create or replace function private.active_character_belongs_to_account(p_account_id uuid, p_character_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select p_character_id is null or exists (
    select 1
    from public.characters c
    where c.id = p_character_id
      and c.account_id = p_account_id
      and c.character_state <> 'archived'
  );
$$;

create or replace function private.account_has_capability(p_account_id uuid, p_capability citext)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_platform_roles apr
    join public.platform_role_capabilities prc on prc.role_id = apr.role_id
    where apr.account_id = p_account_id
      and prc.capability_code = p_capability
  );
$$;
revoke all on function private.account_has_capability(uuid, citext) from public, anon, authenticated;

-- Seed platform roles and capability vocabulary. Role assignment is deliberately not seeded
-- because the new Auth project has no owner user until the first Discord login.
insert into public.platform_roles (code, label, description) values
  ('moderator', 'Moderator', 'Community safety and moderation tools.'),
  ('platform_admin', 'Website Administrator', 'Platform configuration and operational tools.'),
  ('owner', 'Owner', 'Full Hanami High platform ownership and oversight.')
on conflict (code) do nothing;

insert into public.capabilities (code, description) values
  ('characters.review', 'Review character applications.'),
  ('students.promote', 'Promote New Student characters to Student.'),
  ('accounts.manage', 'Manage Hanami accounts.'),
  ('permissions.manage', 'Assign platform roles and capabilities.'),
  ('moderation.review_reports', 'Review community reports.'),
  ('moderation.take_action', 'Apply moderation actions.'),
  ('economy.manage', 'Manage Petal economy configuration and grants.'),
  ('boutique.manage', 'Manage Boutique catalog and availability.'),
  ('hanamiplus.manage', 'Grant and manage Hanami+ access.'),
  ('school.configure', 'Manage school configuration and calendar.'),
  ('portals.view_as', 'Preview role/user portals.'),
  ('audit.view', 'View protected audit history.')
on conflict (code) do nothing;

insert into public.platform_role_capabilities (role_id, capability_code)
select r.id, c.code
from public.platform_roles r
cross join public.capabilities c
where r.code = 'owner'
on conflict do nothing;

insert into public.platform_role_capabilities (role_id, capability_code)
select r.id, c.code
from public.platform_roles r
join public.capabilities c on c.code in (
  'characters.review', 'accounts.manage', 'economy.manage', 'boutique.manage',
  'hanamiplus.manage', 'school.configure', 'portals.view_as'
)
where r.code = 'platform_admin'
on conflict do nothing;

insert into public.platform_role_capabilities (role_id, capability_code)
select r.id, c.code
from public.platform_roles r
join public.capabilities c on c.code in ('moderation.review_reports', 'moderation.take_action')
where r.code = 'moderator'
on conflict do nothing;

-- RLS baseline.
alter table public.accounts enable row level security;
alter table public.characters enable row level security;
alter table public.character_profiles enable row level security;
alter table public.platform_roles enable row level security;
alter table public.capabilities enable row level security;
alter table public.platform_role_capabilities enable row level security;
alter table public.account_platform_roles enable row level security;

revoke all on table public.accounts from anon, authenticated;
revoke all on table public.characters from anon, authenticated;
revoke all on table public.character_profiles from anon, authenticated;
revoke all on table public.platform_roles from anon, authenticated;
revoke all on table public.capabilities from anon, authenticated;
revoke all on table public.platform_role_capabilities from anon, authenticated;
revoke all on table public.account_platform_roles from anon, authenticated;

grant select on table public.accounts to authenticated;
grant update (active_character_id) on table public.accounts to authenticated;
grant select, insert, delete on table public.characters to authenticated;
grant update (slot_no, handle, first_name, last_name, display_name, character_kind, character_state) on table public.characters to authenticated;
grant select, insert, update, delete on table public.character_profiles to authenticated;
grant select on table public.platform_roles to authenticated;
grant select on table public.capabilities to authenticated;
grant select on table public.platform_role_capabilities to authenticated;
grant select on table public.account_platform_roles to authenticated;

create policy accounts_select_own
on public.accounts for select
to authenticated
using ((select auth.uid()) = id);

create policy accounts_update_own
on public.accounts for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and private.active_character_belongs_to_account(id, active_character_id)
);

create policy characters_select_own
on public.characters for select
to authenticated
using ((select auth.uid()) = account_id);

create policy characters_insert_own
on public.characters for insert
to authenticated
with check (
  (select auth.uid()) = account_id
  and school_role is null
  and character_state = 'draft'
  and orientation_completed_at is null
  and promoted_to_student_at is null
);

create policy characters_update_own_draft
on public.characters for update
to authenticated
using (
  (select auth.uid()) = account_id
  and character_state in ('draft', 'changes_requested')
)
with check (
  (select auth.uid()) = account_id
  and school_role is null
  and character_state in ('draft', 'submitted', 'changes_requested')
);

create policy characters_delete_own_unapproved
on public.characters for delete
to authenticated
using (
  (select auth.uid()) = account_id
  and character_state in ('draft', 'changes_requested', 'denied', 'archived')
);

create policy profiles_select_own
on public.character_profiles for select
to authenticated
using (exists (
  select 1 from public.characters c
  where c.id = character_id and c.account_id = (select auth.uid())
));

create policy profiles_insert_own
on public.character_profiles for insert
to authenticated
with check (exists (
  select 1 from public.characters c
  where c.id = character_id and c.account_id = (select auth.uid())
));

create policy profiles_update_own
on public.character_profiles for update
to authenticated
using (exists (
  select 1 from public.characters c
  where c.id = character_id and c.account_id = (select auth.uid())
))
with check (exists (
  select 1 from public.characters c
  where c.id = character_id and c.account_id = (select auth.uid())
));

create policy profiles_delete_own
on public.character_profiles for delete
to authenticated
using (exists (
  select 1 from public.characters c
  where c.id = character_id and c.account_id = (select auth.uid())
));

create policy platform_roles_read_authenticated
on public.platform_roles for select
to authenticated
using (true);

create policy capabilities_read_authenticated
on public.capabilities for select
to authenticated
using (true);

create policy role_capabilities_read_authenticated
on public.platform_role_capabilities for select
to authenticated
using (true);

create policy account_roles_select_own
on public.account_platform_roles for select
to authenticated
using (account_id = (select auth.uid()));

-- Service-side operations use explicit privileges; service_role bypasses RLS but is never exposed in the client.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant select, insert on private.audit_events to service_role;

comment on table public.accounts is 'One authenticated Hanami account per Supabase Auth user.';
comment on column public.characters.slot_no is 'Hard character limit: only slots 1 and 2 are valid; unique per account.';
comment on column public.characters.school_role is 'New Student -> Student promotion is owner-controlled and never tied to orientation completion.';
