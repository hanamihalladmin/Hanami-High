create type public.section_relationship as enum ('student', 'instructor');

create table public.academic_courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2,6}-[0-9]{3}$'),
  title text not null check (char_length(title) between 2 and 100),
  department text not null check (char_length(department) between 2 and 80),
  description text not null default '',
  credits smallint not null default 1 check (credits between 1 and 6),
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academic_courses(id) on delete restrict,
  section_code text not null check (char_length(section_code) between 1 and 12),
  term text not null default '2026-2027',
  room text,
  capacity smallint not null default 24 check (capacity between 1 and 100),
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, section_code, term)
);

create table public.section_meetings (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  label text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (section_id, weekday, starts_at)
);

create table public.section_memberships (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  relationship public.section_relationship not null,
  joined_at timestamptz not null default now(),
  unique (section_id, character_id)
);

create index section_memberships_character_idx on public.section_memberships(character_id);
create index section_memberships_section_idx on public.section_memberships(section_id);
create index section_meetings_section_weekday_idx on public.section_meetings(section_id, weekday, starts_at);

alter table public.academic_courses enable row level security;
alter table public.class_sections enable row level security;
alter table public.section_meetings enable row level security;
alter table public.section_memberships enable row level security;

grant select on public.academic_courses to authenticated;
grant select on public.class_sections to authenticated;
grant select on public.section_meetings to authenticated;
grant select on public.section_memberships to authenticated;
revoke insert, update, delete on public.academic_courses from authenticated;
revoke insert, update, delete on public.class_sections from authenticated;
revoke insert, update, delete on public.section_meetings from authenticated;
revoke insert, update, delete on public.section_memberships from authenticated;

create policy "members read course catalog"
on public.academic_courses for select to authenticated
using (true);

create policy "members read class sections"
on public.class_sections for select to authenticated
using (true);

create policy "members read section meeting times"
on public.section_meetings for select to authenticated
using (true);

create policy "members read own section memberships"
on public.section_memberships for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = section_memberships.character_id
      and c.owner_user_id = (select auth.uid())
  )
);
