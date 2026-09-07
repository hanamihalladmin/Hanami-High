create or replace function private.sync_character_search_document()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_source_key text;
  v_title text;
  v_subsection text;
  v_subtitle text;
  v_is_teacher boolean;
begin
  if tg_op='DELETE' then
    delete from public.search_documents where source_key='character:'||old.id::text;
    return old;
  end if;
  v_source_key := 'character:'||new.id::text;
  v_title := coalesce(nullif(trim(new.display_name),''),nullif(trim(concat_ws(' ',new.first_name,new.last_name)),''),'Hanami Student');
  v_is_teacher := new.character_kind='faculty' and (new.school_role is null or new.school_role in ('new_faculty','faculty'));
  v_subsection := case when v_is_teacher then 'faculty' when new.school_role='administration' then 'staff' else 'students' end;
  v_subtitle := case
    when v_is_teacher and new.school_role='new_faculty' then 'New Teacher'
    when v_is_teacher then 'Teacher'
    when new.school_role='administration' then 'Staff'
    when new.school_role is null then 'Hanami Student'
    else initcap(replace(new.school_role,'_',' '))
  end;
  if new.character_state='active' then
    insert into public.search_documents(source_key,document_type,entity_id,owner_account_id,owner_character_id,title,subtitle,body,section,subsection,visibility)
    values(v_source_key,'character',new.id,new.account_id,new.id,v_title,v_subtitle,concat_ws(' ',new.first_name,new.last_name,new.display_name,new.handle,new.school_role,new.character_kind),'discover',v_subsection,'campus')
    on conflict(source_key) do update set entity_id=excluded.entity_id,owner_account_id=excluded.owner_account_id,owner_character_id=excluded.owner_character_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();
  else
    delete from public.search_documents where source_key=v_source_key;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_character_search_document() from public,anon,authenticated;

create or replace function private.validate_academic_staff_character()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_role text; v_kind text; v_state text;
begin
  select c.school_role,c.character_kind,c.character_state into v_role,v_kind,v_state from public.characters c where c.id=new.character_id;
  if not found or v_state<>'active' or not (v_kind='faculty' and (v_role is null or v_role in ('new_faculty','faculty'))) then
    raise exception 'Academic staff must be an active teacher character' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_academic_staff_character() from public,anon,authenticated;

create or replace function private.validate_assignment_creator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
    raise exception 'Assignment creator cannot be changed' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.characters c
    where c.id=new.created_by_character_id
      and c.character_state='active'
      and c.character_kind='faculty'
      and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  ) then
    raise exception 'Assignment creator must be an active teacher' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_assignment_creator() from public,anon,authenticated;

create or replace function private.validate_academic_grade()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_section_id uuid;
begin
  if tg_op='UPDATE' and (new.assignment_id<>old.assignment_id or new.student_character_id<>old.student_character_id) then
    raise exception 'Grade assignment and student identity cannot be changed' using errcode='23514';
  end if;
  select a.section_id into v_section_id from public.academic_assignments a where a.id=new.assignment_id;
  if v_section_id is null or not exists(
    select 1 from public.academic_enrollments e where e.section_id=v_section_id and e.student_character_id=new.student_character_id
  ) then
    raise exception 'Grade student must belong to the assignment section roster' using errcode='23514';
  end if;
  if new.graded_by_character_id is not null and not exists(
    select 1 from public.characters c
    where c.id=new.graded_by_character_id
      and c.character_state='active'
      and c.character_kind='faculty'
      and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  ) then
    raise exception 'Grade author must be an active teacher' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_academic_grade() from public,anon,authenticated;

create or replace function private.validate_academic_attendance()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.section_id<>old.section_id or new.student_character_id<>old.student_character_id or new.school_date<>old.school_date) then
    raise exception 'Attendance section, student, and school date cannot be changed' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.academic_enrollments e where e.section_id=new.section_id and e.student_character_id=new.student_character_id
  ) then
    raise exception 'Attendance student must belong to the section roster' using errcode='23514';
  end if;
  if new.recorded_by_character_id is not null and not exists(
    select 1 from public.characters c
    where c.id=new.recorded_by_character_id
      and c.character_state='active'
      and c.character_kind='faculty'
      and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  ) then
    raise exception 'Attendance recorder must be an active teacher' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_academic_attendance() from public,anon,authenticated;

create or replace function private.validate_campus_group_characters()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.characters c where c.id=new.created_by_character_id and c.character_state='active') then
    raise exception 'Campus group creator must be an active character' using errcode='23514';
  end if;
  if new.advisor_character_id is not null and not exists(
    select 1 from public.characters c
    where c.id=new.advisor_character_id
      and c.character_state='active'
      and c.character_kind='faculty'
      and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  ) then
    raise exception 'Campus advisor must be an active teacher' using errcode='23514';
  end if;
  if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
    raise exception 'Campus group creator cannot be changed' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_campus_group_characters() from public,anon,authenticated;

create or replace function private.validate_school_announcement_author()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
    raise exception 'Announcement author cannot be changed' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.characters c
    where c.id=new.created_by_character_id
      and c.character_state='active'
      and (
        (c.character_kind='faculty' and (c.school_role is null or c.school_role in ('new_faculty','faculty')))
        or private.account_has_capability(c.account_id,'school.configure'::extensions.citext)
      )
  ) then
    raise exception 'Announcement author must be a teacher or have school configuration access' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_school_announcement_author() from public,anon,authenticated;

create or replace function private.validate_roleplay_session_creator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
    raise exception 'Roleplay session creator cannot be changed' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.characters c
    where c.id=new.created_by_character_id
      and c.character_state='active'
      and (
        (c.character_kind='faculty' and (c.school_role is null or c.school_role in ('new_faculty','faculty')))
        or private.account_has_capability(c.account_id,'economy.manage'::extensions.citext)
      )
  ) then
    raise exception 'Roleplay session creator must be a teacher or economy manager' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_roleplay_session_creator() from public,anon,authenticated;

create or replace function public.grant_petals_to_character(p_character_id uuid,p_amount integer,p_note text,p_request_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_actor uuid; v_target_account uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_amount<1 or p_amount>100 then raise exception 'Teacher grants must be between 1 and 100 Petals' using errcode='22023'; end if;
  select a.active_character_id into v_actor from public.accounts a where a.id=v_account;
  if not private.account_has_capability(v_account,'economy.manage'::extensions.citext) and not exists(
    select 1 from public.characters c
    where c.id=v_actor
      and c.character_state='active'
      and c.character_kind='faculty'
      and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  ) then
    raise exception 'Teacher or economy management access required' using errcode='42501';
  end if;
  select c.account_id into v_target_account from public.characters c where c.id=p_character_id and c.character_state='active';
  if v_target_account is null then raise exception 'Target character is unavailable' using errcode='P0002'; end if;
  return private.post_petal_entry(v_target_account,p_character_id,p_amount,'teacher_grant',coalesce(nullif(trim(p_note),''),'Teacher Petal grant'),'teacher:'||p_request_id::text,v_actor,jsonb_build_object('request_id',p_request_id::text));
end;
$$;
revoke all on function public.grant_petals_to_character(uuid,integer,text,uuid) from public,anon;
grant execute on function public.grant_petals_to_character(uuid,integer,text,uuid) to authenticated;

update public.search_documents d
set subsection=case
      when c.character_kind='faculty' and (c.school_role is null or c.school_role in ('new_faculty','faculty')) then 'faculty'
      when c.school_role='administration' then 'staff'
      else 'students'
    end,
    subtitle=case
      when c.character_kind='faculty' and c.school_role='new_faculty' then 'New Teacher'
      when c.character_kind='faculty' and (c.school_role is null or c.school_role='faculty') then 'Teacher'
      when c.school_role='administration' then 'Staff'
      when c.school_role is null then 'Hanami Student'
      else initcap(replace(c.school_role,'_',' '))
    end,
    updated_at=now()
from public.characters c
where d.source_key='character:'||c.id::text;

update public.search_documents
set title='Teachers',subtitle='Discover',body='find teachers classroom instructors',updated_at=now()
where source_key='route:discover:faculty';

drop policy if exists roleplay_sessions_staff_insert on public.roleplay_sessions;
create policy roleplay_sessions_teacher_insert
on public.roleplay_sessions
for insert
to authenticated
with check(
  created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  and (
    exists(
      select 1 from public.characters c
      where c.id=created_by_character_id
        and c.character_state='active'
        and c.character_kind='faculty'
        and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
    )
    or public.has_capability('economy.manage')
  )
);
