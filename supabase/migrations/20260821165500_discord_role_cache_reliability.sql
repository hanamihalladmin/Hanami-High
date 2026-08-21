create or replace function public.cache_discord_role_sync(
  p_user_id uuid,
  p_discord_user_id text,
  p_role_ids text[],
  p_sync_status text,
  p_last_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sync_status not in ('pending','synced','not_member','error') then
    raise exception 'invalid sync status';
  end if;

  insert into public.account_discord_role_sync(
    user_id, discord_user_id, role_ids, synced_at, sync_status, last_error
  ) values (
    p_user_id, p_discord_user_id, coalesce(p_role_ids,'{}'::text[]), now(), p_sync_status, p_last_error
  )
  on conflict (user_id) do update set
    discord_user_id = excluded.discord_user_id,
    role_ids = excluded.role_ids,
    synced_at = excluded.synced_at,
    sync_status = excluded.sync_status,
    last_error = excluded.last_error;
end;
$$;

revoke all on function public.cache_discord_role_sync(uuid,text,text[],text,text) from public, anon, authenticated;
grant execute on function public.cache_discord_role_sync(uuid,text,text[],text,text) to service_role;

create or replace function private.sync_discord_homeroom_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  matched_count integer;
  target_homeroom uuid;
  target_code text;
  target_year text;
  student record;
  preserved_year smallint;
  old_had_mapping boolean:=false;
begin
  select count(*), min(m.homeroom_id::text)::uuid
    into matched_count,target_homeroom
  from public.discord_homeroom_role_map m
  where m.role_id=any(coalesce(new.role_ids,'{}'::text[]));

  if tg_op='UPDATE' then
    select exists(
      select 1 from public.discord_homeroom_role_map m
      where m.role_id=any(coalesce(old.role_ids,'{}'::text[]))
    ) into old_had_mapping;
  end if;

  if matched_count=1 then
    select upper(h.code),h.school_year into target_code,target_year
    from public.homerooms h where h.id=target_homeroom and h.is_active=true;

    if target_code is null then return new; end if;

    for student in
      select c.id from public.characters c
      where c.owner_user_id=new.user_id and c.role='student' and c.is_active=true
    loop
      select hm.student_year into preserved_year
      from public.homeroom_memberships hm
      where hm.student_character_id=student.id
      limit 1;
      preserved_year:=coalesce(preserved_year,1);

      delete from public.homeroom_memberships
      where student_character_id=student.id;
      insert into public.homeroom_memberships(homeroom_id,student_character_id,student_year)
      values(target_homeroom,student.id,preserved_year);

      delete from public.section_memberships sm
      using public.class_sections cs
      where sm.section_id=cs.id
        and sm.character_id=student.id
        and sm.relationship='student'
        and cs.term=target_year
        and upper(cs.section_code) in ('A','B','C');

      insert into public.section_memberships(section_id,character_id,relationship)
      select cs.id,student.id,'student'
      from public.class_sections cs
      where cs.term=target_year and upper(cs.section_code)=target_code
      on conflict (section_id,character_id) do update set relationship='student';
    end loop;
  elsif matched_count=0 and old_had_mapping then
    for student in
      select c.id from public.characters c
      where c.owner_user_id=new.user_id and c.role='student' and c.is_active=true
    loop
      delete from public.homeroom_memberships hm
      using public.discord_homeroom_role_map m
      where hm.student_character_id=student.id and hm.homeroom_id=m.homeroom_id;

      delete from public.section_memberships sm
      using public.class_sections cs
      where sm.section_id=cs.id
        and sm.character_id=student.id
        and sm.relationship='student'
        and cs.term='2006-2007'
        and upper(cs.section_code) in ('A','B','C');
    end loop;
  end if;

  return new;
end;
$$;
