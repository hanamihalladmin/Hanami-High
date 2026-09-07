create table public.academic_courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  subject text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(code)) between 2 and 24),
  check (length(trim(name)) between 2 and 120)
);

create table public.academic_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.academic_courses(id) on delete cascade,
  section_code text not null,
  school_year smallint not null default 2006 check (school_year = 2006),
  term text not null default 'full_year' check (term in ('full_year','spring','summer','fall')),
  room text,
  homeroom_code text,
  capacity smallint check (capacity is null or capacity between 1 and 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_year, term, section_code)
);

create table public.academic_section_staff (
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  staff_role text not null default 'teacher' check (staff_role in ('teacher','assistant','advisor')),
  assigned_at timestamptz not null default now(),
  primary key (section_id, character_id)
);

create table public.academic_enrollments (
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  status text not null default 'active' check (status in ('active','dropped','completed')),
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (section_id, student_character_id)
);

create table public.academic_meetings (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  period_no smallint not null check (period_no between 1 and 6),
  starts_at time not null,
  ends_at time not null,
  room text,
  meeting_kind text not null default 'class' check (meeting_kind in ('class','homeroom','study','extracurricular')),
  check (ends_at > starts_at),
  unique (section_id, weekday, period_no)
);

create table public.academic_assignments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  title text not null,
  description text,
  assignment_type text not null default 'assignment' check (assignment_type in ('assignment','quiz','test','project','participation')),
  state text not null default 'draft' check (state in ('draft','published','closed')),
  assigned_school_date date,
  due_school_date date,
  due_time time,
  points_possible numeric(8,2) not null default 100 check (points_possible > 0),
  late_policy text,
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (assigned_school_date is null or extract(year from assigned_school_date) = 2006),
  check (due_school_date is null or extract(year from due_school_date) = 2006),
  check (assigned_school_date is null or due_school_date is null or due_school_date >= assigned_school_date)
);

create table public.academic_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.academic_assignments(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','submitted','late','returned')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_character_id)
);

create table public.academic_grades (
  assignment_id uuid not null references public.academic_assignments(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  points_earned numeric(8,2) check (points_earned is null or points_earned >= 0),
  feedback text,
  graded_by_character_id uuid references public.characters(id) on delete set null,
  graded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, student_character_id)
);

create table public.academic_attendance (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  school_date date not null,
  status text not null check (status in ('present','absent','tardy','excused')),
  note text,
  recorded_by_character_id uuid references public.characters(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(year from school_date) = 2006),
  unique (section_id, student_character_id, school_date)
);

create index academic_sections_course_idx on public.academic_sections(course_id);
create index academic_section_staff_character_idx on public.academic_section_staff(character_id, section_id);
create index academic_enrollments_student_idx on public.academic_enrollments(student_character_id, status, section_id);
create index academic_meetings_section_weekday_idx on public.academic_meetings(section_id, weekday, period_no);
create index academic_assignments_section_due_idx on public.academic_assignments(section_id, state, due_school_date);
create index academic_assignments_creator_idx on public.academic_assignments(created_by_character_id);
create index academic_submissions_student_idx on public.academic_submissions(student_character_id, status, updated_at desc);
create index academic_submissions_assignment_idx on public.academic_submissions(assignment_id, student_character_id);
create index academic_grades_student_idx on public.academic_grades(student_character_id, assignment_id);
create index academic_grades_grader_idx on public.academic_grades(graded_by_character_id) where graded_by_character_id is not null;
create index academic_attendance_student_date_idx on public.academic_attendance(student_character_id, school_date desc);
create index academic_attendance_section_date_idx on public.academic_attendance(section_id, school_date desc);
create index academic_attendance_recorder_idx on public.academic_attendance(recorded_by_character_id) where recorded_by_character_id is not null;

create trigger academic_courses_touch_updated_at before update on public.academic_courses for each row execute function private.touch_updated_at();
create trigger academic_sections_touch_updated_at before update on public.academic_sections for each row execute function private.touch_updated_at();
create trigger academic_enrollments_touch_updated_at before update on public.academic_enrollments for each row execute function private.touch_updated_at();
create trigger academic_assignments_touch_updated_at before update on public.academic_assignments for each row execute function private.touch_updated_at();
create trigger academic_submissions_touch_updated_at before update on public.academic_submissions for each row execute function private.touch_updated_at();
create trigger academic_grades_touch_updated_at before update on public.academic_grades for each row execute function private.touch_updated_at();
create trigger academic_attendance_touch_updated_at before update on public.academic_attendance for each row execute function private.touch_updated_at();

create or replace function private.validate_academic_staff_character()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_role text; v_kind text; v_state text;
begin
  select c.school_role, c.character_kind, c.character_state into v_role, v_kind, v_state
  from public.characters c where c.id = new.character_id;
  if not found or v_state <> 'active' or not (v_kind = 'faculty' or v_role in ('faculty','administration')) then
    raise exception 'Academic staff must be an active faculty or administration character' using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function private.validate_academic_staff_character() from public, anon, authenticated;
create trigger academic_section_staff_validate before insert or update of character_id on public.academic_section_staff for each row execute function private.validate_academic_staff_character();

create or replace function private.validate_academic_enrollment_character()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_role text; v_kind text; v_state text;
begin
  select c.school_role, c.character_kind, c.character_state into v_role, v_kind, v_state
  from public.characters c where c.id = new.student_character_id;
  if not found or v_state <> 'active' or v_kind <> 'student' or v_role not in ('new_student','student') then
    raise exception 'Academic enrollment requires an active student character' using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function private.validate_academic_enrollment_character() from public, anon, authenticated;
create trigger academic_enrollments_validate before insert or update of student_character_id on public.academic_enrollments for each row execute function private.validate_academic_enrollment_character();

create or replace function private.validate_assignment_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.created_by_character_id <> old.created_by_character_id then
    raise exception 'Assignment creator cannot be changed' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.characters c
    where c.id = new.created_by_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then
    raise exception 'Assignment creator must be active faculty or administration' using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function private.validate_assignment_creator() from public, anon, authenticated;
create trigger academic_assignments_validate_creator before insert or update of created_by_character_id on public.academic_assignments for each row execute function private.validate_assignment_creator();

create or replace function public.academic_can_manage_section(p_section_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select public.has_capability('school.configure') or exists (
    select 1 from public.academic_section_staff s
    join public.accounts a on a.id=(select auth.uid())
    where s.section_id=p_section_id and s.character_id=a.active_character_id
  );
$$;
revoke all on function public.academic_can_manage_section(uuid) from public, anon;
grant execute on function public.academic_can_manage_section(uuid) to authenticated;

create or replace function public.academic_is_enrolled(p_section_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists (
    select 1 from public.academic_enrollments e
    join public.accounts a on a.id=(select auth.uid())
    where e.section_id=p_section_id and e.student_character_id=a.active_character_id and e.status='active'
  );
$$;
revoke all on function public.academic_is_enrolled(uuid) from public, anon;
grant execute on function public.academic_is_enrolled(uuid) to authenticated;

alter table public.academic_courses enable row level security;
alter table public.academic_sections enable row level security;
alter table public.academic_section_staff enable row level security;
alter table public.academic_enrollments enable row level security;
alter table public.academic_meetings enable row level security;
alter table public.academic_assignments enable row level security;
alter table public.academic_submissions enable row level security;
alter table public.academic_grades enable row level security;
alter table public.academic_attendance enable row level security;

revoke all on public.academic_courses, public.academic_sections, public.academic_section_staff, public.academic_enrollments, public.academic_meetings, public.academic_assignments, public.academic_submissions, public.academic_grades, public.academic_attendance from anon, authenticated;
grant select, insert, update, delete on public.academic_courses, public.academic_sections, public.academic_section_staff, public.academic_enrollments, public.academic_meetings to authenticated;
grant select, insert, update, delete on public.academic_assignments, public.academic_submissions, public.academic_grades, public.academic_attendance to authenticated;

create policy academic_courses_select_visible on public.academic_courses for select to authenticated using (
  public.has_capability('school.configure') or exists (
    select 1 from public.academic_sections s where s.course_id=academic_courses.id and (public.academic_can_manage_section(s.id) or public.academic_is_enrolled(s.id))
  )
);
create policy academic_courses_admin_insert on public.academic_courses for insert to authenticated with check (public.has_capability('school.configure'));
create policy academic_courses_admin_update on public.academic_courses for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy academic_courses_admin_delete on public.academic_courses for delete to authenticated using (public.has_capability('school.configure'));

create policy academic_sections_select_visible on public.academic_sections for select to authenticated using (public.academic_can_manage_section(id) or public.academic_is_enrolled(id));
create policy academic_sections_admin_insert on public.academic_sections for insert to authenticated with check (public.has_capability('school.configure'));
create policy academic_sections_admin_update on public.academic_sections for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy academic_sections_admin_delete on public.academic_sections for delete to authenticated using (public.has_capability('school.configure'));

create policy academic_section_staff_select_visible on public.academic_section_staff for select to authenticated using (public.academic_can_manage_section(section_id) or public.academic_is_enrolled(section_id));
create policy academic_section_staff_admin_insert on public.academic_section_staff for insert to authenticated with check (public.has_capability('school.configure'));
create policy academic_section_staff_admin_update on public.academic_section_staff for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy academic_section_staff_admin_delete on public.academic_section_staff for delete to authenticated using (public.has_capability('school.configure'));

create policy academic_enrollments_select_visible on public.academic_enrollments for select to authenticated using (
  public.academic_can_manage_section(section_id) or student_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
);
create policy academic_enrollments_admin_insert on public.academic_enrollments for insert to authenticated with check (public.has_capability('school.configure'));
create policy academic_enrollments_admin_update on public.academic_enrollments for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy academic_enrollments_admin_delete on public.academic_enrollments for delete to authenticated using (public.has_capability('school.configure'));

create policy academic_meetings_select_visible on public.academic_meetings for select to authenticated using (public.academic_can_manage_section(section_id) or public.academic_is_enrolled(section_id));
create policy academic_meetings_admin_insert on public.academic_meetings for insert to authenticated with check (public.has_capability('school.configure'));
create policy academic_meetings_admin_update on public.academic_meetings for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy academic_meetings_admin_delete on public.academic_meetings for delete to authenticated using (public.has_capability('school.configure'));

create policy academic_assignments_select_visible on public.academic_assignments for select to authenticated using (
  public.academic_can_manage_section(section_id) or (state in ('published','closed') and public.academic_is_enrolled(section_id))
);
create policy academic_assignments_staff_insert on public.academic_assignments for insert to authenticated with check (
  public.academic_can_manage_section(section_id) and created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
);
create policy academic_assignments_staff_update on public.academic_assignments for update to authenticated using (public.academic_can_manage_section(section_id)) with check (public.academic_can_manage_section(section_id));
create policy academic_assignments_staff_delete on public.academic_assignments for delete to authenticated using (public.academic_can_manage_section(section_id));

create policy academic_submissions_select_visible on public.academic_submissions for select to authenticated using (
  student_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or exists (
    select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
  )
);
create policy academic_submissions_student_insert on public.academic_submissions for insert to authenticated with check (
  student_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and exists (
    select 1 from public.academic_assignments a where a.id=assignment_id and a.state='published' and public.academic_is_enrolled(a.section_id)
  )
);
create policy academic_submissions_student_update on public.academic_submissions for update to authenticated using (
  student_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
) with check (
  student_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and exists (
    select 1 from public.academic_assignments a where a.id=assignment_id and a.state='published' and public.academic_is_enrolled(a.section_id)
  )
);
create policy academic_submissions_staff_update on public.academic_submissions for update to authenticated using (exists (
  select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
)) with check (exists (
  select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
));

create policy academic_grades_select_visible on public.academic_grades for select to authenticated using (
  student_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or exists (
    select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
  )
);
create policy academic_grades_staff_insert on public.academic_grades for insert to authenticated with check (exists (
  select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
));
create policy academic_grades_staff_update on public.academic_grades for update to authenticated using (exists (
  select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
)) with check (exists (
  select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
));
create policy academic_grades_staff_delete on public.academic_grades for delete to authenticated using (exists (
  select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id)
));

create policy academic_attendance_select_visible on public.academic_attendance for select to authenticated using (
  student_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.academic_can_manage_section(section_id)
);
create policy academic_attendance_staff_insert on public.academic_attendance for insert to authenticated with check (public.academic_can_manage_section(section_id));
create policy academic_attendance_staff_update on public.academic_attendance for update to authenticated using (public.academic_can_manage_section(section_id)) with check (public.academic_can_manage_section(section_id));
create policy academic_attendance_staff_delete on public.academic_attendance for delete to authenticated using (public.academic_can_manage_section(section_id));
