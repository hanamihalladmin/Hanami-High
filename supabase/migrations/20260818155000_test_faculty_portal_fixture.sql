insert into public.academic_courses(code,title,department,description,credits,is_test_data)
values ('TEST-101','Faculty Portal Test Class','Testing','Deployment-only class for exercising Faculty Portal tools.',1,true)
on conflict (code) do update set title=excluded.title,department=excluded.department,description=excluded.description,is_test_data=true;

insert into public.class_sections(course_id,section_code,term,room,capacity,is_test_data)
select id,'TST-A','2006-2007','TEST ROOM',12,true from public.academic_courses where code='TEST-101'
on conflict (course_id,section_code,term) do update set room=excluded.room,is_test_data=true;

insert into public.section_meetings(section_id,weekday,starts_at,ends_at,label)
select s.id,v.weekday,v.starts_at,v.ends_at,'TEST Faculty Portal'
from public.class_sections s
join public.academic_courses c on c.id=s.course_id and c.code='TEST-101'
cross join (values (2::smallint,'09:00'::time,'09:50'::time),(4::smallint,'09:00'::time,'09:50'::time)) as v(weekday,starts_at,ends_at)
where s.section_code='TST-A' and s.term='2006-2007'
on conflict (section_id,weekday,starts_at) do nothing;

create or replace function private.attach_test_faculty_section_internal(target_character_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare target_section uuid;
begin
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='faculty' and c.handle like 'testfaculty_%') then
    raise exception 'Only your TEST Faculty character can use this fixture';
  end if;
  select s.id into target_section from public.class_sections s join public.academic_courses c on c.id=s.course_id where c.code='TEST-101' and s.section_code='TST-A' and s.term='2006-2007' limit 1;
  insert into public.section_memberships(section_id,character_id,relationship)
  values(target_section,target_character_id,'instructor')
  on conflict (section_id,character_id) do nothing;
end;
$$;
revoke all on function private.attach_test_faculty_section_internal(uuid) from public,anon;
grant execute on function private.attach_test_faculty_section_internal(uuid) to authenticated;

create or replace function public.attach_test_faculty_section(target_character_id uuid)
returns void
language sql
security invoker
set search_path=public,private
as $$ select private.attach_test_faculty_section_internal(target_character_id); $$;
revoke all on function public.attach_test_faculty_section(uuid) from public,anon;
grant execute on function public.attach_test_faculty_section(uuid) to authenticated;
