-- Hanami High v2: first-class homerooms, account-level school administration,
-- and safe v1 -> v2 carryover keyed by verified Discord identity.

-- ---------------------------------------------------------------------------
-- Legacy source keys on durable school/catalog records.
-- ---------------------------------------------------------------------------
alter table public.academic_courses add column if not exists legacy_source_id uuid;
alter table public.academic_sections add column if not exists legacy_source_id uuid;
alter table public.campus_groups add column if not exists legacy_source_id uuid;
alter table public.campus_events add column if not exists legacy_source_id uuid;

create unique index if not exists academic_courses_legacy_source_uidx on public.academic_courses(legacy_source_id) where legacy_source_id is not null;
create unique index if not exists academic_sections_legacy_source_uidx on public.academic_sections(legacy_source_id) where legacy_source_id is not null;
create unique index if not exists campus_groups_legacy_source_uidx on public.campus_groups(legacy_source_id) where legacy_source_id is not null;
create unique index if not exists campus_events_legacy_source_uidx on public.campus_events(legacy_source_id) where legacy_source_id is not null;

-- ---------------------------------------------------------------------------
-- First-class homerooms and explicit memberships.
-- ---------------------------------------------------------------------------
create table if not exists public.school_homerooms (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id uuid unique,
  code text not null,
  school_year smallint not null default 2006 check (school_year = 2006),
  grade_level smallint check (grade_level is null or grade_level in (1,2)),
  room_label text,
  description text,
  advisor_character_id uuid references public.characters(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(code)) between 1 and 24),
  unique (school_year, code)
);

create table if not exists public.homeroom_memberships (
  homeroom_id uuid not null references public.school_homerooms(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  student_year smallint not null default 1 check (student_year in (1,2)),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (homeroom_id, student_character_id),
  unique (student_character_id)
);

create index if not exists school_homerooms_advisor_idx on public.school_homerooms(advisor_character_id) where advisor_character_id is not null;
create index if not exists homeroom_memberships_homeroom_idx on public.homeroom_memberships(homeroom_id, student_year, student_character_id);

create trigger school_homerooms_touch_updated_at before update on public.school_homerooms for each row execute function private.touch_updated_at();
create trigger homeroom_memberships_touch_updated_at before update on public.homeroom_memberships for each row execute function private.touch_updated_at();

create or replace function private.validate_homeroom_membership_character()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.characters c
    where c.id = new.student_character_id
      and c.character_state = 'active'
      and c.character_kind = 'student'
      and c.school_role in ('new_student','student')
  ) then
    raise exception 'Homeroom membership requires an active student character' using errcode='23514';
  end if;
  if tg_op = 'UPDATE' and new.student_character_id <> old.student_character_id then
    raise exception 'Homeroom membership character cannot be changed' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_homeroom_membership_character() from public, anon, authenticated;
create trigger homeroom_memberships_validate before insert or update on public.homeroom_memberships for each row execute function private.validate_homeroom_membership_character();

create or replace function private.validate_homeroom_advisor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.advisor_character_id is not null and not exists (
    select 1 from public.characters c
    where c.id = new.advisor_character_id
      and c.character_state = 'active'
      and (c.character_kind = 'faculty' or c.school_role in ('faculty','administration'))
  ) then
    raise exception 'Homeroom adviser must be an active teacher or administration character' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_homeroom_advisor() from public, anon, authenticated;
create trigger school_homerooms_validate_advisor before insert or update of advisor_character_id on public.school_homerooms for each row execute function private.validate_homeroom_advisor();

create or replace function private.academic_account_is_homeroom_member(p_account_id uuid, p_homeroom_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_account_id is not null and exists (
    select 1
    from public.accounts a
    join public.homeroom_memberships hm on hm.student_character_id = a.active_character_id
    join public.school_homerooms h on h.id = hm.homeroom_id
    where a.id = p_account_id
      and h.is_active
      and h.code = p_homeroom_code
  );
$$;

create or replace function private.academic_account_can_manage_homeroom(p_account_id uuid, p_homeroom_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_account_id is not null and (
    private.account_has_capability(p_account_id, 'school.configure'::extensions.citext)
    or exists (
      select 1
      from public.accounts a
      join public.school_homerooms h on h.advisor_character_id = a.active_character_id
      where a.id = p_account_id and h.is_active and h.code = p_homeroom_code
    )
  );
$$;

revoke all on function private.academic_account_is_homeroom_member(uuid,text) from public, anon;
revoke all on function private.academic_account_can_manage_homeroom(uuid,text) from public, anon;
grant execute on function private.academic_account_is_homeroom_member(uuid,text) to authenticated;
grant execute on function private.academic_account_can_manage_homeroom(uuid,text) to authenticated;

create or replace function public.academic_is_homeroom_member(p_homeroom_code text)
returns boolean language sql stable security invoker set search_path='' as $$
  select private.academic_account_is_homeroom_member((select auth.uid()), p_homeroom_code);
$$;
create or replace function public.academic_can_manage_homeroom(p_homeroom_code text)
returns boolean language sql stable security invoker set search_path='' as $$
  select private.academic_account_can_manage_homeroom((select auth.uid()), p_homeroom_code);
$$;
revoke all on function public.academic_is_homeroom_member(text) from public, anon;
revoke all on function public.academic_can_manage_homeroom(text) from public, anon;
grant execute on function public.academic_is_homeroom_member(text) to authenticated;
grant execute on function public.academic_can_manage_homeroom(text) to authenticated;

alter table public.school_homerooms enable row level security;
alter table public.homeroom_memberships enable row level security;
revoke all on public.school_homerooms, public.homeroom_memberships from anon, authenticated;
grant select, insert, update, delete on public.school_homerooms, public.homeroom_memberships to authenticated;

create policy school_homerooms_select_visible on public.school_homerooms for select to authenticated using (
  public.has_capability('school.configure')
  or public.academic_is_homeroom_member(code)
  or public.academic_can_manage_homeroom(code)
);
create policy school_homerooms_admin_insert on public.school_homerooms for insert to authenticated with check (public.has_capability('school.configure'));
create policy school_homerooms_admin_update on public.school_homerooms for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy school_homerooms_admin_delete on public.school_homerooms for delete to authenticated using (public.has_capability('school.configure'));

create policy homeroom_memberships_select_visible on public.homeroom_memberships for select to authenticated using (
  student_character_id = (select active_character_id from public.accounts where id=(select auth.uid()))
  or exists (select 1 from public.school_homerooms h where h.id=homeroom_id and public.academic_can_manage_homeroom(h.code))
);
create policy homeroom_memberships_admin_insert on public.homeroom_memberships for insert to authenticated with check (public.has_capability('school.configure'));
create policy homeroom_memberships_admin_update on public.homeroom_memberships for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy homeroom_memberships_admin_delete on public.homeroom_memberships for delete to authenticated using (public.has_capability('school.configure'));

-- ---------------------------------------------------------------------------
-- Owner/Admin account-mode authorship. Character creators remain supported for
-- teacher/group-scoped actions, but school.configure no longer requires an OC.
-- ---------------------------------------------------------------------------
alter table public.campus_groups add column if not exists created_by_account_id uuid references public.accounts(id) on delete set null;
alter table public.campus_events add column if not exists created_by_account_id uuid references public.accounts(id) on delete set null;
alter table public.campus_opportunities add column if not exists created_by_account_id uuid references public.accounts(id) on delete set null;
alter table public.school_announcements add column if not exists created_by_account_id uuid references public.accounts(id) on delete set null;

alter table public.campus_groups alter column created_by_character_id drop not null;
alter table public.campus_events alter column created_by_character_id drop not null;
alter table public.campus_opportunities alter column created_by_character_id drop not null;
alter table public.school_announcements alter column created_by_character_id drop not null;

create index if not exists campus_groups_creator_account_idx on public.campus_groups(created_by_account_id) where created_by_account_id is not null;
create index if not exists campus_events_creator_account_idx on public.campus_events(created_by_account_id) where created_by_account_id is not null;
create index if not exists campus_opportunities_creator_account_idx on public.campus_opportunities(created_by_account_id) where created_by_account_id is not null;
create index if not exists school_announcements_creator_account_idx on public.school_announcements(created_by_account_id) where created_by_account_id is not null;

create or replace function private.validate_campus_group_characters()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_character_account uuid;
begin
  if tg_op='UPDATE' and (
    new.created_by_character_id is distinct from old.created_by_character_id
    or new.created_by_account_id is distinct from old.created_by_account_id
  ) then raise exception 'Campus group creator cannot be changed' using errcode='23514'; end if;

  if new.created_by_character_id is not null then
    select c.account_id into v_character_account from public.characters c
    where c.id=new.created_by_character_id and c.character_state='active';
    if v_character_account is null then raise exception 'Campus group creator must be an active character' using errcode='23514'; end if;
    if new.created_by_account_id is null then new.created_by_account_id := v_character_account; end if;
    if new.created_by_account_id <> v_character_account then raise exception 'Campus group creator account does not own creator character' using errcode='23514'; end if;
  elsif new.created_by_account_id is not null then
    if not exists(select 1 from public.accounts a where a.id=new.created_by_account_id) then raise exception 'Campus group creator account is invalid' using errcode='23514'; end if;
  elsif (select auth.uid()) is not null then
    raise exception 'Campus group creator account is required' using errcode='23514';
  end if;

  if new.advisor_character_id is not null and not exists(
    select 1 from public.characters c where c.id=new.advisor_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then raise exception 'Campus advisor must be active faculty or administration' using errcode='23514'; end if;
  return new;
end;
$$;

create or replace function private.validate_campus_event_creator()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_character_account uuid;
begin
  if tg_op='UPDATE' and (
    new.created_by_character_id is distinct from old.created_by_character_id
    or new.created_by_account_id is distinct from old.created_by_account_id
  ) then raise exception 'Campus event creator cannot be changed' using errcode='23514'; end if;
  if new.created_by_character_id is not null then
    select c.account_id into v_character_account from public.characters c where c.id=new.created_by_character_id and c.character_state='active';
    if v_character_account is null then raise exception 'Campus event creator must be an active character' using errcode='23514'; end if;
    if new.created_by_account_id is null then new.created_by_account_id := v_character_account; end if;
    if new.created_by_account_id <> v_character_account then raise exception 'Campus event creator account mismatch' using errcode='23514'; end if;
  elsif new.created_by_account_id is not null then
    if not exists(select 1 from public.accounts a where a.id=new.created_by_account_id) then raise exception 'Campus event creator account is invalid' using errcode='23514'; end if;
  elsif (select auth.uid()) is not null then raise exception 'Campus event creator account is required' using errcode='23514'; end if;
  return new;
end;
$$;

create or replace function private.validate_campus_opportunity_creator()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_character_account uuid;
begin
  if tg_op='UPDATE' and (
    new.created_by_character_id is distinct from old.created_by_character_id
    or new.created_by_account_id is distinct from old.created_by_account_id
  ) then raise exception 'Opportunity creator cannot be changed' using errcode='23514'; end if;
  if new.created_by_character_id is not null then
    select c.account_id into v_character_account from public.characters c where c.id=new.created_by_character_id and c.character_state='active';
    if v_character_account is null then raise exception 'Opportunity creator must be an active character' using errcode='23514'; end if;
    if new.created_by_account_id is null then new.created_by_account_id := v_character_account; end if;
    if new.created_by_account_id <> v_character_account then raise exception 'Opportunity creator account mismatch' using errcode='23514'; end if;
  elsif new.created_by_account_id is not null then
    if not exists(select 1 from public.accounts a where a.id=new.created_by_account_id) then raise exception 'Opportunity creator account is invalid' using errcode='23514'; end if;
  elsif (select auth.uid()) is not null then raise exception 'Opportunity creator account is required' using errcode='23514'; end if;
  return new;
end;
$$;

create or replace function private.validate_school_announcement_author()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_character_account uuid;
begin
  if tg_op='UPDATE' and (
    new.created_by_character_id is distinct from old.created_by_character_id
    or new.created_by_account_id is distinct from old.created_by_account_id
  ) then raise exception 'Announcement author cannot be changed' using errcode='23514'; end if;
  if new.created_by_character_id is not null then
    select c.account_id into v_character_account from public.characters c
    where c.id=new.created_by_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'));
    if v_character_account is null then raise exception 'Announcement author character must be an active teacher or administration character' using errcode='23514'; end if;
    if new.created_by_account_id is null then new.created_by_account_id := v_character_account; end if;
    if new.created_by_account_id <> v_character_account then raise exception 'Announcement author account mismatch' using errcode='23514'; end if;
  elsif new.created_by_account_id is not null then
    if not exists(select 1 from public.accounts a where a.id=new.created_by_account_id) then raise exception 'Announcement author account is invalid' using errcode='23514'; end if;
  elsif (select auth.uid()) is not null then raise exception 'Announcement author account is required' using errcode='23514'; end if;
  return new;
end;
$$;

-- Existing triggers retain their names and now execute the replacement functions.

drop policy if exists campus_groups_admin_insert on public.campus_groups;
create policy campus_groups_admin_insert on public.campus_groups for insert to authenticated with check (
  public.has_capability('school.configure')
  and created_by_account_id=(select auth.uid())
  and (created_by_character_id is null or created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())))
);

drop policy if exists campus_events_insert_visible on public.campus_events;
create policy campus_events_insert_visible on public.campus_events for insert to authenticated with check (
  created_by_account_id=(select auth.uid())
  and (created_by_character_id is null or created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())))
  and ((group_id is null and public.has_capability('school.configure')) or (group_id is not null and public.campus_can_manage_group(group_id)))
);

drop policy if exists campus_opportunities_admin_insert on public.campus_opportunities;
create policy campus_opportunities_admin_insert on public.campus_opportunities for insert to authenticated with check (
  public.has_capability('school.configure')
  and created_by_account_id=(select auth.uid())
  and (created_by_character_id is null or created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())))
);

drop policy if exists school_announcements_admin_insert on public.school_announcements;
create policy school_announcements_admin_insert on public.school_announcements for insert to authenticated with check (
  public.has_capability('school.configure')
  and created_by_account_id=(select auth.uid())
  and (created_by_character_id is null or created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid())))
);

drop policy if exists school_announcements_admin_update on public.school_announcements;
create policy school_announcements_admin_update on public.school_announcements for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));

-- ---------------------------------------------------------------------------
-- Private legacy claim staging. No v1 auth UUID is reused as a v2 account ID;
-- verified Discord user ID is the only automatic identity bridge.
-- ---------------------------------------------------------------------------
create table if not exists private.legacy_v1_members (
  legacy_user_id uuid primary key,
  discord_user_id text unique,
  display_name text,
  imported_at timestamptz not null default now()
);

create table if not exists private.legacy_v1_characters (
  legacy_character_id uuid primary key,
  legacy_owner_user_id uuid not null references private.legacy_v1_members(legacy_user_id) on delete cascade,
  slot_no smallint not null check (slot_no between 1 and 2),
  role text not null check (role in ('student','faculty')),
  display_name text,
  handle text,
  visibility text,
  legacy_created_at timestamptz,
  claimed_character_id uuid references public.characters(id) on delete set null,
  claimed_at timestamptz
);
create index if not exists legacy_v1_characters_owner_idx on private.legacy_v1_characters(legacy_owner_user_id,slot_no);
create unique index if not exists legacy_v1_characters_claimed_uidx on private.legacy_v1_characters(claimed_character_id) where claimed_character_id is not null;

create table if not exists private.legacy_v1_section_memberships (
  legacy_section_id uuid not null,
  legacy_character_id uuid not null references private.legacy_v1_characters(legacy_character_id) on delete cascade,
  relationship text not null check (relationship in ('student','instructor')),
  joined_at timestamptz,
  primary key (legacy_section_id, legacy_character_id, relationship)
);

create table if not exists private.legacy_v1_group_memberships (
  legacy_group_id uuid not null,
  legacy_character_id uuid not null references private.legacy_v1_characters(legacy_character_id) on delete cascade,
  member_role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz,
  primary key (legacy_group_id, legacy_character_id)
);

create table if not exists private.legacy_v1_homeroom_memberships (
  legacy_homeroom_id uuid not null,
  legacy_character_id uuid not null references private.legacy_v1_characters(legacy_character_id) on delete cascade,
  student_year smallint not null default 1 check (student_year in (1,2)),
  joined_at timestamptz,
  primary key (legacy_homeroom_id, legacy_character_id)
);

revoke all on private.legacy_v1_members, private.legacy_v1_characters, private.legacy_v1_section_memberships, private.legacy_v1_group_memberships, private.legacy_v1_homeroom_memberships from public, anon, authenticated;

create or replace function private.apply_legacy_v1_memberships(p_legacy_character_id uuid, p_character_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.academic_section_staff(section_id,character_id,staff_role,assigned_at)
  select s.id,p_character_id,'teacher',coalesce(lm.joined_at,now())
  from private.legacy_v1_section_memberships lm
  join public.academic_sections s on s.legacy_source_id=lm.legacy_section_id
  where lm.legacy_character_id=p_legacy_character_id and lm.relationship='instructor'
  on conflict(section_id,character_id) do nothing;

  insert into public.academic_enrollments(section_id,student_character_id,status,enrolled_at,updated_at)
  select s.id,p_character_id,'active',coalesce(lm.joined_at,now()),now()
  from private.legacy_v1_section_memberships lm
  join public.academic_sections s on s.legacy_source_id=lm.legacy_section_id
  where lm.legacy_character_id=p_legacy_character_id and lm.relationship='student'
  on conflict(section_id,student_character_id) do update set status='active',updated_at=now();

  insert into public.campus_group_members(group_id,character_id,member_role,status,joined_at,updated_at)
  select g.id,p_character_id,
    case when lg.member_role in ('member','officer','president','advisor') then lg.member_role else 'member' end,
    'active',coalesce(lg.joined_at,now()),now()
  from private.legacy_v1_group_memberships lg
  join public.campus_groups g on g.legacy_source_id=lg.legacy_group_id
  where lg.legacy_character_id=p_legacy_character_id
  on conflict(group_id,character_id) do update set status='active',updated_at=now();

  insert into public.homeroom_memberships(homeroom_id,student_character_id,student_year,joined_at,updated_at)
  select h.id,p_character_id,lh.student_year,coalesce(lh.joined_at,now()),now()
  from private.legacy_v1_homeroom_memberships lh
  join public.school_homerooms h on h.legacy_source_id=lh.legacy_homeroom_id
  where lh.legacy_character_id=p_legacy_character_id
  on conflict(student_character_id) do update set homeroom_id=excluded.homeroom_id,student_year=excluded.student_year,updated_at=now();
end;
$$;
revoke all on function private.apply_legacy_v1_memberships(uuid,uuid) from public,anon,authenticated;

create or replace function private.claim_legacy_v1_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_discord_id text;
  v_legacy_user_id uuid;
  r record;
  v_character_id uuid;
  v_new_handle text;
begin
  select a.discord_user_id into v_discord_id from public.accounts a where a.id=p_account_id;
  if v_discord_id is null or btrim(v_discord_id)='' then return; end if;
  select m.legacy_user_id into v_legacy_user_id from private.legacy_v1_members m where m.discord_user_id=v_discord_id;
  if v_legacy_user_id is null then return; end if;

  for r in
    select * from private.legacy_v1_characters c
    where c.legacy_owner_user_id=v_legacy_user_id
    order by c.slot_no
  loop
    select c.id into v_character_id from public.characters c where c.account_id=p_account_id and c.slot_no=r.slot_no;
    if v_character_id is null then
      v_new_handle := null;
      if r.handle is not null and btrim(r.handle)<>'' and not exists(select 1 from public.characters c where c.handle=r.handle) then v_new_handle:=r.handle; end if;
      insert into public.characters(
        account_id,slot_no,handle,display_name,character_kind,character_state,school_role,created_at,updated_at
      ) values (
        p_account_id,r.slot_no,v_new_handle,r.display_name,
        case when r.role='faculty' then 'faculty' else 'student' end,
        'active',case when r.role='faculty' then 'faculty' else 'student' end,
        coalesce(r.legacy_created_at,now()),now()
      ) returning id into v_character_id;
    else
      update public.characters c
      set handle = case
        when c.handle is null and r.handle is not null and btrim(r.handle)<>''
          and not exists(select 1 from public.characters other where other.handle=r.handle and other.id<>c.id)
        then r.handle else c.handle end,
        updated_at=now()
      where c.id=v_character_id;
    end if;

    update private.legacy_v1_characters
    set claimed_character_id=v_character_id,claimed_at=now()
    where legacy_character_id=r.legacy_character_id;
    perform private.apply_legacy_v1_memberships(r.legacy_character_id,v_character_id);
  end loop;

  if (select active_character_id from public.accounts where id=p_account_id) is null then
    update public.accounts a set active_character_id=(select c.id from public.characters c where c.account_id=p_account_id and c.character_state='active' order by c.slot_no limit 1),updated_at=now() where a.id=p_account_id;
  end if;
end;
$$;
revoke all on function private.claim_legacy_v1_account(uuid) from public,anon,authenticated;

create or replace function private.claim_legacy_v1_account_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.discord_user_id is not null and (tg_op='INSERT' or new.discord_user_id is distinct from old.discord_user_id) then
    perform private.claim_legacy_v1_account(new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.claim_legacy_v1_account_trigger() from public,anon,authenticated;
drop trigger if exists accounts_claim_legacy_v1 on public.accounts;
create trigger accounts_claim_legacy_v1 after insert or update of discord_user_id on public.accounts for each row execute function private.claim_legacy_v1_account_trigger();

comment on table public.school_homerooms is 'First-class Hanami homerooms. Membership is explicitly assigned, not inferred from class enrollment.';
comment on table private.legacy_v1_members is 'Private v1 identity staging keyed to verified Discord user ID; old auth UUIDs are never reused as v2 account IDs.';
