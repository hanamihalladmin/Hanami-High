create or replace function private.character_is_active_teacher(p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.characters c
    where c.id=p_character_id
      and c.character_state='active'
      and c.character_kind='faculty'
      and (c.school_role is null or c.school_role in ('new_faculty','faculty'))
  );
$$;
revoke all on function private.character_is_active_teacher(uuid) from public,anon,authenticated;

create or replace function private.academic_account_can_manage_section(p_account_id uuid,p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_account_id is not null and (
    private.account_has_capability(p_account_id,'school.configure'::extensions.citext)
    or exists(
      select 1
      from public.accounts a
      join public.academic_section_staff s on s.character_id=a.active_character_id
      where a.id=p_account_id
        and s.section_id=p_section_id
        and private.character_is_active_teacher(a.active_character_id)
    )
  );
$$;

create or replace function private.campus_account_can_manage_group(p_account_id uuid,p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_account_id is not null and (
    private.account_has_capability(p_account_id,'school.configure'::extensions.citext)
    or exists(
      select 1
      from public.accounts a
      join public.characters c on c.id=a.active_character_id
      join public.campus_group_members m on m.character_id=c.id
      where a.id=p_account_id
        and m.group_id=p_group_id
        and m.status='active'
        and c.character_state='active'
        and (
          m.member_role in ('officer','president')
          or (m.member_role='advisor' and private.character_is_active_teacher(c.id))
        )
    )
  );
$$;

create or replace function private.validate_campus_membership_character()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists(
    select 1 from public.characters c
    where c.id=new.character_id and c.character_state='active'
  ) then
    raise exception 'Campus membership requires an active character' using errcode='23514';
  end if;
  if new.member_role='advisor' and not private.character_is_active_teacher(new.character_id) then
    raise exception 'Campus advisor membership requires an active teacher' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.group_id<>old.group_id or new.character_id<>old.character_id) then
    raise exception 'Campus membership identity cannot be changed' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_campus_membership_character() from public,anon,authenticated;

create or replace function private.roleplay_account_can_manage_session(p_account_id uuid,p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_account_id is not null and (
    private.account_has_capability(p_account_id,'economy.manage'::extensions.citext)
    or exists(
      select 1
      from public.accounts a
      join public.roleplay_sessions s on s.created_by_character_id=a.active_character_id
      where a.id=p_account_id
        and s.id=p_session_id
        and private.character_is_active_teacher(a.active_character_id)
    )
  );
$$;
revoke all on function private.roleplay_account_can_manage_session(uuid,uuid) from public,anon;
grant execute on function private.roleplay_account_can_manage_session(uuid,uuid) to authenticated;

create or replace function public.roleplay_can_manage_session(p_session_id uuid)
returns boolean
language sql
stable
set search_path=''
as $$
  select private.roleplay_account_can_manage_session((select auth.uid()),p_session_id);
$$;
revoke all on function public.roleplay_can_manage_session(uuid) from public,anon;
grant execute on function public.roleplay_can_manage_session(uuid) to authenticated;

drop policy if exists roleplay_sessions_select_visible on public.roleplay_sessions;
create policy roleplay_sessions_select_visible
on public.roleplay_sessions
for select
to authenticated
using(status in ('open','closed') or public.roleplay_can_manage_session(id));

drop policy if exists roleplay_sessions_staff_update on public.roleplay_sessions;
create policy roleplay_sessions_teacher_update
on public.roleplay_sessions
for update
to authenticated
using(public.roleplay_can_manage_session(id))
with check(public.roleplay_can_manage_session(id));

drop policy if exists roleplay_sessions_staff_delete on public.roleplay_sessions;
drop policy if exists roleplay_sessions_teacher_delete on public.roleplay_sessions;
create policy roleplay_sessions_teacher_delete
on public.roleplay_sessions
for delete
to authenticated
using(public.roleplay_can_manage_session(id));

drop policy if exists roleplay_participants_join on public.roleplay_session_participants;
create policy roleplay_participants_join
on public.roleplay_session_participants
for insert
to authenticated
with check(
  (
    character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
    and exists(select 1 from public.roleplay_sessions s where s.id=session_id and s.status='open')
  )
  or public.roleplay_can_manage_session(session_id)
);

drop policy if exists roleplay_participants_leave on public.roleplay_session_participants;
create policy roleplay_participants_leave
on public.roleplay_session_participants
for delete
to authenticated
using(
  character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  or public.roleplay_can_manage_session(session_id)
);

drop policy if exists roleplay_participants_select_visible on public.roleplay_session_participants;
create policy roleplay_participants_select_visible
on public.roleplay_session_participants
for select
to authenticated
using(
  character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
  or public.roleplay_can_manage_session(session_id)
);

create or replace function private.close_roleplay_session_impl(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account uuid := (select auth.uid());
  v_actor uuid;
  v_session public.roleplay_sessions%rowtype;
  v_part record;
  v_count integer:=0;
  v_target_account uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select active_character_id into v_actor from public.accounts where id=v_account;
  select * into v_session from public.roleplay_sessions where id=p_session_id for update;
  if not found then raise exception 'Roleplay session not found' using errcode='P0002'; end if;
  if v_session.status='closed' then return 0; end if;
  if not private.roleplay_account_can_manage_session(v_account,p_session_id) then
    raise exception 'Active session Teacher or economy manager required' using errcode='42501';
  end if;
  update public.roleplay_sessions set status='closed',closed_at=now() where id=p_session_id;
  for v_part in select character_id from public.roleplay_session_participants where session_id=p_session_id loop
    select account_id into v_target_account from public.characters where id=v_part.character_id;
    if private.post_petal_entry(v_target_account,v_part.character_id,v_session.petal_reward,'roleplay_session','Roleplay session: '||v_session.title,'roleplay:'||p_session_id::text||':'||v_part.character_id::text,v_actor,jsonb_build_object('session_id',p_session_id::text)) then
      v_count:=v_count+1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function private.close_roleplay_session_impl(uuid) from public,anon;
grant execute on function private.close_roleplay_session_impl(uuid) to authenticated;

create or replace function private.owner_set_teacher_status_impl(p_character_id uuid,p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_state text;
  v_old_kind text;
  v_old_role text;
  v_removed_sections integer:=0;
  v_cleared_group_advisors integer:=0;
  v_downgraded_advisor_memberships integer:=0;
  v_open_roleplay_sessions integer:=0;
begin
  if not private.account_has_capability(v_actor,'school.configure'::extensions.citext) then
    raise exception 'School configuration access required' using errcode='42501';
  end if;
  select character_state,character_kind,school_role
    into v_state,v_old_kind,v_old_role
    from public.characters
    where id=p_character_id
    for update;
  if not found then raise exception 'Character not found' using errcode='P0002'; end if;
  if v_state<>'active' then raise exception 'Teacher status may only be changed for active characters' using errcode='42501'; end if;

  if p_enabled then
    update public.characters set character_kind='faculty',school_role='faculty' where id=p_character_id;
  else
    if v_old_kind<>'faculty' or v_old_role not in ('faculty','new_faculty') then
      raise exception 'Character is not currently a teacher' using errcode='P0001';
    end if;

    delete from public.academic_section_staff where character_id=p_character_id;
    get diagnostics v_removed_sections = row_count;

    update public.campus_groups
      set advisor_character_id=null
      where advisor_character_id=p_character_id;
    get diagnostics v_cleared_group_advisors = row_count;

    update public.campus_group_members
      set member_role='member'
      where character_id=p_character_id and member_role='advisor';
    get diagnostics v_downgraded_advisor_memberships = row_count;

    select count(*) into v_open_roleplay_sessions
      from public.roleplay_sessions
      where created_by_character_id=p_character_id and status='open';

    update public.characters set character_kind='student',school_role='student' where id=p_character_id;
  end if;

  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata)
  values(
    v_actor,
    'owner.teacher_status',
    'character',
    p_character_id::text,
    jsonb_build_object(
      'enabled',p_enabled,
      'previous_kind',v_old_kind,
      'previous_role',v_old_role,
      'removed_section_assignments',v_removed_sections,
      'cleared_group_advisor_fields',v_cleared_group_advisors,
      'downgraded_advisor_memberships',v_downgraded_advisor_memberships,
      'open_roleplay_sessions_now_owner_managed',v_open_roleplay_sessions
    )
  );
  return true;
end;
$$;
revoke all on function private.owner_set_teacher_status_impl(uuid,boolean) from public,anon;
grant execute on function private.owner_set_teacher_status_impl(uuid,boolean) to authenticated;
