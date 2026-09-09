-- Hanami High V2 full portal expansion
-- Guest view, student/faculty/admin/owner/moderator tools, campus-life utilities,
-- social extras, Passport, Chronicle, Yearbook, bookmarks/recent views, and Help Center.

create table if not exists public.student_planner_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  details text not null default '',
  item_kind text not null default 'task' check (item_kind in ('task','assignment','test','project','club','event','reminder')),
  due_school_date date,
  due_time time,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_planner_character_due_idx on public.student_planner_items(character_id,due_school_date,completed);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_character_id uuid not null references public.characters(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  description text not null default '',
  subject text not null default '',
  visibility text not null default 'private' check (visibility in ('private','friends','invite')),
  next_session_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key(group_id,character_id)
);

create table if not exists public.school_mail_messages (
  id uuid primary key default gen_random_uuid(),
  sender_account_id uuid references public.accounts(id) on delete set null,
  sender_character_id uuid references public.characters(id) on delete set null,
  recipient_account_id uuid references public.accounts(id) on delete cascade,
  recipient_character_id uuid references public.characters(id) on delete cascade,
  audience text not null default 'direct' check (audience in ('direct','students','faculty','homeroom','school')),
  category text not null default 'school' check (category in ('school','academic','faculty','homeroom','club','system')),
  subject text not null check (char_length(subject) between 1 and 180),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists school_mail_recipient_idx on public.school_mail_messages(recipient_account_id,recipient_character_id,created_at desc);

create table if not exists public.faculty_office_hours (
  id uuid primary key default gen_random_uuid(),
  faculty_character_id uuid not null references public.characters(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  starts_at time not null,
  ends_at time not null,
  location text not null default 'Faculty Office',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.faculty_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  faculty_character_id uuid not null references public.characters(id) on delete cascade,
  section_id uuid references public.academic_sections(id) on delete cascade,
  school_date date not null,
  title text not null check (char_length(title) between 1 and 180),
  objectives text not null default '',
  materials text not null default '',
  lesson_notes text not null default '',
  homework text not null default '',
  private_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faculty_assignment_templates (
  id uuid primary key default gen_random_uuid(),
  faculty_character_id uuid not null references public.characters(id) on delete cascade,
  template_kind text not null check (template_kind in ('homework','quiz','exam','essay','project','presentation','participation','lab')),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  default_points numeric(8,2),
  late_policy text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_seating_assignments (
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  assigned_by_character_id uuid not null references public.characters(id) on delete cascade,
  seat_x smallint not null check (seat_x between 0 and 20),
  seat_y smallint not null check (seat_y between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key(section_id,student_character_id)
);

create table if not exists public.school_feature_flags (
  flag_key text primary key,
  label text not null,
  description text not null default '',
  enabled boolean not null default true,
  updated_by_account_id uuid references public.accounts(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.seasonal_event_configs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  starts_school_date date not null,
  ends_school_date date not null,
  state text not null default 'draft' check (state in ('draft','scheduled','active','ended')),
  homepage_theme text,
  boutique_collection text,
  announcement_id uuid references public.school_announcements(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_by_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_school_date >= starts_school_date)
);

create table if not exists public.global_bookmarks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  resource_type text not null check (resource_type in ('profile','post','assignment','club','event','boutique','creator','page','help')),
  resource_id text not null,
  label text not null default '',
  route_hash text not null,
  created_at timestamptz not null default now(),
  unique(account_id,resource_type,resource_id)
);

create table if not exists public.recent_views (
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  label text not null default '',
  route_hash text not null,
  viewed_at timestamptz not null default now(),
  primary key(account_id,resource_type,resource_id)
);

create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  summary text not null default '',
  body text not null,
  audience text[] not null default array['all']::text[],
  published boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.character_passport_stamps (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  stamp_key text not null,
  title text not null,
  description text not null default '',
  school_date date,
  icon text not null default '✦',
  category text not null default 'milestone' check (category in ('enrollment','academic','club','social','event','achievement','hanami_plus','milestone')),
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(character_id,stamp_key)
);

create table if not exists public.character_memories (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  title text not null,
  body text not null default '',
  memory_school_date date,
  visibility text not null default 'private' check (visibility in ('private','friends','public')),
  created_at timestamptz not null default now()
);

create table if not exists public.chronicle_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  dek text not null default '',
  body text not null,
  category text not null default 'campus',
  author_character_id uuid references public.characters(id) on delete set null,
  state text not null default 'draft' check (state in ('draft','review','published','archived')),
  published_school_date date,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.yearbook_entries (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  school_year smallint not null default 2006,
  quote text not null default '',
  activities text[] not null default '{}'::text[],
  memory text not null default '',
  photo_path text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,school_year)
);

create table if not exists public.campus_lost_found (
  id uuid primary key default gen_random_uuid(),
  created_by_character_id uuid references public.characters(id) on delete set null,
  item_name text not null,
  description text not null default '',
  location text not null default '',
  school_date date,
  status text not null default 'lost' check (status in ('lost','found','returned')),
  created_at timestamptz not null default now()
);

create table if not exists public.campus_suggestions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  category text not null default 'campus',
  subject text not null,
  body text not null,
  anonymous_to_community boolean not null default true,
  state text not null default 'submitted' check (state in ('submitted','reviewing','planned','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.school_radio_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  show_name text not null default 'Hanami Radio',
  host_character_id uuid references public.characters(id) on delete set null,
  school_date date,
  starts_at time,
  state text not null default 'published' check (state in ('draft','published','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.photo_booth_cards (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  image_path text,
  frame_style text not null default 'sakura',
  sticker_payload jsonb not null default '[]'::jsonb,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.character_status_history (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  status_text text not null check (char_length(status_text) between 1 and 140),
  mood text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.social_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  sort_order smallint not null default 0
);
create table if not exists public.social_poll_votes (
  option_id uuid not null references public.social_poll_options(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(option_id,account_id)
);
create table if not exists public.social_post_reposts (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  comment text not null default '',
  created_at timestamptz not null default now(),
  primary key(post_id,account_id)
);

-- RLS
alter table public.student_planner_items enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.school_mail_messages enable row level security;
alter table public.faculty_office_hours enable row level security;
alter table public.faculty_lesson_plans enable row level security;
alter table public.faculty_assignment_templates enable row level security;
alter table public.class_seating_assignments enable row level security;
alter table public.school_feature_flags enable row level security;
alter table public.seasonal_event_configs enable row level security;
alter table public.global_bookmarks enable row level security;
alter table public.recent_views enable row level security;
alter table public.help_articles enable row level security;
alter table public.character_passport_stamps enable row level security;
alter table public.character_memories enable row level security;
alter table public.chronicle_articles enable row level security;
alter table public.yearbook_entries enable row level security;
alter table public.campus_lost_found enable row level security;
alter table public.campus_suggestions enable row level security;
alter table public.school_radio_posts enable row level security;
alter table public.photo_booth_cards enable row level security;
alter table public.character_status_history enable row level security;
alter table public.social_poll_options enable row level security;
alter table public.social_poll_votes enable row level security;
alter table public.social_post_reposts enable row level security;

-- Personal data policies.
create policy student_planner_own on public.student_planner_items for all to authenticated using (account_id=auth.uid()) with check (account_id=auth.uid() and exists(select 1 from public.characters c where c.id=character_id and c.account_id=auth.uid()));
create policy study_groups_member_read on public.study_groups for select to authenticated using (owner_character_id in (select id from public.characters where account_id=auth.uid()) or exists(select 1 from public.study_group_members m where m.group_id=id and m.character_id in (select id from public.characters where account_id=auth.uid())));
create policy study_groups_owner_write on public.study_groups for all to authenticated using (owner_character_id in (select id from public.characters where account_id=auth.uid())) with check (owner_character_id in (select id from public.characters where account_id=auth.uid()));
create policy study_group_members_member_read on public.study_group_members for select to authenticated using (character_id in (select id from public.characters where account_id=auth.uid()) or group_id in (select id from public.study_groups where owner_character_id in (select id from public.characters where account_id=auth.uid())));
create policy study_group_members_owner_write on public.study_group_members for all to authenticated using (group_id in (select id from public.study_groups where owner_character_id in (select id from public.characters where account_id=auth.uid()))) with check (group_id in (select id from public.study_groups where owner_character_id in (select id from public.characters where account_id=auth.uid())));
create policy school_mail_recipient_read on public.school_mail_messages for select to authenticated using (recipient_account_id=auth.uid() or recipient_character_id in (select id from public.characters where account_id=auth.uid()) or audience in ('students','faculty','school') or (audience='homeroom' and recipient_character_id in (select hm.student_character_id from public.homeroom_memberships hm join public.characters c on c.id=hm.student_character_id where c.account_id=auth.uid())));
create policy school_mail_sender_or_staff_insert on public.school_mail_messages for insert to authenticated with check (sender_account_id=auth.uid() or public.has_capability('school.configure'));
create policy school_mail_recipient_update on public.school_mail_messages for update to authenticated using (recipient_account_id=auth.uid() or recipient_character_id in (select id from public.characters where account_id=auth.uid())) with check (recipient_account_id=auth.uid() or recipient_character_id in (select id from public.characters where account_id=auth.uid()));

-- Faculty ownership policies.
create policy faculty_office_hours_public_read on public.faculty_office_hours for select to authenticated using (true);
create policy faculty_office_hours_own_write on public.faculty_office_hours for all to authenticated using (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher')) with check (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));
create policy faculty_lesson_plans_own on public.faculty_lesson_plans for all to authenticated using (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher')) with check (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));
create policy faculty_templates_own on public.faculty_assignment_templates for all to authenticated using (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher')) with check (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));
create policy class_seating_teacher on public.class_seating_assignments for all to authenticated using (assigned_by_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher') or student_character_id in (select id from public.characters where account_id=auth.uid())) with check (assigned_by_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));

-- Account utilities.
create policy bookmarks_own on public.global_bookmarks for all to authenticated using (account_id=auth.uid()) with check (account_id=auth.uid());
create policy recent_views_own on public.recent_views for all to authenticated using (account_id=auth.uid()) with check (account_id=auth.uid());
create policy passport_owner_read on public.character_passport_stamps for select to authenticated using (character_id in (select id from public.characters where account_id=auth.uid()) or character_id in (select character_id from public.published_character_profiles where profile_visibility='public'));
create policy passport_staff_write on public.character_passport_stamps for all to authenticated using (public.has_capability('school.configure') or public.has_capability('students.promote')) with check (public.has_capability('school.configure') or public.has_capability('students.promote'));
create policy memories_owner on public.character_memories for all to authenticated using (character_id in (select id from public.characters where account_id=auth.uid())) with check (character_id in (select id from public.characters where account_id=auth.uid()));
create policy memories_public_read on public.character_memories for select to authenticated using (visibility='public');
create policy yearbook_owner on public.yearbook_entries for all to authenticated using (character_id in (select id from public.characters where account_id=auth.uid())) with check (character_id in (select id from public.characters where account_id=auth.uid()));
create policy yearbook_published_read on public.yearbook_entries for select to authenticated using (published=true);
create policy photo_booth_owner on public.photo_booth_cards for all to authenticated using (character_id in (select id from public.characters where account_id=auth.uid())) with check (character_id in (select id from public.characters where account_id=auth.uid()));
create policy status_history_owner on public.character_status_history for all to authenticated using (character_id in (select id from public.characters where account_id=auth.uid())) with check (character_id in (select id from public.characters where account_id=auth.uid()));

-- Public/member campus content.
create policy help_articles_read on public.help_articles for select to anon,authenticated using (published=true);
create policy help_articles_manage on public.help_articles for all to authenticated using (public.has_capability('system.configure')) with check (public.has_capability('system.configure'));
create policy chronicle_read on public.chronicle_articles for select to anon,authenticated using (state='published');
create policy chronicle_manage on public.chronicle_articles for all to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy lost_found_read on public.campus_lost_found for select to authenticated using (true);
create policy lost_found_create on public.campus_lost_found for insert to authenticated with check (created_by_character_id in (select id from public.characters where account_id=auth.uid()));
create policy lost_found_owner_update on public.campus_lost_found for update to authenticated using (created_by_character_id in (select id from public.characters where account_id=auth.uid()) or public.has_capability('school.configure')) with check (true);
create policy suggestions_owner on public.campus_suggestions for select to authenticated using (account_id=auth.uid() or public.has_capability('school.configure'));
create policy suggestions_create on public.campus_suggestions for insert to authenticated with check (account_id=auth.uid());
create policy suggestions_staff_update on public.campus_suggestions for update to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));
create policy radio_read on public.school_radio_posts for select to anon,authenticated using (state='published');
create policy radio_manage on public.school_radio_posts for all to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));

-- Social extras.
create policy poll_options_read on public.social_poll_options for select to authenticated using (true);
create policy poll_options_author on public.social_poll_options for all to authenticated using (post_id in (select id from public.social_posts where author_account_id=auth.uid())) with check (post_id in (select id from public.social_posts where author_account_id=auth.uid()));
create policy poll_votes_read on public.social_poll_votes for select to authenticated using (true);
create policy poll_votes_own on public.social_poll_votes for insert to authenticated with check (account_id=auth.uid());
create policy poll_votes_delete on public.social_poll_votes for delete to authenticated using (account_id=auth.uid());
create policy reposts_read on public.social_post_reposts for select to authenticated using (true);
create policy reposts_own on public.social_post_reposts for all to authenticated using (account_id=auth.uid()) with check (account_id=auth.uid() and character_id in (select id from public.characters where account_id=auth.uid()));

-- Management tables.
create policy feature_flags_read on public.school_feature_flags for select to authenticated using (true);
create policy feature_flags_manage on public.school_feature_flags for all to authenticated using (public.has_capability('system.configure')) with check (public.has_capability('system.configure'));
create policy seasonal_event_read on public.seasonal_event_configs for select to authenticated using (state in ('scheduled','active','ended') or public.has_capability('school.configure'));
create policy seasonal_event_manage on public.seasonal_event_configs for all to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));

-- Seed feature flags without changing existing feature behavior.
insert into public.school_feature_flags(flag_key,label,description,enabled) values
 ('boutique','Boutique','Hanami Boutique storefront and inventory.',true),
 ('hanami_plus','Hanami+','Hanami+ creative membership surfaces.',true),
 ('creator_marketplace','Creator Marketplace','Community theme and component marketplace.',true),
 ('guestbook','Guestbooks','Profile guestbook interactions.',true),
 ('yearbook','Yearbook','School yearbook pages and entries.',true),
 ('clubs','Clubs','Club and organization surfaces.',true),
 ('applications','Applications','Student application and enrollment flow.',true),
 ('public_profiles','Public Profiles','Guest/member public profile browsing.',true),
 ('labs','Labs','Experimental Hanami+ features.',true)
on conflict(flag_key) do nothing;

-- Help Center starter content.
insert into public.help_articles(slug,title,category,summary,body,audience,sort_order) values
 ('getting-started','Getting Started at Hanami','Getting Started','How accounts, characters, and school access work.','Hanami uses one Discord-linked account with up to two characters. Choose a character after signing in, then use the school network to access classes, social spaces, profiles, clubs, and customization.',array['all'],10),
 ('profiles-and-customization','Profiles & Customization','Profiles','Profile Studio, themes, widgets, cosmetics, and public visibility.','Use Profile Studio to build your character page. Hanami+ adds advanced creative tools, but core profile and school access remain available to standard members.',array['all'],20),
 ('petals-and-boutique','Petals & Boutique','Rewards','How account-owned collectibles and Petals work.','Petals belong to your account. Purchased cosmetics are account-owned and can be equipped differently on each character through character loadouts.',array['all'],30),
 ('academics','Academics','School','Schedules, homerooms, assignments, grades, and attendance.','The Academics area shows your complete school-day timeline, enrolled classes, assignments, grades, and attendance. Homeroom and shared school blocks follow the Hanami 2006 schedule.',array['student','faculty'],40),
 ('privacy-and-safety','Privacy & Safety','Safety','Privacy controls, reporting, and moderation.','Use profile visibility and interaction controls to choose what others can see. Report unsafe content through moderation tools; staff actions are account-audited.',array['all'],50)
on conflict(slug) do nothing;

-- Guest-safe public snapshot. No private students, grades, messages, or account data.
create or replace function public.guest_public_snapshot()
returns jsonb
language sql
security definer
set search_path=''
as $$
 select jsonb_build_object(
  'announcements',coalesce((select jsonb_agg(x) from (select id,title,body,category,school_date from public.school_announcements where state='published' and (expires_school_date is null or expires_school_date>=date '2006-09-09') order by pinned desc,school_date desc nulls last limit 8) x),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(x) from (select id,title,description,event_type,school_date,starts_at,ends_at,location from public.campus_events where status in ('published','scheduled','active') order by school_date,starts_at limit 10) x),'[]'::jsonb),
  'chronicle',coalesce((select jsonb_agg(x) from (select id,slug,title,dek,category,published_school_date,featured from public.chronicle_articles where state='published' order by featured desc,published_school_date desc nulls last limit 8) x),'[]'::jsonb),
  'profiles',coalesce((select jsonb_agg(x) from (select character_id,display_name,handle,school_role,bio,custom_status,pronouns,avatar_path,banner_path from public.published_character_profiles where profile_visibility='public' order by published_at desc limit 12) x),'[]'::jsonb),
  'boutique',coalesce((select jsonb_agg(x) from (select id,slug,name,description,item_type,collection_name,season,rarity,price_petals,pricing_state,is_animated from public.boutique_items where state='published' order by featured desc,is_new desc,created_at desc limit 16) x),'[]'::jsonb),
  'radio',coalesce((select jsonb_agg(x) from (select id,title,description,show_name,school_date,starts_at from public.school_radio_posts where state='published' order by school_date desc nulls last,created_at desc limit 6) x),'[]'::jsonb)
 );
$$;
revoke all on function public.guest_public_snapshot() from public;
grant execute on function public.guest_public_snapshot() to anon,authenticated;

-- Student portal snapshot for the active character only.
create or replace function public.student_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_account uuid:=auth.uid(); v_character uuid; result jsonb;
begin
 if v_account is null then raise exception 'Authentication required'; end if;
 select active_character_id into v_character from public.accounts where id=v_account;
 if v_character is null then raise exception 'Choose an active character first'; end if;
 select jsonb_build_object(
  'planner',coalesce((select jsonb_agg(x) from (select * from public.student_planner_items where character_id=v_character order by completed,due_school_date nulls last,due_time nulls last,created_at desc limit 40) x),'[]'::jsonb),
  'mail',coalesce((select jsonb_agg(x) from (select id,category,subject,body,read_at,created_at from public.school_mail_messages where recipient_account_id=v_account or recipient_character_id=v_character or audience='school' or (audience='students' and exists(select 1 from public.characters c where c.id=v_character and c.school_role in ('student','new_student'))) order by created_at desc limit 30) x),'[]'::jsonb),
  'assignments',coalesce((select jsonb_agg(x) from (select a.id,a.title,a.assignment_type,a.due_school_date,a.due_time,a.points_possible,s.id section_id,c.code course_code,c.name course_name from public.academic_assignments a join public.academic_sections s on s.id=a.section_id join public.academic_courses c on c.id=s.course_id join public.academic_enrollments e on e.section_id=s.id where e.student_character_id=v_character and a.state='published' order by a.due_school_date,a.due_time limit 20) x),'[]'::jsonb),
  'grades',coalesce((select jsonb_agg(x) from (select g.assignment_id,a.title,g.points_earned,a.points_possible,g.feedback,g.graded_at from public.academic_grades g join public.academic_assignments a on a.id=g.assignment_id where g.student_character_id=v_character order by g.graded_at desc nulls last limit 20) x),'[]'::jsonb),
  'attendance',coalesce((select jsonb_agg(x) from (select school_date,status,note from public.academic_attendance where student_character_id=v_character order by school_date desc limit 30) x),'[]'::jsonb),
  'homeroom',(select to_jsonb(x) from (select h.id,h.code,h.room_label,h.description,m.student_year,advisor.display_name advisor_name from public.homeroom_memberships m join public.school_homerooms h on h.id=m.homeroom_id left join public.characters advisor on advisor.id=h.advisor_character_id where m.student_character_id=v_character limit 1) x),
  'passport',coalesce((select jsonb_agg(x) from (select id,stamp_key,title,description,school_date,icon,category,awarded_at from public.character_passport_stamps where character_id=v_character order by coalesce(school_date,date '2006-01-01') desc,awarded_at desc) x),'[]'::jsonb),
  'study_groups',coalesce((select jsonb_agg(x) from (select g.id,g.title,g.description,g.subject,g.next_session_at,g.owner_character_id from public.study_groups g where g.owner_character_id=v_character or exists(select 1 from public.study_group_members m where m.group_id=g.id and m.character_id=v_character) order by g.updated_at desc) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.student_portal_snapshot() from public;
grant execute on function public.student_portal_snapshot() to authenticated;

-- Faculty snapshot; active character must be a teacher.
create or replace function public.faculty_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_account uuid:=auth.uid(); v_character uuid; v_role text; result jsonb;
begin
 if v_account is null then raise exception 'Authentication required'; end if;
 select a.active_character_id,c.school_role into v_character,v_role from public.accounts a left join public.characters c on c.id=a.active_character_id where a.id=v_account;
 if v_character is null or v_role<>'teacher' then raise exception 'Faculty character required'; end if;
 select jsonb_build_object(
  'sections',coalesce((select jsonb_agg(x) from (select s.id,s.section_code,c.code course_code,c.name course_name,s.room_label from public.academic_sections s join public.academic_courses c on c.id=s.course_id where s.teacher_character_id=v_character and s.is_active order by s.section_code) x),'[]'::jsonb),
  'assignments',coalesce((select jsonb_agg(x) from (select a.id,a.section_id,a.title,a.assignment_type,a.state,a.due_school_date,a.due_time,a.points_possible from public.academic_assignments a join public.academic_sections s on s.id=a.section_id where s.teacher_character_id=v_character order by a.due_school_date desc nulls last limit 40) x),'[]'::jsonb),
  'office_hours',coalesce((select jsonb_agg(x) from (select * from public.faculty_office_hours where faculty_character_id=v_character order by weekday,starts_at) x),'[]'::jsonb),
  'lesson_plans',coalesce((select jsonb_agg(x) from (select * from public.faculty_lesson_plans where faculty_character_id=v_character order by school_date desc limit 30) x),'[]'::jsonb),
  'templates',coalesce((select jsonb_agg(x) from (select * from public.faculty_assignment_templates where faculty_character_id=v_character order by updated_at desc) x),'[]'::jsonb),
  'ungraded_count',(select count(*) from public.academic_submissions sub join public.academic_assignments a on a.id=sub.assignment_id join public.academic_sections s on s.id=a.section_id left join public.academic_grades g on g.assignment_id=a.id and g.student_character_id=sub.student_character_id where s.teacher_character_id=v_character and g.assignment_id is null),
  'advisor_homeroom',(select to_jsonb(x) from (select id,code,room_label,description from public.school_homerooms where advisor_character_id=v_character and is_active limit 1) x)
 ) into result;
 return result;
end $$;
revoke all on function public.faculty_portal_snapshot() from public;
grant execute on function public.faculty_portal_snapshot() to authenticated;

-- Management snapshot for administrator/owner/moderator launchpads.
create or replace function public.management_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_account uuid:=auth.uid(); result jsonb;
begin
 if v_account is null then raise exception 'Authentication required'; end if;
 if not (public.has_capability('school.configure') or public.has_capability('moderation.review_reports') or public.has_capability('system.configure')) then raise exception 'Management access required'; end if;
 select jsonb_build_object(
  'applications',coalesce((select jsonb_agg(x) from (select character_id,applicant_account_id,status,school_year,nickname,submitted_at,reviewed_at,accepted_at from public.student_applications order by created_at desc limit 60) x),'[]'::jsonb),
  'feature_flags',coalesce((select jsonb_agg(x) from (select * from public.school_feature_flags order by flag_key) x),'[]'::jsonb),
  'seasonal_events',coalesce((select jsonb_agg(x) from (select * from public.seasonal_event_configs order by starts_school_date desc) x),'[]'::jsonb),
  'moderation_reports',case when public.has_capability('moderation.review_reports') then coalesce((select jsonb_agg(x) from (select * from public.moderation_reports order by created_at desc limit 50) x),'[]'::jsonb) else '[]'::jsonb end,
  'suggestions',case when public.has_capability('school.configure') then coalesce((select jsonb_agg(x) from (select * from public.campus_suggestions order by created_at desc limit 50) x),'[]'::jsonb) else '[]'::jsonb end,
  'stats',jsonb_build_object(
    'accounts',(select count(*) from public.accounts where account_state='active'),
    'characters',(select count(*) from public.characters where character_state='active'),
    'students',(select count(*) from public.characters where character_state='active' and school_role in ('student','new_student')),
    'faculty',(select count(*) from public.characters where character_state='active' and school_role='teacher'),
    'published_events',(select count(*) from public.campus_events where status in ('published','scheduled','active')),
    'published_boutique_items',(select count(*) from public.boutique_items where state='published')
  )
 ) into result;
 return result;
end $$;
revoke all on function public.management_portal_snapshot() from public;
grant execute on function public.management_portal_snapshot() to authenticated;
