create table if not exists public.counseling_appointments (
  id uuid primary key default gen_random_uuid(),
  student_character_id uuid not null references public.characters(id) on delete cascade,
  request_type text not null check (request_type in ('academic_advising','career_planning','schedule_issue','general_support')),
  requested_at timestamptz,
  status text not null default 'requested' check (status in ('requested','scheduled','completed','cancelled')),
  counselor_name text,
  appointment_at timestamptz,
  location text,
  student_note text not null default '' check (char_length(student_note)<=3000),
  staff_note text not null default '' check (char_length(staff_note)<=3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_office_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  body text not null check (char_length(body) between 2 and 4000),
  office_hours text,
  published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_office_visits (
  id uuid primary key default gen_random_uuid(),
  student_character_id uuid not null references public.characters(id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 1200),
  requested_for timestamptz,
  status text not null default 'requested' check (status in ('requested','scheduled','seen','cancelled')),
  staff_response text not null default '' check (char_length(staff_response)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_profiles (
  activity_id uuid primary key references public.campus_activities(id) on delete cascade,
  adviser_character_id uuid references public.characters(id) on delete set null,
  recruitment_status text not null default 'open' check (recruitment_status in ('open','closed','invite_only')),
  application_required boolean not null default false,
  banner_image_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_officers (
  activity_id uuid not null references public.campus_activities(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  created_at timestamptz not null default now(),
  primary key(activity_id,character_id)
);

create table if not exists public.organization_announcements (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.campus_activities(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  body text not null check (char_length(body) between 2 and 4000),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.organization_photos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.campus_activities(id) on delete cascade,
  storage_path text not null,
  caption text not null default '' check (char_length(caption)<=300),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.campus_activities(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  statement text not null check (char_length(statement) between 5 and 3000),
  status text not null default 'submitted' check (status in ('submitted','under_review','accepted','declined','withdrawn')),
  staff_response text not null default '' check (char_length(staff_response)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id,student_character_id)
);

create table if not exists public.school_elections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  school_year text not null default '2006-2007',
  status text not null default 'draft' check (status in ('draft','nominations','voting','closed','archived')),
  nominations_open_at timestamptz,
  nominations_close_at timestamptz,
  voting_open_at timestamptz,
  voting_close_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.election_positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.school_elections(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  description text not null default '',
  max_winners smallint not null default 1 check (max_winners between 1 and 10),
  eligibility_note text not null default '',
  sort_order smallint not null default 0
);

create table if not exists public.election_nominations (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.election_positions(id) on delete cascade,
  candidate_character_id uuid not null references public.characters(id) on delete cascade,
  statement text not null check (char_length(statement) between 5 and 3000),
  status text not null default 'submitted' check (status in ('submitted','approved','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique(position_id,candidate_character_id)
);

create table if not exists public.election_ballots (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.election_positions(id) on delete cascade,
  voter_character_id uuid not null references public.characters(id) on delete cascade,
  nomination_id uuid not null references public.election_nominations(id) on delete cascade,
  cast_at timestamptz not null default now(),
  unique(position_id,voter_character_id)
);

alter table public.school_calendar_events add column if not exists registration_open boolean not null default false;
alter table public.school_calendar_events add column if not exists registration_capacity integer check (registration_capacity is null or registration_capacity>0);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.school_calendar_events(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','waitlisted','cancelled')),
  waitlist_position bigint generated always as identity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,character_id)
);

create or replace function private.assign_event_registration_status() returns trigger
language plpgsql security definer set search_path=public,private,auth as $$
declare cap integer; current_count integer; is_open boolean;
begin
  select registration_capacity,registration_open into cap,is_open from public.school_calendar_events where id=new.event_id;
  if not coalesce(is_open,false) then raise exception 'Registration is closed for this event'; end if;
  if cap is null then new.status='registered'; return new; end if;
  select count(*) into current_count from public.event_registrations where event_id=new.event_id and status='registered';
  new.status=case when current_count<cap then 'registered' else 'waitlisted' end;
  return new;
end;$$;
create trigger trg_assign_event_registration_status before insert on public.event_registrations for each row execute function private.assign_event_registration_status();

create table if not exists public.student_conduct_cases (
  id uuid primary key default gen_random_uuid(),
  student_character_id uuid not null references public.characters(id) on delete cascade,
  case_type text not null check (case_type in ('warning','incident','detention','other')),
  title text not null check (char_length(title) between 2 and 160),
  details text not null check (char_length(details) between 2 and 5000),
  resolution text not null default '' check (char_length(resolution)<=4000),
  status text not null default 'open' check (status in ('open','under_review','resolved','dismissed')),
  detention_at timestamptz,
  appeal_status text not null default 'none' check (appeal_status in ('none','requested','under_review','granted','denied')),
  private_notes text not null default '' check (char_length(private_notes)<=5000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  sport text not null check (char_length(sport) between 2 and 80),
  season text not null default '2006-2007',
  coach_character_id uuid references public.characters(id) on delete set null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports_team_roster (
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  position text,
  jersey_number text,
  roster_status text not null default 'active' check (roster_status in ('active','reserve','inactive')),
  joined_at timestamptz not null default now(),
  primary key(team_id,student_character_id)
);

create table if not exists public.sports_practices (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  note text not null default '',
  check (ends_at is null or ends_at>starts_at)
);

create table if not exists public.sports_fixtures (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  opponent text not null check (char_length(opponent) between 2 and 120),
  starts_at timestamptz not null,
  location text,
  home_away text not null default 'home' check (home_away in ('home','away','neutral')),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','postponed')),
  hanami_score integer,
  opponent_score integer,
  result_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.athletics_eligibility (
  student_character_id uuid primary key references public.characters(id) on delete cascade,
  eligible boolean not null default true,
  academic_status text not null default 'clear' check (academic_status in ('clear','warning','ineligible')),
  attendance_status text not null default 'clear' check (attendance_status in ('clear','warning','ineligible')),
  note text not null default '' check (char_length(note)<=3000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_character_id uuid references public.characters(id) on delete set null,
  category text not null default 'general' check (category in ('bug','account','portal','content','safety','general')),
  subject text not null check (char_length(subject) between 2 and 180),
  body text not null check (char_length(body) between 5 and 5000),
  status text not null default 'open' check (status in ('open','assigned','waiting_on_requester','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  tags text[] not null default '{}',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  is_staff_reply boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.counseling_appointments enable row level security;
alter table public.health_office_notices enable row level security;
alter table public.health_office_visits enable row level security;
alter table public.organization_profiles enable row level security;
alter table public.organization_officers enable row level security;
alter table public.organization_announcements enable row level security;
alter table public.organization_photos enable row level security;
alter table public.organization_applications enable row level security;
alter table public.school_elections enable row level security;
alter table public.election_positions enable row level security;
alter table public.election_nominations enable row level security;
alter table public.election_ballots enable row level security;
alter table public.event_registrations enable row level security;
alter table public.student_conduct_cases enable row level security;
alter table public.sports_teams enable row level security;
alter table public.sports_team_roster enable row level security;
alter table public.sports_practices enable row level security;
alter table public.sports_fixtures enable row level security;
alter table public.athletics_eligibility enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

create policy "students manage own counseling" on public.counseling_appointments for all to authenticated using (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())) with check (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student'));
create policy "operations manage counseling" on public.counseling_appointments for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read health notices" on public.health_office_notices for select to authenticated using (published or private.account_has_permission(auth.uid(),'site_admin'));
create policy "site admin manage health notices" on public.health_office_notices for all to authenticated using (private.account_has_permission(auth.uid(),'site_admin')) with check (private.account_has_permission(auth.uid(),'site_admin'));
create policy "students manage own health visits" on public.health_office_visits for all to authenticated using (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())) with check (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student'));
create policy "site admin manage health visits" on public.health_office_visits for all to authenticated using (private.account_has_permission(auth.uid(),'site_admin')) with check (private.account_has_permission(auth.uid(),'site_admin'));

create policy "authenticated read organization profiles" on public.organization_profiles for select to authenticated using (true);
create policy "operations manage organization profiles" on public.organization_profiles for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read organization officers" on public.organization_officers for select to authenticated using (true);
create policy "operations manage organization officers" on public.organization_officers for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read organization announcements" on public.organization_announcements for select to authenticated using (true);
create policy "operations manage organization announcements" on public.organization_announcements for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read organization photos" on public.organization_photos for select to authenticated using (true);
create policy "operations manage organization photos" on public.organization_photos for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "students manage own organization applications" on public.organization_applications for all to authenticated using (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid())) with check (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid() and c.role='student'));
create policy "operations manage organization applications" on public.organization_applications for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));

create policy "authenticated read live elections" on public.school_elections for select to authenticated using (status<>'draft' or private.can_manage_school_operations(auth.uid()));
create policy "operations manage elections" on public.school_elections for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read election positions" on public.election_positions for select to authenticated using (exists(select 1 from public.school_elections e where e.id=election_id and (e.status<>'draft' or private.can_manage_school_operations(auth.uid()))));
create policy "operations manage election positions" on public.election_positions for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read approved nominations" on public.election_nominations for select to authenticated using (status='approved' or exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid()) or private.can_manage_school_operations(auth.uid()));
create policy "students nominate own character" on public.election_nominations for insert to authenticated with check (status='submitted' and exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid() and c.role='student'));
create policy "operations manage nominations" on public.election_nominations for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "voters read own ballots" on public.election_ballots for select to authenticated using (exists(select 1 from public.characters c where c.id=voter_character_id and c.owner_user_id=auth.uid()));
create policy "students cast own ballots" on public.election_ballots for insert to authenticated with check (exists(select 1 from public.characters c where c.id=voter_character_id and c.owner_user_id=auth.uid() and c.role='student') and exists(select 1 from public.election_nominations n join public.election_positions p on p.id=n.position_id join public.school_elections e on e.id=p.election_id where n.id=nomination_id and n.position_id=position_id and n.status='approved' and e.status='voting' and (e.voting_open_at is null or e.voting_open_at<=now()) and (e.voting_close_at is null or e.voting_close_at>=now())));
create policy "operations read ballots" on public.election_ballots for select to authenticated using (private.can_manage_school_operations(auth.uid()));

create policy "members manage own event registration" on public.event_registrations for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=auth.uid()));
create policy "members register own character" on public.event_registrations for insert to authenticated with check (exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=auth.uid()));
create policy "members cancel own event registration" on public.event_registrations for update to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=auth.uid())) with check (status='cancelled' and exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=auth.uid()));
create policy "operations manage event registrations" on public.event_registrations for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));

create policy "moderators manage conduct cases" on public.student_conduct_cases for all to authenticated using (private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator')) with check (private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator'));

create policy "authenticated read sports teams" on public.sports_teams for select to authenticated using (is_active or private.can_manage_school_operations(auth.uid()));
create policy "operations manage sports teams" on public.sports_teams for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read sports roster" on public.sports_team_roster for select to authenticated using (true);
create policy "operations manage sports roster" on public.sports_team_roster for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read sports practices" on public.sports_practices for select to authenticated using (true);
create policy "operations manage sports practices" on public.sports_practices for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "authenticated read sports fixtures" on public.sports_fixtures for select to authenticated using (true);
create policy "operations manage sports fixtures" on public.sports_fixtures for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));
create policy "students read own athletics eligibility" on public.athletics_eligibility for select to authenticated using (exists(select 1 from public.characters c where c.id=student_character_id and c.owner_user_id=auth.uid()));
create policy "operations manage athletics eligibility" on public.athletics_eligibility for all to authenticated using (private.can_manage_school_operations(auth.uid())) with check (private.can_manage_school_operations(auth.uid()));

create policy "requesters read own support tickets" on public.support_tickets for select to authenticated using (requester_user_id=auth.uid() or private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator'));
create policy "requesters create support tickets" on public.support_tickets for insert to authenticated with check (requester_user_id=auth.uid() and status='open');
create policy "staff manage support tickets" on public.support_tickets for update to authenticated using (private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator')) with check (private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator'));
create policy "participants read ticket messages" on public.support_ticket_messages for select to authenticated using (exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.requester_user_id=auth.uid() or private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator'))));
create policy "participants write ticket messages" on public.support_ticket_messages for insert to authenticated with check (author_user_id=auth.uid() and exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.requester_user_id=auth.uid() or private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator'))));

grant select,insert,update,delete on public.counseling_appointments,public.health_office_notices,public.health_office_visits,public.organization_profiles,public.organization_officers,public.organization_announcements,public.organization_photos,public.organization_applications,public.school_elections,public.election_positions,public.election_nominations,public.election_ballots,public.event_registrations,public.student_conduct_cases,public.sports_teams,public.sports_team_roster,public.sports_practices,public.sports_fixtures,public.athletics_eligibility,public.support_tickets,public.support_ticket_messages to authenticated;
revoke all on public.health_office_visits,public.student_conduct_cases,public.athletics_eligibility,public.support_tickets,public.support_ticket_messages from anon;
grant usage,select on sequence public.event_registrations_waitlist_position_seq to authenticated;

create or replace function public.school_statistics_dashboard()
returns table(student_characters bigint,faculty_characters bigint,active_characters bigint,course_enrollments bigint,organization_memberships bigint,open_reports bigint,open_office_requests bigint,open_support_tickets bigint)
language plpgsql stable security definer set search_path=public,private,auth as $$
begin
  if not (private.account_has_permission(auth.uid(),'site_admin') or private.account_has_permission(auth.uid(),'moderator')) then raise exception 'Not authorized'; end if;
  return query select
    (select count(*) from public.characters where role='student'),
    (select count(*) from public.characters where role='faculty'),
    (select count(*) from public.characters where is_active),
    (select count(*) from public.section_memberships where relationship='student'),
    (select count(*) from public.campus_activity_memberships where status='active'),
    (select count(*) from public.character_reports where status in ('submitted','reviewing')),
    (select count(*) from public.school_office_requests where status not in ('resolved','closed')),
    (select count(*) from public.support_tickets where status not in ('resolved','closed'));
end;$$;
revoke all on function public.school_statistics_dashboard() from public,anon;
grant execute on function public.school_statistics_dashboard() to authenticated;

create or replace function public.election_results(target_election_id uuid)
returns table(position_title text,candidate_name text,candidate_handle text,votes bigint)
language plpgsql stable security definer set search_path=public,private,auth as $$
begin
  if not exists(select 1 from public.school_elections e where e.id=target_election_id and (e.status in ('closed','archived') or private.can_manage_school_operations(auth.uid()))) then return; end if;
  return query select p.title,c.display_name,c.handle,count(b.id)
  from public.election_positions p join public.election_nominations n on n.position_id=p.id and n.status='approved'
  join public.characters c on c.id=n.candidate_character_id left join public.election_ballots b on b.nomination_id=n.id
  where p.election_id=target_election_id group by p.id,p.title,n.id,c.display_name,c.handle order by p.sort_order,count(b.id) desc,c.display_name;
end;$$;
revoke all on function public.election_results(uuid) from public,anon;
grant execute on function public.election_results(uuid) to authenticated;
