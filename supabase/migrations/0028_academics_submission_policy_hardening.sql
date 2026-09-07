drop policy if exists academic_submissions_student_update on public.academic_submissions;
drop policy if exists academic_submissions_staff_update on public.academic_submissions;

create policy academic_submissions_update_visible
on public.academic_submissions
for update
to authenticated
using (
  student_character_id = (select active_character_id from public.accounts where id = (select auth.uid()))
  or exists (
    select 1
    from public.academic_assignments a
    where a.id = assignment_id
      and public.academic_can_manage_section(a.section_id)
  )
)
with check (
  (
    student_character_id = (select active_character_id from public.accounts where id = (select auth.uid()))
    and exists (
      select 1
      from public.academic_assignments a
      where a.id = assignment_id
        and a.state = 'published'
        and public.academic_is_enrolled(a.section_id)
    )
  )
  or exists (
    select 1
    from public.academic_assignments a
    where a.id = assignment_id
      and public.academic_can_manage_section(a.section_id)
  )
);

create or replace function private.lock_academic_submission_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.assignment_id <> old.assignment_id or new.student_character_id <> old.student_character_id then
    raise exception 'Submission assignment and student identity cannot be changed'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_academic_submission_identity() from public, anon, authenticated;

create trigger academic_submissions_lock_identity
before update of assignment_id, student_character_id on public.academic_submissions
for each row execute function private.lock_academic_submission_identity();
