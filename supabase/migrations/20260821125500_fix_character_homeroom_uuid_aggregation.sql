-- Fix Discord homeroom auto-enrollment when a student character is created.
-- PostgreSQL does not provide min(uuid), so aggregate UUIDs through text and cast back.
create or replace function private.apply_discord_homeroom_to_student_character()
returns trigger
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare
  matched_count integer;
  target_homeroom uuid;
  target_code text;
  target_year text;
begin
  if new.role<>'student' or not new.is_active then return new; end if;

  select count(*), min(m.homeroom_id::text)::uuid
    into matched_count,target_homeroom
  from public.account_discord_role_sync s
  join public.discord_homeroom_role_map m on m.role_id=any(s.role_ids)
  where s.user_id=new.owner_user_id;

  if matched_count<>1 then return new; end if;

  select upper(h.code),h.school_year into target_code,target_year
  from public.homerooms h where h.id=target_homeroom and h.is_active=true;
  if target_code is null then return new; end if;

  delete from public.homeroom_memberships where student_character_id=new.id;
  insert into public.homeroom_memberships(homeroom_id,student_character_id,student_year)
  values(target_homeroom,new.id,1);

  delete from public.section_memberships sm
  using public.class_sections cs
  where sm.section_id=cs.id and sm.character_id=new.id and sm.relationship='student'
    and cs.term=target_year and upper(cs.section_code) in ('A','B','C');

  insert into public.section_memberships(section_id,character_id,relationship)
  select cs.id,new.id,'student'
  from public.class_sections cs
  where cs.term=target_year and upper(cs.section_code)=target_code
  on conflict (section_id,character_id) do update set relationship='student';

  return new;
end;
$function$;
