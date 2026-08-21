begin;

alter table public.student_id_cards add column if not exists school_year text not null default '2006-2007';
update public.student_id_cards set school_year='2006-2007' where btrim(coalesce(school_year,''))='';
alter table public.class_sections alter column term set default '2006-2007';
update public.class_sections set term='2006-2007' where term='2026-2027';

create or replace function public.admin_list_homerooms()
returns table(id uuid, code text, grade_level smallint, school_year text, room_label text, description text, is_active boolean, student_count bigint)
language plpgsql security definer set search_path=public,private as $$
declare a record;
begin
 if not private.is_owner_discord_user() then
  select * into a from private.current_account_admin_access_internal() limit 1;
  if not (coalesce(a.site_admin,false) or coalesce(a.content_editor,false) or coalesce(a.moderator,false)) then raise exception 'Administrator or Owner access required'; end if;
 end if;
 return query select h.id,h.code,h.grade_level,h.school_year,h.room_label,h.description,h.is_active,count(hm.student_character_id)
 from public.homerooms h left join public.homeroom_memberships hm on hm.homeroom_id=h.id
 group by h.id order by h.code,h.grade_level;
end;$$;

create or replace function public.admin_create_homeroom(requested_code text, requested_grade_level smallint default 1, requested_school_year text default '2006-2007', requested_room_label text default null, requested_description text default '')
returns uuid language plpgsql security definer set search_path=public,private as $$
declare a record; new_id uuid; clean_code text; clean_year text;
begin
 if not private.is_owner_discord_user() then
  select * into a from private.current_account_admin_access_internal() limit 1;
  if not coalesce(a.site_admin,false) then raise exception 'Site Admin or Owner access required'; end if;
 end if;
 clean_code:=upper(btrim(requested_code)); clean_year:=coalesce(nullif(btrim(requested_school_year),''),'2006-2007');
 if clean_code !~ '^[A-Z]$' then raise exception 'Homeroom code must be one letter, such as A, B, or C'; end if;
 if requested_grade_level not between 1 and 3 then raise exception 'Grade level must be 1, 2, or 3'; end if;
 select h.id into new_id from public.homerooms h where upper(h.code)=clean_code and h.school_year=clean_year limit 1;
 if new_id is not null then return new_id; end if;
 insert into public.homerooms(code,grade_level,school_year,room_label,description,is_active)
 values(clean_code,requested_grade_level,clean_year,nullif(btrim(requested_room_label),''),coalesce(requested_description,''),true) returning id into new_id;
 return new_id;
end;$$;

create or replace function public.admin_list_students_for_homerooms()
returns table(character_id uuid, display_name text, handle text, homeroom_id uuid, homeroom_code text, grade_level smallint, school_year text)
language plpgsql security definer set search_path=public,private as $$
declare a record;
begin
 if not private.is_owner_discord_user() then
  select * into a from private.current_account_admin_access_internal() limit 1;
  if not (coalesce(a.site_admin,false) or coalesce(a.content_editor,false) or coalesce(a.moderator,false)) then raise exception 'Administrator or Owner access required'; end if;
 end if;
 return query select c.id,c.display_name,c.handle,h.id,h.code,h.grade_level,h.school_year
 from public.characters c left join public.homeroom_memberships hm on hm.student_character_id=c.id left join public.homerooms h on h.id=hm.homeroom_id
 where c.role='student' order by c.display_name;
end;$$;

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
 update public.student_id_cards set school_year=room_year,updated_at=now() where character_id=target_character_id;
 return enrolled_count;
end;$$;

create or replace function public.admin_update_student_id(target_character_id uuid, requested_id_number text default null, requested_school_year text default null, requested_status text default null)
returns text language plpgsql security definer set search_path=public,private as $$
declare a record; result_id text; clean_id text; clean_year text; clean_status text;
begin
 if not private.is_owner_discord_user() then
  select * into a from private.current_account_admin_access_internal() limit 1;
  if not coalesce(a.site_admin,false) then raise exception 'Site Admin or Owner access required'; end if;
 end if;
 if not exists(select 1 from public.characters c where c.id=target_character_id and c.role='student') then raise exception 'Target character is not a student'; end if;
 select id_number into result_id from public.student_id_cards where character_id=target_character_id;
 if result_id is null then
  insert into public.student_id_cards(character_id,id_number,school_year,issued_by)
  values(target_character_id,private.make_student_id_number(),coalesce(nullif(btrim(requested_school_year),''),'2006-2007'),auth.uid()) returning id_number into result_id;
 end if;
 clean_id:=nullif(upper(btrim(requested_id_number)),''); clean_year:=nullif(btrim(requested_school_year),''); clean_status:=nullif(lower(btrim(requested_status)),'');
 if clean_id is not null and clean_id !~ '^HHS-[0-9]{4}-[0-9]{4}$' then raise exception 'ID number must use HHS-0000-0000 format'; end if;
 if clean_status is not null and clean_status not in ('active','inactive','reissued') then raise exception 'Invalid ID status'; end if;
 update public.student_id_cards set id_number=coalesce(clean_id,id_number),school_year=coalesce(clean_year,school_year),status=coalesce(clean_status,status),issued_by=auth.uid(),updated_at=now()
 where character_id=target_character_id returning id_number into result_id;
 return result_id;
end;$$;

create or replace function public.admin_list_student_ids()
returns table(character_id uuid, display_name text, handle text, id_number text, id_status text, issued_at timestamptz, homeroom_code text, grade_level smallint, school_year text)
language plpgsql security definer set search_path=public,private as $$
declare a record;
begin
 if not private.is_owner_discord_user() then
  select * into a from private.current_account_admin_access_internal() limit 1;
  if not (coalesce(a.site_admin,false) or coalesce(a.content_editor,false) or coalesce(a.moderator,false)) then raise exception 'Administrator or Owner access required'; end if;
 end if;
 return query select c.id,c.display_name,c.handle,s.id_number,s.status,s.issued_at,h.code,h.grade_level,coalesce(s.school_year,h.school_year,'2006-2007')
 from public.characters c left join public.student_id_cards s on s.character_id=c.id left join public.homeroom_memberships hm on hm.student_character_id=c.id left join public.homerooms h on h.id=hm.homeroom_id
 where c.role='student' order by c.display_name;
end;$$;

revoke all on function public.admin_list_homerooms() from public,anon;
revoke all on function public.admin_create_homeroom(text,smallint,text,text,text) from public,anon;
revoke all on function public.admin_list_students_for_homerooms() from public,anon;
revoke all on function public.admin_assign_student_homeroom(uuid,uuid) from public,anon;
revoke all on function public.admin_update_student_id(uuid,text,text,text) from public,anon;
grant execute on function public.admin_list_homerooms() to authenticated;
grant execute on function public.admin_create_homeroom(text,smallint,text,text,text) to authenticated;
grant execute on function public.admin_list_students_for_homerooms() to authenticated;
grant execute on function public.admin_assign_student_homeroom(uuid,uuid) to authenticated;
grant execute on function public.admin_update_student_id(uuid,text,text,text) to authenticated;

commit;