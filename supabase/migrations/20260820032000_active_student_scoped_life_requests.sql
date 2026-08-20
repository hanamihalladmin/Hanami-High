create or replace function public.student_hall_pass_feed(viewer_character_id uuid)
returns table(
  id uuid,
  student_character_id uuid,
  pass_type text,
  destination text,
  reason text,
  status text,
  valid_from timestamptz,
  valid_until timestamptz,
  staff_note text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select hp.id,hp.student_character_id,hp.pass_type,hp.destination,hp.reason,hp.status,hp.valid_from,hp.valid_until,hp.staff_note
  from public.hall_passes hp
  where hp.student_character_id=viewer_character_id
    and exists (
      select 1 from public.characters c
      where c.id=viewer_character_id
        and c.owner_user_id=auth.uid()
        and c.role='student'::public.character_role
    )
  order by hp.created_at desc
  limit 30;
$$;

create or replace function public.student_attendance_excuse_feed(viewer_character_id uuid)
returns table(
  id uuid,
  student_character_id uuid,
  absence_date date,
  excuse_type text,
  explanation text,
  status text,
  staff_response text,
  reviewed_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select ae.id,ae.student_character_id,ae.absence_date,ae.excuse_type,ae.explanation,ae.status,ae.staff_response,ae.reviewed_at
  from public.attendance_excuses ae
  where ae.student_character_id=viewer_character_id
    and exists (
      select 1 from public.characters c
      where c.id=viewer_character_id
        and c.owner_user_id=auth.uid()
        and c.role='student'::public.character_role
    )
  order by ae.created_at desc
  limit 30;
$$;

revoke all on function public.student_hall_pass_feed(uuid) from public, anon;
revoke all on function public.student_attendance_excuse_feed(uuid) from public, anon;
grant execute on function public.student_hall_pass_feed(uuid) to authenticated;
grant execute on function public.student_attendance_excuse_feed(uuid) to authenticated;
