begin;

insert into public.academic_courses(code,title,department,description,credits)
values ('TEST-101','Faculty Portal Test Class','Testing','Owner-only preview class for exercising Faculty Portal teaching tools.',1)
on conflict (code) do update set title=excluded.title,department=excluded.department,description=excluded.description,credits=excluded.credits,updated_at=now();

insert into public.class_sections(course_id,section_code,term,room,capacity)
select c.id,'TST-A','2006-2007','TEST ROOM',12 from public.academic_courses c where c.code='TEST-101'
on conflict (course_id,section_code,term) do update set room=excluded.room,capacity=excluded.capacity,updated_at=now();

insert into public.section_meetings(section_id,weekday,starts_at,ends_at,label)
select s.id,v.weekday,v.starts_at,v.ends_at,'TEST Faculty Portal'
from public.class_sections s join public.academic_courses c on c.id=s.course_id and c.code='TEST-101'
cross join (values (2::smallint,'09:15'::time,'10:00'::time),(4::smallint,'09:15'::time,'10:00'::time)) as v(weekday,starts_at,ends_at)
where s.section_code='TST-A' and s.term='2006-2007'
on conflict (section_id,weekday,starts_at) do update set ends_at=excluded.ends_at,label=excluded.label;

create or replace function private.attach_test_faculty_section_internal(target_character_id uuid)
returns void language plpgsql security definer set search_path=public,private as $$
declare target_section uuid;
begin
  if not private.is_owner_discord_user() then raise exception 'Only the Hanami Owner account can use the TEST Faculty fixture'; end if;
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='faculty' and c.handle like 'testfaculty_%') then raise exception 'Only your Owner TEST Faculty character can use this fixture'; end if;
  select s.id into target_section from public.class_sections s join public.academic_courses c on c.id=s.course_id where c.code='TEST-101' and s.section_code='TST-A' and s.term='2006-2007' limit 1;
  if target_section is null then raise exception 'TEST-101 preview section is unavailable'; end if;
  insert into public.section_memberships(section_id,character_id,relationship) values(target_section,target_character_id,'instructor') on conflict (section_id,character_id) do update set relationship='instructor';
end;$$;
revoke all on function private.attach_test_faculty_section_internal(uuid) from public,anon;
grant execute on function private.attach_test_faculty_section_internal(uuid) to authenticated;
create or replace function public.attach_test_faculty_section(target_character_id uuid) returns void language sql security invoker set search_path=public,private as $$ select private.attach_test_faculty_section_internal(target_character_id); $$;
revoke all on function public.attach_test_faculty_section(uuid) from public,anon;
grant execute on function public.attach_test_faculty_section(uuid) to authenticated;

commit;
