alter table public.homeroom_memberships add column if not exists student_year smallint not null default 1;
do $$ begin if not exists (select 1 from pg_constraint where conname='homeroom_memberships_student_year_check') then alter table public.homeroom_memberships add constraint homeroom_memberships_student_year_check check (student_year between 1 and 2); end if; end $$;
alter table public.homerooms drop constraint if exists homerooms_code_check;
alter table public.homerooms add constraint homerooms_code_check check (char_length(code) between 1 and 20);
update public.homerooms set code=right(upper(code),1),description=case when description='' then 'Mixed 1st-year and 2nd-year homeroom.' else description end,updated_at=now() where upper(code) in ('1-A','1-B','1-C');

create or replace function public.admin_assign_student_homeroom(target_character_id uuid,target_homeroom_id uuid,requested_student_year smallint default 1) returns integer language plpgsql security definer set search_path='public','private' as $$
declare a record; room_code text; room_year text; enrolled_count integer;
begin
 if not private.is_owner_discord_user() then select * into a from private.current_account_admin_access_internal() limit 1; if not coalesce(a.site_admin,false) then raise exception 'Site Admin or Owner access required'; end if; end if;
 if requested_student_year not between 1 and 2 then raise exception 'Student year must be 1 or 2'; end if;
 if not exists(select 1 from public.characters c where c.id=target_character_id and c.role='student') then raise exception 'Target character is not a student'; end if;
 select right(upper(h.code),1),h.school_year into room_code,room_year from public.homerooms h where h.id=target_homeroom_id and h.is_active;
 if room_code is null then raise exception 'Homeroom not found'; end if;
 delete from public.homeroom_memberships where student_character_id=target_character_id;
 insert into public.homeroom_memberships(homeroom_id,student_character_id,student_year) values(target_homeroom_id,target_character_id,requested_student_year);
 delete from public.section_memberships sm using public.class_sections cs where sm.section_id=cs.id and sm.character_id=target_character_id and sm.relationship='student' and cs.term=room_year and upper(cs.section_code) in ('A','B','C');
 insert into public.section_memberships(section_id,character_id,relationship) select cs.id,target_character_id,'student' from public.class_sections cs where cs.term=room_year and upper(cs.section_code)=room_code on conflict (section_id,character_id) do update set relationship='student';
 get diagnostics enrolled_count = row_count;
 insert into public.student_id_cards(character_id,id_number,school_year,issued_by,status) values(target_character_id,private.make_student_id_number(),room_year,auth.uid(),'active') on conflict (character_id) do update set school_year=excluded.school_year,status='active',updated_at=now(),issued_by=auth.uid();
 return enrolled_count;
end;$$;

create or replace function public.admin_list_students_for_homerooms() returns table(character_id uuid, display_name text, handle text, homeroom_id uuid, homeroom_code text, grade_level smallint, school_year text) language plpgsql security definer set search_path='public','private' as $$
declare a record;
begin
 if not private.is_owner_discord_user() then select * into a from private.current_account_admin_access_internal() limit 1; if not (coalesce(a.site_admin,false) or coalesce(a.content_editor,false) or coalesce(a.moderator,false)) then raise exception 'Administrator or Owner access required'; end if; end if;
 return query select c.id,c.display_name,c.handle,h.id,h.code,hm.student_year,h.school_year from public.characters c left join public.homeroom_memberships hm on hm.student_character_id=c.id left join public.homerooms h on h.id=hm.homeroom_id where c.role='student' order by c.display_name;
end;$$;

delete from public.section_memberships sm using public.class_sections cs where sm.section_id=cs.id and sm.relationship='student' and upper(cs.section_code) in ('A','B','C') and sm.character_id in (select student_character_id from public.homeroom_memberships);
insert into public.section_memberships(section_id,character_id,relationship) select cs.id,hm.student_character_id,'student' from public.homeroom_memberships hm join public.homerooms h on h.id=hm.homeroom_id join public.class_sections cs on cs.term=h.school_year and upper(cs.section_code)=right(upper(h.code),1) on conflict (section_id,character_id) do update set relationship='student';

create or replace function public.join_campus_club(target_character_id uuid,target_activity_id uuid) returns boolean language plpgsql security definer set search_path='public' as $$ begin if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='student') then raise exception 'You can only register your own student character'; end if; if not exists(select 1 from public.campus_activities a where a.id=target_activity_id and a.is_active and a.kind='club') then raise exception 'That club is not available for registration'; end if; insert into public.campus_activity_memberships(activity_id,character_id,status) values(target_activity_id,target_character_id,'member') on conflict (activity_id,character_id) do update set status='member'; return true; end; $$;
create or replace function public.leave_campus_club(target_character_id uuid,target_activity_id uuid) returns boolean language plpgsql security definer set search_path='public' as $$ begin if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='student') then raise exception 'You can only update your own student character'; end if; delete from public.campus_activity_memberships m using public.campus_activities a where m.activity_id=a.id and m.activity_id=target_activity_id and m.character_id=target_character_id and a.kind='club'; return true; end; $$;
grant execute on function public.join_campus_club(uuid,uuid) to authenticated;
grant execute on function public.leave_campus_club(uuid,uuid) to authenticated;

create or replace function private.sync_student_id_to_legacy() returns trigger language plpgsql security definer set search_path='public','private' as $$ declare legacy_status text; begin legacy_status:=case new.status when 'active' then 'active' when 'reissued' then 'reissued' else 'revoked' end; insert into public.character_school_ids(character_id,school_number,issued_at,expires_at,barcode_value,status) values(new.character_id,new.id_number,new.issued_at,null,replace(new.id_number,'-',''),legacy_status) on conflict (character_id) do update set school_number=excluded.school_number,issued_at=excluded.issued_at,barcode_value=excluded.barcode_value,status=excluded.status; return new; end; $$;
drop trigger if exists student_id_cards_sync_legacy on public.student_id_cards;
create trigger student_id_cards_sync_legacy after insert or update on public.student_id_cards for each row execute function private.sync_student_id_to_legacy();
insert into public.character_school_ids(character_id,school_number,issued_at,expires_at,barcode_value,status) select s.character_id,s.id_number,s.issued_at,null,replace(s.id_number,'-',''),case s.status when 'active' then 'active' when 'reissued' then 'reissued' else 'revoked' end from public.student_id_cards s on conflict (character_id) do update set school_number=excluded.school_number,issued_at=excluded.issued_at,barcode_value=excluded.barcode_value,status=excluded.status;

drop function if exists public.attach_test_faculty_section(uuid);
delete from public.class_sections where section_code='TST-A' or course_id in (select id from public.academic_courses where code='TEST-101');
delete from public.academic_courses where code='TEST-101' or title='Faculty Portal Test Class';
