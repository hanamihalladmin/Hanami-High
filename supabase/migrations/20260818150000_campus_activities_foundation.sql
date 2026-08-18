create type public.activity_kind as enum ('club', 'student_government', 'event', 'committee');
create type public.activity_membership_status as enum ('member', 'officer', 'advisor');

create table public.campus_activities (
  id uuid primary key default gen_random_uuid(),
  kind public.activity_kind not null,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '',
  meeting_location text,
  meeting_schedule text,
  is_active boolean not null default true,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campus_activity_events (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.campus_activities(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  is_public boolean not null default true,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.campus_activity_memberships (
  activity_id uuid not null references public.campus_activities(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  status public.activity_membership_status not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (activity_id, character_id)
);

create index campus_activity_events_start_idx on public.campus_activity_events(starts_at);
create index campus_activity_memberships_character_idx on public.campus_activity_memberships(character_id);

alter table public.campus_activities enable row level security;
alter table public.campus_activity_events enable row level security;
alter table public.campus_activity_memberships enable row level security;

grant select on public.campus_activities to authenticated;
grant select on public.campus_activity_events to authenticated;
grant select on public.campus_activity_memberships to authenticated;
revoke insert, update, delete on public.campus_activities from authenticated;
revoke insert, update, delete on public.campus_activity_events from authenticated;
revoke insert, update, delete on public.campus_activity_memberships from authenticated;

create policy "members read active campus activities"
on public.campus_activities for select to authenticated
using (is_active = true);

create policy "members read public campus events"
on public.campus_activity_events for select to authenticated
using (is_public = true);

create policy "members read own campus memberships"
on public.campus_activity_memberships for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = campus_activity_memberships.character_id
      and c.owner_user_id = (select auth.uid())
  )
);
