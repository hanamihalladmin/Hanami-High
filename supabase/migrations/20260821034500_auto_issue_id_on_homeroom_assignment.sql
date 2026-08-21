create or replace function public.admin_assign_student_homeroom(target_character_id uuid,target_homeroom_id uuid)
returns integer language plpgsql security definer set search_path=public,private as $$
declare a record; room_code text; room_year text; enrolled_count integer;
begin
 if not private.is_owner_discord_user() then
  select * into a from private.current_account_admin_access_internal() limit 1;
  if not coalesce(a.site_admin,false) then raise exception 'Site Admin or Owner access required'; end if;
 end if;
 if not exists(select 1 from public.characters c where c.id=target_character_id and c.role='student') then raise exception 'Target character is not a student'; end if;
 select upper(h.code),h.school_year into room_code,room_year from public.homerooms h where h.id=target_homeroom_id and h.is_active;
 if room_code is null then raise exception 'Homeroom not found'; end if;
 delete from public.homeroom_memberships where student_character_id=target_character_id;
 insert into public.homeroom_memberships(homeroom_id,student_character_id) values(target_homeroom_id,target_character_id);
 delete from public.section_memberships sm using public.class_sections cs
 where sm.section_id=cs.id and sm.character_id=target_character_id and sm.relationship='student' and cs.term=room_year and upper(cs.section_code) in ('A','B','C');
 insert into public.section_memberships(section_id,character_id,relationship)
 select cs.id,target_character_id,'student' from public.class_sections cs
 where cs.term=room_year and upper(cs.section_code)=room_code
 on conflict (section_id,character_id) do update set relationship='student';
 get diagnostics enrolled_count = row_count;
 insert into public.student_id_cards(character_id,id_number,school_year,issued_by)
 values(target_character_id,private.make_student_id_number(),room_year,auth.uid())
 on conflict (character_id) do update set school_year=excluded.school_year,updated_at=now(),issued_by=auth.uid();
 return enrolled_count;
end;$$;