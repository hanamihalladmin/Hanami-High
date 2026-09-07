create table public.campus_groups (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  group_type text not null check (group_type in ('club','organization','student_council')),
  description text, status text not null default 'active' check (status in ('draft','active','archived')),
  open_membership boolean not null default true, meeting_room text,
  meeting_weekday smallint check (meeting_weekday is null or meeting_weekday between 1 and 5), meeting_time time,
  advisor_character_id uuid references public.characters(id) on delete set null,
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (length(trim(slug)) between 2 and 64), check (length(trim(name)) between 2 and 120)
);

create table public.campus_group_members (
  group_id uuid not null references public.campus_groups(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member','officer','president','advisor')),
  status text not null default 'pending' check (status in ('pending','active','inactive','declined')),
  joined_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (group_id, character_id)
);

create table public.campus_events (
  id uuid primary key default gen_random_uuid(), group_id uuid references public.campus_groups(id) on delete set null,
  title text not null, description text,
  event_type text not null default 'school' check (event_type in ('school','club','organization','community','student_council')),
  school_date date not null, starts_at time, ends_at time, location text,
  status text not null default 'draft' check (status in ('draft','published','cancelled','completed')),
  capacity integer check (capacity is null or capacity between 1 and 5000),
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (extract(year from school_date)=2006), check (starts_at is null or ends_at is null or ends_at>starts_at)
);

create table public.campus_event_registrations (
  event_id uuid not null references public.campus_events(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  status text not null default 'going' check (status in ('going','interested','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (event_id, character_id)
);

create table public.campus_opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_type text not null check (opportunity_type in ('job','internship','volunteer','campus_role')),
  title text not null, organization_name text not null, description text not null, location text,
  school_start_date date, application_deadline date, application_instructions text,
  state text not null default 'draft' check (state in ('draft','published','closed')),
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (school_start_date is null or extract(year from school_start_date)=2006),
  check (application_deadline is null or extract(year from application_deadline)=2006)
);

create table public.campus_opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.campus_opportunities(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  statement text not null default '',
  status text not null default 'submitted' check (status in ('submitted','withdrawn','reviewing','accepted','declined')),
  submitted_at timestamptz not null default now(), reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (opportunity_id, character_id)
);

create index campus_groups_advisor_idx on public.campus_groups(advisor_character_id) where advisor_character_id is not null;
create index campus_groups_creator_idx on public.campus_groups(created_by_character_id);
create index campus_group_members_character_idx on public.campus_group_members(character_id,status,group_id);
create index campus_events_group_date_idx on public.campus_events(group_id,school_date,status);
create index campus_events_creator_idx on public.campus_events(created_by_character_id);
create index campus_events_date_status_idx on public.campus_events(school_date,status);
create index campus_event_registrations_character_idx on public.campus_event_registrations(character_id,status,event_id);
create index campus_opportunities_state_deadline_idx on public.campus_opportunities(state,application_deadline);
create index campus_opportunities_creator_idx on public.campus_opportunities(created_by_character_id);
create index campus_opportunity_applications_character_idx on public.campus_opportunity_applications(character_id,status,opportunity_id);
create index campus_opportunity_applications_opportunity_idx on public.campus_opportunity_applications(opportunity_id,status);

create trigger campus_groups_touch_updated_at before update on public.campus_groups for each row execute function private.touch_updated_at();
create trigger campus_group_members_touch_updated_at before update on public.campus_group_members for each row execute function private.touch_updated_at();
create trigger campus_events_touch_updated_at before update on public.campus_events for each row execute function private.touch_updated_at();
create trigger campus_event_registrations_touch_updated_at before update on public.campus_event_registrations for each row execute function private.touch_updated_at();
create trigger campus_opportunities_touch_updated_at before update on public.campus_opportunities for each row execute function private.touch_updated_at();
create trigger campus_opportunity_applications_touch_updated_at before update on public.campus_opportunity_applications for each row execute function private.touch_updated_at();

create or replace function private.campus_account_can_manage_group(p_account_id uuid,p_group_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_account_id is not null and (
  private.account_has_capability(p_account_id,'school.configure'::extensions.citext)
  or exists(
    select 1 from public.accounts a
    join public.campus_group_members m on m.character_id=a.active_character_id
    where a.id=p_account_id and m.group_id=p_group_id and m.status='active'
      and m.member_role in ('officer','president','advisor')
  )
 );
$$;
revoke all on function private.campus_account_can_manage_group(uuid,uuid) from public,anon,authenticated;
grant execute on function private.campus_account_can_manage_group(uuid,uuid) to authenticated;

create or replace function private.campus_account_is_group_member(p_account_id uuid,p_group_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_account_id is not null and exists(
  select 1 from public.accounts a
  join public.campus_group_members m on m.character_id=a.active_character_id
  where a.id=p_account_id and m.group_id=p_group_id and m.status='active'
 );
$$;
revoke all on function private.campus_account_is_group_member(uuid,uuid) from public,anon,authenticated;
grant execute on function private.campus_account_is_group_member(uuid,uuid) to authenticated;

create or replace function public.campus_can_manage_group(p_group_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select private.campus_account_can_manage_group((select auth.uid()),p_group_id);
$$;
revoke all on function public.campus_can_manage_group(uuid) from public,anon;
grant execute on function public.campus_can_manage_group(uuid) to authenticated;

create or replace function public.campus_is_group_member(p_group_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select private.campus_account_is_group_member((select auth.uid()),p_group_id);
$$;
revoke all on function public.campus_is_group_member(uuid) from public,anon;
grant execute on function public.campus_is_group_member(uuid) to authenticated;

create or replace function private.validate_campus_group_characters()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.characters c where c.id=new.created_by_character_id and c.character_state='active') then
   raise exception 'Campus group creator must be an active character' using errcode='23514';
 end if;
 if new.advisor_character_id is not null and not exists(
   select 1 from public.characters c where c.id=new.advisor_character_id and c.character_state='active'
     and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
 ) then raise exception 'Campus advisor must be active faculty or administration' using errcode='23514'; end if;
 if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
   raise exception 'Campus group creator cannot be changed' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_campus_group_characters() from public,anon,authenticated;
create trigger campus_groups_validate_characters before insert or update of created_by_character_id,advisor_character_id on public.campus_groups for each row execute function private.validate_campus_group_characters();

create or replace function private.validate_campus_membership_character()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.characters c where c.id=new.character_id and c.character_state='active') then
   raise exception 'Campus membership requires an active character' using errcode='23514';
 end if;
 if tg_op='UPDATE' and (new.group_id<>old.group_id or new.character_id<>old.character_id) then
   raise exception 'Campus membership identity cannot be changed' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_campus_membership_character() from public,anon,authenticated;
create trigger campus_group_members_validate before insert or update on public.campus_group_members for each row execute function private.validate_campus_membership_character();

create or replace function private.validate_campus_event_creator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.characters c where c.id=new.created_by_character_id and c.character_state='active') then
   raise exception 'Campus event creator must be an active character' using errcode='23514';
 end if;
 if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
   raise exception 'Campus event creator cannot be changed' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_campus_event_creator() from public,anon,authenticated;
create trigger campus_events_validate_creator before insert or update of created_by_character_id on public.campus_events for each row execute function private.validate_campus_event_creator();

create or replace function private.validate_campus_opportunity_creator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.characters c where c.id=new.created_by_character_id and c.character_state='active') then
   raise exception 'Opportunity creator must be an active character' using errcode='23514';
 end if;
 if tg_op='UPDATE' and new.created_by_character_id<>old.created_by_character_id then
   raise exception 'Opportunity creator cannot be changed' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_campus_opportunity_creator() from public,anon,authenticated;
create trigger campus_opportunities_validate_creator before insert or update of created_by_character_id on public.campus_opportunities for each row execute function private.validate_campus_opportunity_creator();

create or replace function private.lock_campus_event_registration_identity()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.event_id<>old.event_id or new.character_id<>old.character_id then
   raise exception 'Event registration identity cannot be changed' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.lock_campus_event_registration_identity() from public,anon,authenticated;
create trigger campus_event_registrations_lock_identity before update of event_id,character_id on public.campus_event_registrations for each row execute function private.lock_campus_event_registration_identity();

create or replace function private.validate_campus_opportunity_application()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(
   select 1 from public.characters c where c.id=new.character_id and c.character_state='active'
     and c.character_kind='student' and c.school_role in ('new_student','student')
 ) then raise exception 'Opportunity applications require an active student character' using errcode='23514'; end if;
 if tg_op='UPDATE' and (new.opportunity_id<>old.opportunity_id or new.character_id<>old.character_id) then
   raise exception 'Opportunity application identity cannot be changed' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_campus_opportunity_application() from public,anon,authenticated;
create trigger campus_opportunity_applications_validate before insert or update on public.campus_opportunity_applications for each row execute function private.validate_campus_opportunity_application();

alter table public.campus_groups enable row level security;
alter table public.campus_group_members enable row level security;
alter table public.campus_events enable row level security;
alter table public.campus_event_registrations enable row level security;
alter table public.campus_opportunities enable row level security;
alter table public.campus_opportunity_applications enable row level security;

revoke all on public.campus_groups,public.campus_group_members,public.campus_events,public.campus_event_registrations,public.campus_opportunities,public.campus_opportunity_applications from anon,authenticated;
grant select,insert,update,delete on public.campus_groups,public.campus_group_members,public.campus_events,public.campus_event_registrations,public.campus_opportunities,public.campus_opportunity_applications to authenticated;

create policy campus_groups_select_visible on public.campus_groups for select to authenticated using(status='active' or public.campus_can_manage_group(id));
create policy campus_groups_admin_insert on public.campus_groups for insert to authenticated with check(public.has_capability('school.configure') and created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())));
create policy campus_groups_manage_update on public.campus_groups for update to authenticated using(public.campus_can_manage_group(id)) with check(public.campus_can_manage_group(id));
create policy campus_groups_admin_delete on public.campus_groups for delete to authenticated using(public.has_capability('school.configure'));

create policy campus_group_members_select_visible on public.campus_group_members for select to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.campus_is_group_member(group_id) or public.campus_can_manage_group(group_id));
create policy campus_group_members_insert_visible on public.campus_group_members for insert to authenticated with check((character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and member_role='member' and status='pending' and exists(select 1 from public.campus_groups g where g.id=group_id and g.status='active' and g.open_membership)) or public.campus_can_manage_group(group_id));
create policy campus_group_members_update_visible on public.campus_group_members for update to authenticated using(public.campus_can_manage_group(group_id)) with check(public.campus_can_manage_group(group_id));
create policy campus_group_members_delete_visible on public.campus_group_members for delete to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.campus_can_manage_group(group_id));

create policy campus_events_select_visible on public.campus_events for select to authenticated using(status in ('published','completed','cancelled') or (group_id is not null and public.campus_can_manage_group(group_id)) or (group_id is null and public.has_capability('school.configure')));
create policy campus_events_insert_visible on public.campus_events for insert to authenticated with check(created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and ((group_id is null and public.has_capability('school.configure')) or (group_id is not null and public.campus_can_manage_group(group_id))));
create policy campus_events_update_visible on public.campus_events for update to authenticated using((group_id is null and public.has_capability('school.configure')) or (group_id is not null and public.campus_can_manage_group(group_id))) with check((group_id is null and public.has_capability('school.configure')) or (group_id is not null and public.campus_can_manage_group(group_id)));
create policy campus_events_delete_visible on public.campus_events for delete to authenticated using((group_id is null and public.has_capability('school.configure')) or (group_id is not null and public.campus_can_manage_group(group_id)));

create policy campus_event_registrations_select_visible on public.campus_event_registrations for select to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or exists(select 1 from public.campus_events e where e.id=event_id and ((e.group_id is null and public.has_capability('school.configure')) or (e.group_id is not null and public.campus_can_manage_group(e.group_id)))));
create policy campus_event_registrations_insert_own on public.campus_event_registrations for insert to authenticated with check(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and exists(select 1 from public.campus_events e where e.id=event_id and e.status='published'));
create policy campus_event_registrations_update_own on public.campus_event_registrations for update to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid()))) with check(character_id=(select active_character_id from public.accounts where id=(select auth.uid())));
create policy campus_event_registrations_delete_own on public.campus_event_registrations for delete to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())));

create policy campus_opportunities_select_visible on public.campus_opportunities for select to authenticated using(state in ('published','closed') or public.has_capability('school.configure'));
create policy campus_opportunities_admin_insert on public.campus_opportunities for insert to authenticated with check(public.has_capability('school.configure') and created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())));
create policy campus_opportunities_admin_update on public.campus_opportunities for update to authenticated using(public.has_capability('school.configure')) with check(public.has_capability('school.configure'));
create policy campus_opportunities_admin_delete on public.campus_opportunities for delete to authenticated using(public.has_capability('school.configure'));

create policy campus_opportunity_applications_select_visible on public.campus_opportunity_applications for select to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('school.configure'));
create policy campus_opportunity_applications_insert_own on public.campus_opportunity_applications for insert to authenticated with check(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and status='submitted' and exists(select 1 from public.campus_opportunities o where o.id=opportunity_id and o.state='published'));
create policy campus_opportunity_applications_update_visible on public.campus_opportunity_applications for update to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) or public.has_capability('school.configure')) with check((character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and status in ('submitted','withdrawn')) or public.has_capability('school.configure'));
create policy campus_opportunity_applications_delete_own on public.campus_opportunity_applications for delete to authenticated using(character_id=(select active_character_id from public.accounts where id=(select auth.uid())) and status in ('submitted','withdrawn'));
