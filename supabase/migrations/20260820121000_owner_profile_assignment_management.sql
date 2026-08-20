begin;
create or replace function public.owner_set_student_homeroom(target_student_character_id uuid,target_homeroom_id uuid default null)
returns void language plpgsql security definer set search_path='public','private','auth' as $$
begin
 if not private.is_owner_discord_user() or not public.has_privileged_portal_session('owner') then raise exception 'Owner privileged access required'; end if;
 if not exists(select 1 from public.characters where id=target_student_character_id and role='student') then raise exception 'Student character required'; end if;
 if target_homeroom_id is not null and not exists(select 1 from public.homerooms where id=target_homeroom_id and is_active=true) then raise exception 'Active homeroom required'; end if;
 delete from public.homeroom_memberships where student_character_id=target_student_character_id;
 if target_homeroom_id is not null then insert into public.homeroom_memberships(homeroom_id,student_character_id) values(target_homeroom_id,target_student_character_id); end if;
end;$$;
create or replace function public.owner_set_section_membership(target_character_id uuid,target_section_id uuid,target_relationship public.section_relationship,target_enabled boolean default true)
returns void language plpgsql security definer set search_path='public','private','auth' as $$
declare target_role public.character_role;
begin
 if not private.is_owner_discord_user() or not public.has_privileged_portal_session('owner') then raise exception 'Owner privileged access required'; end if;
 select role into target_role from public.characters where id=target_character_id and is_active=true;
 if target_role is null then raise exception 'Active character required'; end if;
 if not exists(select 1 from public.class_sections where id=target_section_id) then raise exception 'Class section required'; end if;
 if target_relationship='student' and target_role<>'student' then raise exception 'Student relationship requires a Student character'; end if;
 if target_relationship='instructor' and target_role<>'faculty' then raise exception 'Instructor relationship requires a Faculty character'; end if;
 delete from public.section_memberships where section_id=target_section_id and character_id=target_character_id and relationship=target_relationship;
 if target_enabled then insert into public.section_memberships(section_id,character_id,relationship) values(target_section_id,target_character_id,target_relationship); end if;
end;$$;
create or replace function public.owner_set_homeroom_adviser(target_homeroom_id uuid,target_faculty_character_id uuid default null)
returns void language plpgsql security definer set search_path='public','private','auth' as $$
begin
 if not private.is_owner_discord_user() or not public.has_privileged_portal_session('owner') then raise exception 'Owner privileged access required'; end if;
 if not exists(select 1 from public.homerooms where id=target_homeroom_id) then raise exception 'Homeroom required'; end if;
 if target_faculty_character_id is not null and not exists(select 1 from public.characters where id=target_faculty_character_id and role='faculty' and is_active=true) then raise exception 'Active Faculty character required'; end if;
 update public.homerooms set adviser_character_id=target_faculty_character_id,updated_at=now() where id=target_homeroom_id;
end;$$;
revoke all on function public.owner_set_student_homeroom(uuid,uuid) from public;
revoke all on function public.owner_set_section_membership(uuid,uuid,public.section_relationship,boolean) from public;
revoke all on function public.owner_set_homeroom_adviser(uuid,uuid) from public;
grant execute on function public.owner_set_student_homeroom(uuid,uuid) to authenticated;
grant execute on function public.owner_set_section_membership(uuid,uuid,public.section_relationship,boolean) to authenticated;
grant execute on function public.owner_set_homeroom_adviser(uuid,uuid) to authenticated;
commit;
