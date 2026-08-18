create type public.assignment_status as enum ('draft', 'published', 'closed');
create type public.submission_status as enum ('draft', 'submitted', 'returned');

create table public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  due_at timestamptz,
  points numeric(7,2) not null default 100 check (points >= 0 and points <= 10000),
  status public.assignment_status not null default 'draft',
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  body text not null default '',
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  grade numeric(7,2),
  feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_character_id),
  check (grade is null or (grade >= 0 and grade <= 10000))
);

create index course_assignments_section_due_idx on public.course_assignments(section_id, due_at);
create index assignment_submissions_student_idx on public.assignment_submissions(student_character_id);
create index assignment_submissions_assignment_idx on public.assignment_submissions(assignment_id);

alter table public.course_assignments enable row level security;
alter table public.assignment_submissions enable row level security;

grant select, insert, update, delete on public.course_assignments to authenticated;
grant select, insert, update on public.assignment_submissions to authenticated;
revoke delete on public.assignment_submissions from authenticated;

create policy "students read published assignments for own classes"
on public.course_assignments for select to authenticated
using (
  status in ('published', 'closed')
  and exists (
    select 1 from public.section_memberships sm
    join public.characters c on c.id = sm.character_id
    where sm.section_id = course_assignments.section_id
      and sm.relationship = 'student'
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "instructors read assignments for own sections"
on public.course_assignments for select to authenticated
using (
  exists (
    select 1 from public.section_memberships sm
    join public.characters c on c.id = sm.character_id
    where sm.section_id = course_assignments.section_id
      and sm.relationship = 'instructor'
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "instructors create assignments for own sections"
on public.course_assignments for insert to authenticated
with check (
  exists (
    select 1 from public.characters creator
    join public.section_memberships sm on sm.character_id = creator.id
    where creator.id = course_assignments.created_by_character_id
      and creator.owner_user_id = (select auth.uid())
      and creator.role = 'faculty'
      and sm.section_id = course_assignments.section_id
      and sm.relationship = 'instructor'
  )
);

create policy "instructors update assignments for own sections"
on public.course_assignments for update to authenticated
using (
  exists (
    select 1 from public.characters creator
    join public.section_memberships sm on sm.character_id = creator.id
    where creator.id = course_assignments.created_by_character_id
      and creator.owner_user_id = (select auth.uid())
      and sm.section_id = course_assignments.section_id
      and sm.relationship = 'instructor'
  )
)
with check (
  exists (
    select 1 from public.characters creator
    join public.section_memberships sm on sm.character_id = creator.id
    where creator.id = course_assignments.created_by_character_id
      and creator.owner_user_id = (select auth.uid())
      and sm.section_id = course_assignments.section_id
      and sm.relationship = 'instructor'
  )
);

create policy "instructors delete assignments for own sections"
on public.course_assignments for delete to authenticated
using (
  exists (
    select 1 from public.characters creator
    join public.section_memberships sm on sm.character_id = creator.id
    where creator.id = course_assignments.created_by_character_id
      and creator.owner_user_id = (select auth.uid())
      and sm.section_id = course_assignments.section_id
      and sm.relationship = 'instructor'
  )
);

create policy "students read own submissions"
on public.assignment_submissions for select to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
);

create policy "instructors read submissions for own sections"
on public.assignment_submissions for select to authenticated
using (
  exists (
    select 1 from public.course_assignments a
    join public.section_memberships sm on sm.section_id = a.section_id
    join public.characters c on c.id = sm.character_id
    where a.id = assignment_submissions.assignment_id
      and sm.relationship = 'instructor'
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "students create own submissions"
on public.assignment_submissions for insert to authenticated
with check (
  exists (
    select 1 from public.characters c
    join public.course_assignments a on a.id = assignment_submissions.assignment_id
    join public.section_memberships sm on sm.section_id = a.section_id and sm.character_id = c.id
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
      and sm.relationship = 'student'
      and a.status = 'published'
  )
);

create policy "students update own unreturned submissions"
on public.assignment_submissions for update to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
  and status <> 'returned'
)
with check (
  exists (
    select 1 from public.characters c
    where c.id = assignment_submissions.student_character_id
      and c.owner_user_id = (select auth.uid())
      and c.role = 'student'
  )
);

create policy "instructors update submissions for own sections"
on public.assignment_submissions for update to authenticated
using (
  exists (
    select 1 from public.course_assignments a
    join public.section_memberships sm on sm.section_id = a.section_id
    join public.characters c on c.id = sm.character_id
    where a.id = assignment_submissions.assignment_id
      and sm.relationship = 'instructor'
      and c.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.course_assignments a
    join public.section_memberships sm on sm.section_id = a.section_id
    join public.characters c on c.id = sm.character_id
    where a.id = assignment_submissions.assignment_id
      and sm.relationship = 'instructor'
      and c.owner_user_id = (select auth.uid())
  )
);
