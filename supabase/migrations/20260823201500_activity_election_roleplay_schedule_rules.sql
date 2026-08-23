alter table public.school_elections add column if not exists campaign_open_at timestamptz;
alter table public.school_elections add column if not exists campaign_close_at timestamptz;

create table if not exists public.election_campaign_posts (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.school_elections(id) on delete cascade,
  position_id uuid not null references public.election_positions(id) on delete cascade,
  candidate_character_id uuid not null references public.characters(id) on delete cascade,
  title text not null,
  body text not null default '',
  media_url text,
  status text not null default 'published' check (status in ('draft','published','hidden','removed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists election_campaign_posts_election_idx on public.election_campaign_posts(election_id,published_at desc);
alter table public.election_campaign_posts enable row level security;

drop policy if exists election_campaign_posts_read on public.election_campaign_posts;
create policy election_campaign_posts_read on public.election_campaign_posts for select using (
  status='published' or public.school_staff_can_manage() or exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid())
);

drop policy if exists election_campaign_posts_candidate_insert on public.election_campaign_posts;
create policy election_campaign_posts_candidate_insert on public.election_campaign_posts for insert with check (
  exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid())
  and exists(select 1 from public.election_nominations n where n.position_id=election_campaign_posts.position_id and n.candidate_character_id=election_campaign_posts.candidate_character_id and n.status='approved')
  and exists(select 1 from public.school_elections e where e.id=election_campaign_posts.election_id and (e.campaign_open_at is null or now()>=e.campaign_open_at) and (e.campaign_close_at is null or now()<=e.campaign_close_at))
);

drop policy if exists election_campaign_posts_candidate_update on public.election_campaign_posts;
create policy election_campaign_posts_candidate_update on public.election_campaign_posts for update using (
  public.school_staff_can_manage() or exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid())
) with check (
  public.school_staff_can_manage() or exists(select 1 from public.characters c where c.id=candidate_character_id and c.owner_user_id=auth.uid())
);

create table if not exists public.roleplay_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  cadence text not null check (cadence in ('daily','weekly')),
  roleplay_date date not null,
  title text not null,
  prompt text not null default '',
  continuity_summary text not null default '',
  category text not null default 'school_life',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid default auth.uid(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cadence,roleplay_date,title)
);

create index if not exists roleplay_calendar_entries_date_idx on public.roleplay_calendar_entries(roleplay_date desc,cadence);
alter table public.roleplay_calendar_entries enable row level security;

drop policy if exists roleplay_calendar_entries_read on public.roleplay_calendar_entries;
create policy roleplay_calendar_entries_read on public.roleplay_calendar_entries for select using (status='published' or public.school_staff_can_manage());

drop policy if exists roleplay_calendar_entries_staff_manage on public.roleplay_calendar_entries;
create policy roleplay_calendar_entries_staff_manage on public.roleplay_calendar_entries for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());

update public.campus_activities set meeting_schedule='Tuesday & Wednesday • after school' where kind::text='club' and lower(name) not like '%basketball%' and lower(name) not like '%track%' and lower(name) not like '%volleyball%';
update public.campus_activities set meeting_schedule='Saturday & Sunday • sports practices / matches' where kind::text='club' and (lower(name) like '%basketball%' or lower(name) like '%track%' or lower(name) like '%volleyball%');
update public.campus_activities set meeting_schedule='Election-based • students serve only after a certified election' where kind::text='student_government';
