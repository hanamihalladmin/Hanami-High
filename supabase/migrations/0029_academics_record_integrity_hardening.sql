create or replace function private.lock_academic_assignment_section()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.section_id <> old.section_id then
    raise exception 'Assignment section cannot be changed after creation' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_academic_assignment_section() from public, anon, authenticated;
create trigger academic_assignments_lock_section before update of section_id on public.academic_assignments for each row execute function private.lock_academic_assignment_section();

create or replace function private.protect_academic_submission_body()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_active uuid;
begin
  select a.active_character_id into v_active from public.accounts a where a.id=(select auth.uid());
  if v_active is not null and v_active <> old.student_character_id and new.body is distinct from old.body then
    raise exception 'Faculty may not rewrite a student submission body' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_academic_submission_body() from public, anon, authenticated;
create trigger academic_submissions_protect_body before update of body on public.academic_submissions for each row execute function private.protect_academic_submission_body();

create or replace function private.validate_academic_grade()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_section_id uuid;
begin
  if tg_op='UPDATE' and (new.assignment_id <> old.assignment_id or new.student_character_id <> old.student_character_id) then
    raise exception 'Grade assignment and student identity cannot be changed' using errcode='23514';
  end if;
  select a.section_id into v_section_id from public.academic_assignments a where a.id=new.assignment_id;
  if v_section_id is null or not exists (
    select 1 from public.academic_enrollments e where e.section_id=v_section_id and e.student_character_id=new.student_character_id
  ) then
    raise exception 'Grade student must belong to the assignment section roster' using errcode='23514';
  end if;
  if new.graded_by_character_id is not null and not exists (
    select 1 from public.characters c where c.id=new.graded_by_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then
    raise exception 'Grade author must be active faculty or administration' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_academic_grade() from public, anon, authenticated;
create trigger academic_grades_validate before insert or update on public.academic_grades for each row execute function private.validate_academic_grade();

create or replace function private.validate_academic_attendance()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='UPDATE' and (new.section_id <> old.section_id or new.student_character_id <> old.student_character_id or new.school_date <> old.school_date) then
    raise exception 'Attendance section, student, and school date cannot be changed' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.academic_enrollments e where e.section_id=new.section_id and e.student_character_id=new.student_character_id
  ) then
    raise exception 'Attendance student must belong to the section roster' using errcode='23514';
  end if;
  if new.recorded_by_character_id is not null and not exists (
    select 1 from public.characters c where c.id=new.recorded_by_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then
    raise exception 'Attendance recorder must be active faculty or administration' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_academic_attendance() from public, anon, authenticated;
create trigger academic_attendance_validate before insert or update on public.academic_attendance for each row execute function private.validate_academic_attendance();

drop policy if exists academic_grades_staff_insert on public.academic_grades;
drop policy if exists academic_grades_staff_update on public.academic_grades;
create policy academic_grades_staff_insert on public.academic_grades for insert to authenticated with check (
  graded_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  and exists (select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id))
);
create policy academic_grades_staff_update on public.academic_grades for update to authenticated using (
  exists (select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id))
) with check (
  graded_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  and exists (select 1 from public.academic_assignments a where a.id=assignment_id and public.academic_can_manage_section(a.section_id))
);

drop policy if exists academic_attendance_staff_insert on public.academic_attendance;
drop policy if exists academic_attendance_staff_update on public.academic_attendance;
create policy academic_attendance_staff_insert on public.academic_attendance for insert to authenticated with check (
  recorded_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  and public.academic_can_manage_section(section_id)
);
create policy academic_attendance_staff_update on public.academic_attendance for update to authenticated using (
  public.academic_can_manage_section(section_id)
) with check (
  recorded_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  and public.academic_can_manage_section(section_id)
);
