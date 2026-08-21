begin;

create or replace function private.current_user_instructs_section(target_section_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
 select exists(
  select 1 from public.section_memberships sm
  join public.characters c on c.id=sm.character_id
  where sm.section_id=target_section_id and sm.relationship='instructor' and c.owner_user_id=auth.uid()
 );
$$;

create or replace function private.current_user_instructs_character(target_character_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
 select exists(
  select 1 from public.section_memberships student_sm
  join public.section_memberships instructor_sm on instructor_sm.section_id=student_sm.section_id and instructor_sm.relationship='instructor'
  join public.characters instructor_character on instructor_character.id=instructor_sm.character_id
  where student_sm.character_id=target_character_id and instructor_character.owner_user_id=auth.uid()
 );
$$;

drop policy if exists "instructors read rosters for own sections" on public.section_memberships;
create policy "instructors read rosters for own sections" on public.section_memberships
for select to authenticated using (private.current_user_instructs_section(section_id));

drop policy if exists "instructors read roster characters" on public.characters;
create policy "instructors read roster characters" on public.characters
for select to authenticated using (private.current_user_instructs_character(id));

create or replace function private.normalize_course_assignment_defaults()
returns trigger language plpgsql as $$
begin
 new.assignment_group:=coalesce(nullif(btrim(new.assignment_group),''),'coursework');
 new.late_policy:=coalesce(nullif(btrim(new.late_policy),''),'teacher_discretion');
 new.assessment_type:=coalesce(nullif(btrim(new.assessment_type),''),'assignment');
 return new;
end;$$;

drop trigger if exists normalize_course_assignment_defaults on public.course_assignments;
create trigger normalize_course_assignment_defaults before insert or update on public.course_assignments
for each row execute function private.normalize_course_assignment_defaults();

drop policy if exists "staff manage competition points" on public.class_competition_points;
create policy "admin owner manage competition points" on public.class_competition_points
for all to authenticated using (private.hanami_admin_or_owner()) with check (private.hanami_admin_or_owner());

commit;