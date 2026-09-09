-- Hanami High V2 full portal expansion foundation
-- Canonical source for the production full_portal_expansion_foundation migration.
-- Snapshot RPCs intentionally live in 0087_full_portal_snapshots.sql.

create table public.student_planner_items (
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
create index student_planner_character_due_idx on public.student_planner_items(character_id,due_school_date,completed);

create table public.study_groups (
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
create table public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key(group_id,character_id)
);

create table public.school_mail_messages (
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
create index school_mail_recipient_idx on public.school_mail_messages(recipient_account_id,recipient_character_id,created_at desc);

create table public.faculty_office_hours (
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

create table public.faculty_lesson_plans (
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

create table public.faculty_assignment_templates (
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

create table public.class_seating_assignments (
  section_id uuid not null references public.academic_sections(id) on delete cascade,
  student_character_id uuid not null references public.characters(id) on delete cascade,
  assigned_by_character_id uuid not null references public.characters(id) on delete cascade,
  seat_x smallint not null check (seat_x between 0 and 20),
  seat_y smallint not null check (seat_y between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key(section_id,student_character_id)
);

create table public.school_feature_flags (
  flag_key text primary key,
  label text not null,
  description text not null default '',
  enabled boolean not null default true,
  updated_by_account_id uuid references public.accounts(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.seasonal_event_configs (
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

create table public.global_bookmarks (
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

create table public.recent_views (
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  label text not null default '',
  route_hash text not null,
  viewed_at timestamptz not null default now(),
  primary key(account_id,resource_type,resource_id)
);

create table public.help_articles (
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

create table public.character_passport_stamps (
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

create table public.character_memories (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  title text not null,
  body text not null default '',
  memory_school_date date,
  visibility text not null default 'private' check (visibility in ('private','friends','public')),
  created_at timestamptz not null default now()
);

create table public.chronicle_articles (
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

create table public.yearbook_entries (
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

create table public.campus_lost_found (
  id uuid primary key default gen_random_uuid(),
  created_by_character_id uuid references public.characters(id) on delete set null,
  item_name text not null,
  description text not null default '',
  location text not null default '',
  school_date date,
  status text not null default 'lost' check (status in ('lost','found','returned')),
  created_at timestamptz not null default now()
);

create table public.campus_suggestions (
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

create table public.school_radio_posts (
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

create table public.photo_booth_cards (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  image_path text,
  frame_style text not null default 'sakura',
  sticker_payload jsonb not null default '[]'::jsonb,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table public.character_status_history (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  status_text text not null check (char_length(status_text) between 1 and 140),
  mood text not null default '',
  created_at timestamptz not null default now()
);

create table public.social_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  sort_order smallint not null default 0
);
create table public.social_poll_votes (
  option_id uuid not null references public.social_poll_options(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(option_id,account_id)
);
create table public.social_post_reposts (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  comment text not null default '',
  created_at timestamptz not null default now(),
  primary key(post_id,account_id)
);

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

create policy student_planner_own on public.student_planner_items for all to authenticated using (account_id=auth.uid()) with check (account_id=auth.uid() and exists(select 1 from public.characters c where c.id=character_id and c.account_id=auth.uid()));
create policy study_groups_member_read on public.study_groups for select to authenticated using (owner_character_id in (select id from public.characters where account_id=auth.uid()) or exists(select 1 from public.study_group_members m where m.group_id=id and m.character_id in (select id from public.characters where account_id=auth.uid())));
create policy study_groups_owner_write on public.study_groups for all to authenticated using (owner_character_id in (select id from public.characters where account_id=auth.uid())) with check (owner_character_id in (select id from public.characters where account_id=auth.uid()));
create policy study_group_members_member_read on public.study_group_members for select to authenticated using (character_id in (select id from public.characters where account_id=auth.uid()) or group_id in (select id from public.study_groups where owner_character_id in (select id from public.characters where account_id=auth.uid())));
create policy study_group_members_owner_write on public.study_group_members for all to authenticated using (group_id in (select id from public.study_groups where owner_character_id in (select id from public.characters where account_id=auth.uid()))) with check (group_id in (select id from public.study_groups where owner_character_id in (select id from public.characters where account_id=auth.uid())));
create policy school_mail_recipient_read on public.school_mail_messages for select to authenticated using (
 recipient_account_id=auth.uid()
 or recipient_character_id in (select id from public.characters where account_id=auth.uid())
 or audience='school'
 or (audience='students' and exists(select 1 from public.accounts a join public.characters c on c.id=a.active_character_id where a.id=auth.uid() and c.school_role in ('student','new_student')))
 or (audience='faculty' and exists(select 1 from public.accounts a join public.characters c on c.id=a.active_character_id where a.id=auth.uid() and c.school_role='teacher'))
);
create policy school_mail_sender_or_staff_insert on public.school_mail_messages for insert to authenticated with check (sender_account_id=auth.uid() or public.has_capability('school.configure'));
create policy school_mail_recipient_update on public.school_mail_messages for update to authenticated using (recipient_account_id=auth.uid() or recipient_character_id in (select id from public.characters where account_id=auth.uid())) with check (recipient_account_id=auth.uid() or recipient_character_id in (select id from public.characters where account_id=auth.uid()));

create policy faculty_office_hours_public_read on public.faculty_office_hours for select to authenticated using (true);
create policy faculty_office_hours_own_write on public.faculty_office_hours for all to authenticated using (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher')) with check (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));
create policy faculty_lesson_plans_own on public.faculty_lesson_plans for all to authenticated using (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher')) with check (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));
create policy faculty_templates_own on public.faculty_assignment_templates for all to authenticated using (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher')) with check (faculty_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));
create policy class_seating_teacher on public.class_seating_assignments for all to authenticated using (assigned_by_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher') or student_character_id in (select id from public.characters where account_id=auth.uid())) with check (assigned_by_character_id in (select id from public.characters where account_id=auth.uid() and school_role='teacher'));

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

create policy poll_options_read on public.social_poll_options for select to authenticated using (true);
create policy poll_options_author on public.social_poll_options for all to authenticated using (post_id in (select p.id from public.social_posts p join public.characters c on c.id=p.author_character_id where c.account_id=auth.uid())) with check (post_id in (select p.id from public.social_posts p join public.characters c on c.id=p.author_character_id where c.account_id=auth.uid()));
create policy poll_votes_read on public.social_poll_votes for select to authenticated using (true);
create policy poll_votes_own on public.social_poll_votes for insert to authenticated with check (account_id=auth.uid());
create policy poll_votes_delete on public.social_poll_votes for delete to authenticated using (account_id=auth.uid());
create policy reposts_read on public.social_post_reposts for select to authenticated using (true);
create policy reposts_own on public.social_post_reposts for all to authenticated using (account_id=auth.uid()) with check (account_id=auth.uid() and character_id in (select id from public.characters where account_id=auth.uid()));

create policy feature_flags_read on public.school_feature_flags for select to authenticated using (true);
create policy feature_flags_manage on public.school_feature_flags for all to authenticated using (public.has_capability('system.configure')) with check (public.has_capability('system.configure'));
create policy seasonal_event_read on public.seasonal_event_configs for select to authenticated using (state in ('scheduled','active','ended') or public.has_capability('school.configure'));
create policy seasonal_event_manage on public.seasonal_event_configs for all to authenticated using (public.has_capability('school.configure')) with check (public.has_capability('school.configure'));

grant select,insert,update,delete on public.student_planner_items,public.study_groups,public.study_group_members,public.school_mail_messages,public.faculty_office_hours,public.faculty_lesson_plans,public.faculty_assignment_templates,public.class_seating_assignments,public.school_feature_flags,public.seasonal_event_configs,public.global_bookmarks,public.recent_views,public.character_passport_stamps,public.character_memories,public.yearbook_entries,public.campus_lost_found,public.campus_suggestions,public.photo_booth_cards,public.character_status_history,public.social_poll_options,public.social_poll_votes,public.social_post_reposts to authenticated;
grant select on public.help_articles,public.chronicle_articles,public.school_radio_posts to anon,authenticated;
grant insert,update,delete on public.help_articles,public.chronicle_articles,public.school_radio_posts to authenticated;

insert into public.school_feature_flags(flag_key,label,description,enabled) values
 ('boutique','Boutique','Hanami Boutique storefront and inventory.',true),
 ('hanami_plus','Hanami+','Hanami+ creative membership surfaces.',true),
 ('creator_marketplace','Creator Marketplace','Community theme and component marketplace.',true),
 ('guestbook','Guestbooks','Profile guestbook interactions.',true),
 ('yearbook','Yearbook','School yearbook pages and entries.',true),
 ('clubs','Clubs','Club and organization surfaces.',true),
 ('applications','Applications','Student application and enrollment flow.',true),
 ('public_profiles','Public Profiles','Guest/member public profile browsing.',true),
 ('labs','Labs','Experimental Hanami+ features.',true);

insert into public.help_articles(slug,title,category,summary,body,audience,sort_order) values
 ('getting-started','Getting Started at Hanami','Getting Started','How accounts, characters, and school access work.','Hanami uses one Discord-linked account with up to two characters. Choose a character after signing in, then use the school network to access classes, social spaces, profiles, clubs, and customization.',array['all'],10),
 ('profiles-and-customization','Profiles & Customization','Profiles','Profile Studio, themes, widgets, cosmetics, and public visibility.','Use Profile Studio to build your character page. Hanami+ adds advanced creative tools, but core profile and school access remain available to standard members.',array['all'],20),
 ('petals-and-boutique','Petals & Boutique','Rewards','How account-owned collectibles and Petals work.','Petals belong to your account. Purchased cosmetics are account-owned and can be equipped differently on each character through character loadouts.',array['all'],30),
 ('academics','Academics','School','Schedules, homerooms, assignments, grades, and attendance.','The Academics area shows your complete school-day timeline, enrolled classes, assignments, grades, and attendance. Homeroom and shared school blocks follow the Hanami 2006 schedule.',array['student','faculty'],40),
 ('privacy-and-safety','Privacy & Safety','Safety','Privacy controls, reporting, and moderation.','Use profile visibility and interaction controls to choose what others can see. Report unsafe content through moderation tools; staff actions are account-audited.',array['all'],50);
