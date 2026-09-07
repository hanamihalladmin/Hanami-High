create table public.site_configuration (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by_account_id uuid references public.accounts(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (length(trim(key)) between 2 and 80)
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid references public.characters(id) on delete set null,
  target_type text not null check (target_type in ('character','post','message','guestbook','other')),
  target_id text,
  reason text not null check (length(trim(reason)) between 2 and 200),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolution_note text,
  reviewed_by_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moderation_reports_reporter_idx on public.moderation_reports(reporter_character_id,created_at desc);
create index moderation_reports_target_character_idx on public.moderation_reports(target_character_id) where target_character_id is not null;
create index moderation_reports_status_created_idx on public.moderation_reports(status,created_at desc);
create index moderation_reports_reviewer_idx on public.moderation_reports(reviewed_by_account_id) where reviewed_by_account_id is not null;
create trigger moderation_reports_touch_updated_at before update on public.moderation_reports for each row execute function private.touch_updated_at();

alter table public.site_configuration enable row level security;
alter table public.moderation_reports enable row level security;
revoke all on public.site_configuration,public.moderation_reports from anon,authenticated;
grant select,insert,update,delete on public.site_configuration to authenticated;
grant select,insert,update on public.moderation_reports to authenticated;

create policy site_configuration_read on public.site_configuration for select to authenticated using(true);
create policy site_configuration_manage_insert on public.site_configuration for insert to authenticated with check(public.has_capability('system.configure'));
create policy site_configuration_manage_update on public.site_configuration for update to authenticated using(public.has_capability('system.configure')) with check(public.has_capability('system.configure'));
create policy site_configuration_manage_delete on public.site_configuration for delete to authenticated using(public.has_capability('system.configure'));

create policy moderation_reports_select_visible on public.moderation_reports for select to authenticated using(
  reporter_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('moderation.review_reports')
);
create policy moderation_reports_insert_own on public.moderation_reports for insert to authenticated with check(
  reporter_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and status='open'
);
create policy moderation_reports_moderator_update on public.moderation_reports for update to authenticated using(public.has_capability('moderation.review_reports')) with check(public.has_capability('moderation.review_reports'));

insert into public.site_configuration(key,value,description) values
('network_status',jsonb_build_object('status','open','message','Hanami High Network is open.'),'Displayed operational network status.'),
('school_identity',jsonb_build_object('name','Hanami High','year',2006,'timezone','Asia/Tokyo'),'Core roleplay school identity.'),
('teacher_portal',jsonb_build_object('label','Teachers','enabled',true),'Current teaching portal configuration.'),
('staff_portal',jsonb_build_object('label','Staff','enabled',false),'Reserved for future non-teaching staff login and portal.')
on conflict(key) do nothing;

grant usage on schema private to authenticated;

create or replace function private.owner_console_economy_impl()
returns table(account_id uuid,discord_username text,balance integer,lifetime_earned integer,lifetime_spent integer,hanami_plus_ends_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'economy.manage'::extensions.citext) then raise exception 'Economy management access required' using errcode='42501'; end if;
  return query select a.id,a.discord_username,coalesce(w.balance,0),coalesce(w.lifetime_earned,0),coalesce(w.lifetime_spent,0),e.ends_at
  from public.accounts a left join public.petal_wallets w on w.account_id=a.id left join public.hanami_plus_entitlements e on e.account_id=a.id
  order by coalesce(w.balance,0) desc,a.created_at desc;
end;
$$;
revoke all on function private.owner_console_economy_impl() from public,anon;
grant execute on function private.owner_console_economy_impl() to authenticated;

create or replace function public.owner_console_economy()
returns table(account_id uuid,discord_username text,balance integer,lifetime_earned integer,lifetime_spent integer,hanami_plus_ends_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.owner_console_economy_impl(); $$;
revoke all on function public.owner_console_economy() from public,anon;
grant execute on function public.owner_console_economy() to authenticated;

create or replace function private.owner_adjust_petals_impl(p_account_id uuid,p_amount integer,p_note text,p_request_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'economy.manage'::extensions.citext) then raise exception 'Economy management access required' using errcode='42501'; end if;
  if p_amount=0 or abs(p_amount)>10000 then raise exception 'Adjustment must be between -10000 and 10000, excluding zero' using errcode='22023'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id) then raise exception 'Account not found' using errcode='P0002'; end if;
  perform private.post_petal_entry(p_account_id,null,p_amount,'admin_adjustment',coalesce(nullif(trim(p_note),''),'Owner economy adjustment'),'owner-adjust:'||p_request_id::text,null,jsonb_build_object('owner_account_id',v_actor::text));
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.petal_adjustment','account',p_account_id::text,jsonb_build_object('amount',p_amount,'note',p_note,'request_id',p_request_id::text));
  return true;
end;
$$;
revoke all on function private.owner_adjust_petals_impl(uuid,integer,text,uuid) from public,anon;
grant execute on function private.owner_adjust_petals_impl(uuid,integer,text,uuid) to authenticated;

create or replace function public.owner_adjust_petals(p_account_id uuid,p_amount integer,p_note text,p_request_id uuid)
returns boolean language sql security invoker set search_path='' as $$ select private.owner_adjust_petals_impl(p_account_id,p_amount,p_note,p_request_id); $$;
revoke all on function public.owner_adjust_petals(uuid,integer,text,uuid) from public,anon;
grant execute on function public.owner_adjust_petals(uuid,integer,text,uuid) to authenticated;

create or replace function private.owner_grant_hanami_plus_impl(p_account_id uuid,p_days integer,p_note text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_now timestamptz:=now(); v_end timestamptz;
begin
  if not private.account_has_capability(v_actor,'hanamiplus.manage'::extensions.citext) then raise exception 'Hanami+ management access required' using errcode='42501'; end if;
  if p_days<1 or p_days>3650 then raise exception 'Hanami+ grant must be between 1 and 3650 days' using errcode='22023'; end if;
  if not exists(select 1 from public.accounts where id=p_account_id) then raise exception 'Account not found' using errcode='P0002'; end if;
  select greatest(v_now,coalesce(e.ends_at,v_now)) + make_interval(days=>p_days) into v_end from (select 1) x left join public.hanami_plus_entitlements e on e.account_id=p_account_id;
  insert into public.hanami_plus_entitlements(account_id,starts_at,ends_at,source_item_id) values(p_account_id,v_now,v_end,null)
  on conflict(account_id) do update set ends_at=v_end,source_item_id=null,updated_at=now();
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.hanami_plus_grant','account',p_account_id::text,jsonb_build_object('days',p_days,'ends_at',v_end,'note',p_note));
  return v_end;
end;
$$;
revoke all on function private.owner_grant_hanami_plus_impl(uuid,integer,text) from public,anon;
grant execute on function private.owner_grant_hanami_plus_impl(uuid,integer,text) to authenticated;

create or replace function public.owner_grant_hanami_plus(p_account_id uuid,p_days integer,p_note text)
returns timestamptz language sql security invoker set search_path='' as $$ select private.owner_grant_hanami_plus_impl(p_account_id,p_days,p_note); $$;
revoke all on function public.owner_grant_hanami_plus(uuid,integer,text) from public,anon;
grant execute on function public.owner_grant_hanami_plus(uuid,integer,text) to authenticated;

create or replace function private.owner_set_teacher_status_impl(p_character_id uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_state text; v_old_kind text; v_old_role text;
begin
  if not private.account_has_capability(v_actor,'school.configure'::extensions.citext) then raise exception 'School configuration access required' using errcode='42501'; end if;
  select character_state,character_kind,school_role into v_state,v_old_kind,v_old_role from public.characters where id=p_character_id for update;
  if not found then raise exception 'Character not found' using errcode='P0002'; end if;
  if v_state<>'active' then raise exception 'Teacher status may only be changed for active characters' using errcode='42501'; end if;
  if p_enabled then
    update public.characters set character_kind='faculty',school_role='faculty' where id=p_character_id;
  else
    if v_old_kind<>'faculty' or v_old_role not in ('faculty','new_faculty') then raise exception 'Character is not currently a teacher' using errcode='P0001'; end if;
    update public.characters set character_kind='student',school_role='student' where id=p_character_id;
  end if;
  insert into private.audit_events(actor_account_id,action,target_type,target_id,metadata) values(v_actor,'owner.teacher_status','character',p_character_id::text,jsonb_build_object('enabled',p_enabled,'previous_kind',v_old_kind,'previous_role',v_old_role));
  return true;
end;
$$;
revoke all on function private.owner_set_teacher_status_impl(uuid,boolean) from public,anon;
grant execute on function private.owner_set_teacher_status_impl(uuid,boolean) to authenticated;

create or replace function public.owner_set_teacher_status(p_character_id uuid,p_enabled boolean)
returns boolean language sql security invoker set search_path='' as $$ select private.owner_set_teacher_status_impl(p_character_id,p_enabled); $$;
revoke all on function public.owner_set_teacher_status(uuid,boolean) from public,anon;
grant execute on function public.owner_set_teacher_status(uuid,boolean) to authenticated;
