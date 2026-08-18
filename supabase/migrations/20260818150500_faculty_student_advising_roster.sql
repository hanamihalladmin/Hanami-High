create or replace function private.faculty_student_roster_internal(faculty_character_id uuid)
returns table (
  student_character_id uuid,
  display_name text,
  handle text,
  section_id uuid,
  section_code text,
  course_code text,
  course_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    student.id,
    student.display_name,
    student.handle,
    cs.id,
    cs.section_code,
    ac.code,
    ac.title
  from public.characters faculty
  join public.section_memberships instructor
    on instructor.character_id = faculty.id
   and instructor.relationship = 'instructor'
  join public.class_sections cs on cs.id = instructor.section_id
  join public.academic_courses ac on ac.id = cs.course_id
  join public.section_memberships enrolled
    on enrolled.section_id = cs.id
   and enrolled.relationship = 'student'
  join public.characters student on student.id = enrolled.character_id
  where faculty.id = faculty_character_id
    and faculty.owner_user_id = auth.uid()
    and faculty.role = 'faculty'
    and student.role = 'student'
  order by ac.code, cs.section_code, student.display_name;
$$;

revoke all on function private.faculty_student_roster_internal(uuid) from public, anon;
grant execute on function private.faculty_student_roster_internal(uuid) to authenticated;

create or replace function public.faculty_student_roster(faculty_character_id uuid)
returns table (
  student_character_id uuid,
  display_name text,
  handle text,
  section_id uuid,
  section_code text,
  course_code text,
  course_title text
)
language sql
stable
security invoker
set search_path = public, private
as $$
  select * from private.faculty_student_roster_internal(faculty_character_id);
$$;

revoke all on function public.faculty_student_roster(uuid) from public, anon;
grant execute on function public.faculty_student_roster(uuid) to authenticated;
