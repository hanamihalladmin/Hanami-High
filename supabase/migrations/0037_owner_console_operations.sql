create or replace function private.owner_console_accounts_impl()
returns table(account_id uuid,discord_username text,account_state text,active_character_id uuid,character_count bigint,platform_roles text[],created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then raise exception 'Account management access required' using errcode='42501'; end if;
  return query select a.id,a.discord_username,a.account_state,a.active_character_id,(select count(*) from public.characters c where c.account_id=a.id),coalesce((select array_agg(r.code::text order by r.code::text) from public.account_platform_roles ar join public.platform_roles r on r.id=ar.role_id where ar.account_id=a.id),array[]::text[]),a.created_at from public.accounts a order by a.created_at desc;
end;
$$;
revoke all on function private.owner_console_accounts_impl() from public,anon;
grant execute on function private.owner_console_accounts_impl() to authenticated;

create or replace function public.owner_console_accounts()
returns table(account_id uuid,discord_username text,account_state text,active_character_id uuid,character_count bigint,platform_roles text[],created_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.owner_console_accounts_impl(); $$;
revoke all on function public.owner_console_accounts() from public,anon;
grant execute on function public.owner_console_accounts() to authenticated;

create or replace function private.owner_console_characters_impl()
returns table(character_id uuid,account_id uuid,discord_username text,slot_no smallint,display_name text,first_name text,last_name text,handle text,character_kind text,character_state text,school_role text,orientation_completed_at timestamptz,promoted_to_student_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'characters.review'::extensions.citext) and not private.account_has_capability(v_actor,'portals.view_as'::extensions.citext) then raise exception 'Character review or portal preview access required' using errcode='42501'; end if;
  return query select c.id,c.account_id,a.discord_username,c.slot_no,c.display_name,c.first_name,c.last_name,c.handle::text,c.character_kind,c.character_state,c.school_role,c.orientation_completed_at,c.promoted_to_student_at,c.created_at from public.characters c join public.accounts a on a.id=c.account_id order by c.created_at desc;
end;
$$;
revoke all on function private.owner_console_characters_impl() from public,anon;
grant execute on function private.owner_console_characters_impl() to authenticated;

create or replace function public.owner_console_characters()
returns table(character_id uuid,account_id uuid,discord_username text,slot_no smallint,display_name text,first_name text,last_name text,handle text,character_kind text,character_state text,school_role text,orientation_completed_at timestamptz,promoted_to_student_at timestamptz,created_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.owner_console_characters_impl(); $$;
revoke all on function public.owner_console_characters() from public,anon;
grant execute on function public.owner_console_characters() to authenticated;

create or replace function private.owner_console_audit_impl(p_limit integer default 100)
returns table(id bigint,actor_account_id uuid,actor_character_id uuid,action text,target_type text,target_id text,metadata jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'audit.view'::extensions.citext) then raise exception 'Audit access required' using errcode='42501'; end if;
  return query select e.id,e.actor_account_id,e.actor_character_id,e.action,e.target_type,e.target_id,e.metadata,e.created_at from private.audit_events e order by e.created_at desc limit least(greatest(coalesce(p_limit,100),1),500);
end;
$$;
revoke all on function private.owner_console_audit_impl(integer) from public,anon;
grant execute on function private.owner_console_audit_impl(integer) to authenticated;

create or replace function public.owner_console_audit(p_limit integer default 100)
returns table(id bigint,actor_account_id uuid,actor_character_id uuid,action text,target_type text,target_id text,metadata jsonb,created_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.owner_console_audit_impl(p_limit); $$;
revoke all on function public.owner_console_audit(integer) from public,anon;
grant execute on function public.owner_console_audit(integer) to authenticated;

create or replace function private.owner_set_account_state_impl(p_account_id uuid,p_state text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then raise exception 'Account management access required' using errcode='42501'; end if;
  if p_state not in ('active','restricted','suspended','archived') then raise exception 'Invalid account state' using errcode='22023'; end if;
  if p_account_id=v_actor and p_state<>'active' then raise exception 'Owner cannot restrict their own active account here' using errcode='42501'; end if;
  update public.accounts set account_state=p_state where id=p_account_id;
  if not found then raise exception 'Account not found' using errcode='P0002'; end if;
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.account_state','account',p_account_id::text,jsonb_build_object('state',p_state));
  return true;
end;
$$;
revoke all on function private.owner_set_account_state_impl(uuid,text) from public,anon;
grant execute on function private.owner_set_account_state_impl(uuid,text) to authenticated;

create or replace function public.owner_set_account_state(p_account_id uuid,p_state text)
returns boolean language sql security invoker set search_path='' as $$ select private.owner_set_account_state_impl(p_account_id,p_state); $$;
revoke all on function public.owner_set_account_state(uuid,text) from public,anon;
grant execute on function public.owner_set_account_state(uuid,text) to authenticated;

create or replace function private.owner_set_character_state_impl(p_character_id uuid,p_state text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_old text; v_role text;
begin
  if not private.account_has_capability(v_actor,'characters.review'::extensions.citext) then raise exception 'Character management access required' using errcode='42501'; end if;
  if p_state not in ('active','inactive','archived','suspended') then raise exception 'Owner lifecycle state is invalid' using errcode='22023'; end if;
  select character_state,school_role into v_old,v_role from public.characters where id=p_character_id for update;
  if not found then raise exception 'Character not found' using errcode='P0002'; end if;
  if p_state='active' and (v_old not in ('inactive','archived','suspended') or v_role is null) then raise exception 'Only previously active school characters may be reactivated here' using errcode='42501'; end if;
  update public.characters set character_state=p_state where id=p_character_id;
  if p_state<>'active' then update public.accounts set active_character_id=null where active_character_id=p_character_id; end if;
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.character_state','character',p_character_id::text,jsonb_build_object('from',v_old,'to',p_state));
  return true;
end;
$$;
revoke all on function private.owner_set_character_state_impl(uuid,text) from public,anon;
grant execute on function private.owner_set_character_state_impl(uuid,text) to authenticated;

create or replace function public.owner_set_character_state(p_character_id uuid,p_state text)
returns boolean language sql security invoker set search_path='' as $$ select private.owner_set_character_state_impl(p_character_id,p_state); $$;
revoke all on function public.owner_set_character_state(uuid,text) from public,anon;
grant execute on function public.owner_set_character_state(uuid,text) to authenticated;

create or replace function private.owner_set_platform_role_impl(p_account_id uuid,p_role_code text,p_enabled boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_role_id uuid;
begin
  if not private.account_has_capability(v_actor,'permissions.manage'::extensions.citext) then raise exception 'Permission management access required' using errcode='42501'; end if;
  select r.id into v_role_id from public.platform_roles r where r.code::text=p_role_code;
  if v_role_id is null then raise exception 'Unknown platform role' using errcode='P0002'; end if;
  if p_account_id=v_actor and p_role_code='owner' and not p_enabled then raise exception 'You cannot remove your own Owner role' using errcode='42501'; end if;
  if p_enabled then insert into public.account_platform_roles(account_id,role_id,granted_by) values(p_account_id,v_role_id,v_actor) on conflict(account_id,role_id) do nothing; else delete from public.account_platform_roles where account_id=p_account_id and role_id=v_role_id; end if;
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.platform_role','account',p_account_id::text,jsonb_build_object('role',p_role_code,'enabled',p_enabled));
  return true;
end;
$$;
revoke all on function private.owner_set_platform_role_impl(uuid,text,boolean) from public,anon;
grant execute on function private.owner_set_platform_role_impl(uuid,text,boolean) to authenticated;

create or replace function public.owner_set_platform_role(p_account_id uuid,p_role_code text,p_enabled boolean)
returns boolean language sql security invoker set search_path='' as $$ select private.owner_set_platform_role_impl(p_account_id,p_role_code,p_enabled); $$;
revoke all on function public.owner_set_platform_role(uuid,text,boolean) from public,anon;
grant execute on function public.owner_set_platform_role(uuid,text,boolean) to authenticated;

create or replace function private.owner_portal_snapshot_impl(p_character_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_result jsonb;
begin
  if not private.account_has_capability(v_actor,'portals.view_as'::extensions.citext) then raise exception 'Portal preview access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'character',jsonb_build_object('id',c.id,'name',coalesce(c.display_name,nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),'Hanami Character'),'kind',c.character_kind,'role',c.school_role,'state',c.character_state,'slot',c.slot_no),
    'account',jsonb_build_object('id',a.id,'discord_username',a.discord_username,'state',a.account_state),
    'academics',jsonb_build_object('sections',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'section_code',s.section_code,'course',co.name,'course_code',co.code,'room',s.room) order by co.code) from public.academic_sections s join public.academic_courses co on co.id=s.course_id where exists(select 1 from public.academic_enrollments e where e.section_id=s.id and e.student_character_id=c.id and e.status='active') or exists(select 1 from public.academic_section_staff ss where ss.section_id=s.id and ss.character_id=c.id)), '[]'::jsonb),'graded_assignments',(select count(*) from public.academic_grades g where g.student_character_id=c.id),'attendance_records',(select count(*) from public.academic_attendance at where at.student_character_id=c.id)),
    'social',jsonb_build_object('friends',(select count(*) from public.friendships f where f.status='accepted' and (f.requester_character_id=c.id or f.addressee_character_id=c.id)),'posts',(select count(*) from public.social_posts p where p.author_character_id=c.id and p.state='published')),
    'campus',jsonb_build_object('groups',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'type',g.group_type,'role',m.member_role) order by g.name) from public.campus_group_members m join public.campus_groups g on g.id=m.group_id where m.character_id=c.id and m.status='active'),'[]'::jsonb)),
    'economy',jsonb_build_object('petals',coalesce((select w.balance from public.petal_wallets w where w.account_id=a.id),0))
  ) into v_result from public.characters c join public.accounts a on a.id=c.account_id where c.id=p_character_id;
  if v_result is null then raise exception 'Character not found' using errcode='P0002'; end if;
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.view_portal','character',p_character_id::text,'{}'::jsonb);
  return v_result;
end;
$$;
revoke all on function private.owner_portal_snapshot_impl(uuid) from public,anon;
grant execute on function private.owner_portal_snapshot_impl(uuid) to authenticated;

create or replace function public.owner_portal_snapshot(p_character_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select private.owner_portal_snapshot_impl(p_character_id); $$;
revoke all on function public.owner_portal_snapshot(uuid) from public,anon;
grant execute on function public.owner_portal_snapshot(uuid) to authenticated;
