create or replace function public.student_classroom_seating_chart(target_character_id uuid)
returns table(
  section_id uuid,
  section_code text,
  course_code text,
  course_title text,
  room text,
  student_character_id uuid,
  display_name text,
  handle text,
  seat_label text,
  row_number integer,
  column_number integer,
  is_self boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (
    select 1
    from public.characters c
    where c.id = target_character_id
      and (c.owner_user_id = auth.uid() or private.hanami_faculty_or_staff())
  ) then
    raise exception 'Not authorized to view this seating chart';
  end if;

  return query
  with enrolled_sections as (
    select sm.section_id
    from public.section_memberships sm
    where sm.character_id = target_character_id
      and sm.relationship::text = 'student'
  )
  select
    cs.id,
    cs.section_code,
    ac.code,
    ac.title,
    cs.room,
    student.id,
    student.display_name,
    student.handle,
    seat.seat_label,
    seat.row_number,
    seat.column_number,
    (student.id = target_character_id)
  from enrolled_sections es
  join public.class_sections cs on cs.id = es.section_id
  join public.academic_courses ac on ac.id = cs.course_id
  join public.section_memberships members
    on members.section_id = cs.id
   and members.relationship::text = 'student'
  join public.characters student on student.id = members.character_id
  left join public.classroom_seating_assignments seat
    on seat.section_id = cs.id
   and seat.student_character_id = student.id
  order by ac.title, cs.section_code, seat.row_number nulls last, seat.column_number nulls last, student.display_name;
end;
$$;

grant execute on function public.student_classroom_seating_chart(uuid) to authenticated;
