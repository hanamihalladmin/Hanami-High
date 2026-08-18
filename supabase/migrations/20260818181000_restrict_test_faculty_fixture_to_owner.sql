create or replace function private.attach_test_faculty_section_internal(target_character_id uuid)
returns void language plpgsql security definer set search_path=public,private as $$
declare target_section uuid;
begin
  if not private.is_owner_discord_user() then
    raise exception 'Only the Hanami Owner account can use the TEST Faculty fixture';
  end if;
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='faculty' and c.handle like 'testfaculty_%') then
    raise exception 'Only your Owner TEST Faculty character can use this fixture';
  end if;
  select s.id into target_section from public.class_sections s join public.academic_courses c on c.id=s.course_id where c.code='TEST-101' and s.section_code='TST-A' and s.term='2006-2007' limit 1;
  insert into public.section_memberships(section_id,character_id,relationship)
  values(target_section,target_character_id,'instructor')
  on conflict (section_id,character_id) do nothing;
end;$$;
