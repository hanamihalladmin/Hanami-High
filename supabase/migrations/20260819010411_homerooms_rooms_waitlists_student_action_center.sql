create table if not exists public.homerooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 2 and 20),
  grade_level smallint not null check (grade_level between 1 and 4),
  school_year text not null default '2006-2007',
  adviser_character_id uuid references public.characters(id) on delete set null,
  room_label text,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homeroom_memberships (
  homeroom_id uuid not null references public.homerooms(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (homeroom_id, student_character_id),
  unique (student_character_id)
);

create table if not exists public.homeroom_representatives (
  homeroom_id uuid not null references public.homerooms(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  title text not null default 'Class Representative' check (char_length(title) between 2 and 80),
  created_at timestamptz not null default now(),
  primary key (homeroom_id, student_character_id)
);

create table if not exists public.homeroom_notices (
  id uuid primary key default gen_random_uuid(),
  homeroom_id uuid not null references public.homerooms(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  body text not null check (char_length(body) between 2 and 4000),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.homeroom_events (
  id uuid primary key default gen_random_uuid(),
  homeroom_id uuid not null references public.homerooms(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '',
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.school_rooms (
  id uuid primary key default gen_random_uuid(),
  room_number text not null unique check (char_length(room_number) between 1 and 40),
  building text not null check (char_length(building) between 1 and 100),
  floor_label text not null check (char_length(floor_label) between 1 and 40),
  purpose text not null check (char_length(purpose) between 2 and 180),
  department text,
  availability_status text not null default 'available' check (availability_status in ('available','occupied','reserved','closed','maintenance')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_sections add column if not exists room_id uuid references public.school_rooms(id) on delete set null;

create table if not exists public.section_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  position bigint generated always as identity,
  status text not null default 'waiting' check (status in ('waiting','offered','enrolled','declined','removed')),
  offered_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_id,student_character_id)
);

create table if not exists public.academic_alerts (
  id uuid primary key default gen_random_uuid(),
  student_character_id uuid not null references public.characters(id) on delete cascade,
  alert_type text not null check (alert_type in ('low_attendance','missing_assignment','approaching_deadline','failing_grade','graduation_requirement','general')),
  severity text not null default 'info' check (severity in ('info','warning','urgent')),
  title text not null check (char_length(title) between 2 and 160),
  body text not null check (char_length(body) between 2 and 3000),
  source_type text,
  source_id text,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.homerooms enable row level security;
alter table public.homeroom_memberships enable row level security;
alter table public.homeroom_representatives enable row level security;
alter table public.homeroom_notices enable row level security;
alter table public.homeroom_events enable row level security;
alter table public.school_rooms enable row level security;
alter table public.section_waitlist_entries enable row level security;
alter table public.academic_alerts enable row level security;

create or replace function private.can_manage_school_operations(target_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public,private,auth as $$
  select private.account_has_permission(target_user,'site_admin') or private.account_has_permission(target_user,'content_editor');
$$;
revoke all on function private.can_manage_school_operations(uuid) from public,anon;
grant execute on function private.can_manage_school_operations(uuid) to authenticated;

create policy "authenticated read active homerooms" on public.homerooms for select to authenticated using (is_active or private.can_manage_school_operations(auth.uid()));
create policy "operations manage homerooms" on public.homerooms for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "operations manage homeroom memberships" on public.homeroom_memberships for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "operations manage homeroom reps" on public.homeroom_representatives for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "operations manage homeroom notices" on public.homeroom_notices for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "operations manage homeroom events" on public.homeroom_events for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read rooms" on public.school_rooms for select to authenticated using (true);
create policy "operations manage rooms" on public.school_rooms for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));

create policy "students read own waitlist" on public.section_waitlist_entries for select to authenticated using (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid()));
create policy "students join own waitlist" on public.section_waitlist_entries for insert to authenticated with check (
  status='waiting' and exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student')
);
create policy "operations manage waitlists" on public.section_waitlist_entries for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));

create policy "students read own academic alerts" on public.academic_alerts for select to authenticated using (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid()));
create policy "operations manage academic alerts" on public.academic_alerts for all to authenticated using (private.can_manage_school_operations(auth.uid()) or private.account_has_permission(auth.uid(),'site_admin')) with check (private.can_manage_school_operations(auth.uid()) or private.account_has_permission(auth.uid(),'site_admin'));

revoke all on public.homeroom_memberships, public.homeroom_representatives, public.homeroom_notices, public.homeroom_events, public.section_waitlist_entries, public.academic_alerts from anon;
grant select,insert,update,delete on public.homerooms, public.homeroom_memberships, public.homeroom_representatives, public.homeroom_notices, public.homeroom_events, public.school_rooms, public.section_waitlist_entries, public.academic_alerts to authenticated;
grant usage,select on sequence public.section_waitlist_entries_position_seq to authenticated;

create or replace function public.current_homeroom(target_character_id uuid)
returns table(homeroom_id uuid,code text,grade_level smallint,school_year text,room_label text,description text,adviser_name text,adviser_handle text)
language sql stable security definer set search_path=public,private,auth as $$
  select h.id,h.code,h.grade_level,h.school_year,h.room_label,h.description,a.display_name,a.handle
  from public.homeroom_memberships hm
  join public.characters self on self.id=hm.student_character_id and self.owner_user_id=auth.uid()
  join public.homerooms h on h.id=hm.homeroom_id
  left join public.characters a on a.id=h.adviser_character_id
  where hm.student_character_id=target_character_id and h.is_active;
$$;
revoke all on function public.current_homeroom(uuid) from public,anon;
grant execute on function public.current_homeroom(uuid) to authenticated;

create or replace function public.current_homeroom_roster(target_character_id uuid)
returns table(character_id uuid,display_name text,handle text,is_representative boolean,representative_title text)
language plpgsql stable security definer set search_path=public,private,auth as $$
declare hid uuid;
begin
  select hm.homeroom_id into hid from public.homeroom_memberships hm join public.characters c on c.id=hm.student_character_id where hm.student_character_id=target_character_id and c.owner_user_id=auth.uid();
  if hid is null then return; end if;
  return query
  select c.id,c.display_name,c.handle,(hr.student_character_id is not null),hr.title
  from public.homeroom_memberships hm
  join public.characters c on c.id=hm.student_character_id
  left join public.homeroom_representatives hr on hr.homeroom_id=hm.homeroom_id and hr.student_character_id=hm.student_character_id
  where hm.homeroom_id=hid
  order by c.display_name;
end;$$;
revoke all on function public.current_homeroom_roster(uuid) from public,anon;
grant execute on function public.current_homeroom_roster(uuid) to authenticated;

create or replace function public.current_homeroom_feed(target_character_id uuid)
returns table(item_type text,item_id uuid,title text,body text,starts_at timestamptz,published_at timestamptz,location text)
language plpgsql stable security definer set search_path=public,private,auth as $$
declare hid uuid;
begin
  select hm.homeroom_id into hid from public.homeroom_memberships hm join public.characters c on c.id=hm.student_character_id where hm.student_character_id=target_character_id and c.owner_user_id=auth.uid();
  if hid is null then return; end if;
  return query
  select 'notice'::text,n.id,n.title,n.body,null::timestamptz,n.published_at,null::text from public.homeroom_notices n where n.homeroom_id=hid and (n.expires_at is null or n.expires_at>now())
  union all
  select 'event'::text,e.id,e.title,e.description,e.starts_at,e.created_at,e.location from public.homeroom_events e where e.homeroom_id=hid and e.starts_at>now()-interval '1 day'
  order by coalesce(starts_at,published_at) desc;
end;$$;
revoke all on function public.current_homeroom_feed(uuid) from public,anon;
grant execute on function public.current_homeroom_feed(uuid) to authenticated;

create or replace function public.student_todo_feed(target_character_id uuid)
returns table(item_type text,title text,due_at timestamptz,priority text,source_id text)
language plpgsql stable security definer set search_path=public,private,auth as $$
begin
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid() and c.role='student') then return; end if;
  return query
  select 'assignment'::text,a.title,a.due_at,case when a.due_at<now() then 'urgent' when a.due_at<now()+interval '1 day' then 'high' else 'normal' end,a.id::text
  from public.course_assignments a join public.section_memberships sm on sm.section_id=a.section_id and sm.character_id=target_character_id and sm.relationship='student'
  left join public.assignment_submissions s on s.assignment_id=a.id and s.student_character_id=target_character_id
  where a.status='published' and a.due_at is not null and (s.id is null or s.status in ('draft','returned')) and a.due_at<now()+interval '7 days'
  union all
  select 'office_response'::text,'School Office response needed'::text,r.updated_at,'high'::text,r.id::text from public.school_office_requests r where r.character_id=target_character_id and r.status='waiting_on_member'
  union all
  select 'academic_alert'::text,aa.title,aa.created_at,case when aa.severity='urgent' then 'urgent' when aa.severity='warning' then 'high' else 'normal' end,aa.id::text from public.academic_alerts aa where aa.student_character_id=target_character_id and not aa.is_resolved
  order by due_at nulls last;
end;$$;
revoke all on function public.student_todo_feed(uuid) from public,anon;
grant execute on function public.student_todo_feed(uuid) to authenticated;

create or replace function public.current_waitlist(target_character_id uuid)
returns table(entry_id uuid,section_id uuid,section_code text,course_title text,waitlist_position bigint,entry_status text,created_at timestamptz)
language sql stable security definer set search_path=public,private,auth as $$
  select w.id,w.section_id,s.section_code,c.title,w.position,w.status,w.created_at
  from public.section_waitlist_entries w
  join public.characters ch on ch.id=w.student_character_id and ch.owner_user_id=auth.uid()
  join public.class_sections s on s.id=w.section_id
  join public.academic_courses c on c.id=s.course_id
  where w.student_character_id=target_character_id
  order by w.created_at;
$$;
revoke all on function public.current_waitlist(uuid) from public,anon;
grant execute on function public.current_waitlist(uuid) to authenticated;
