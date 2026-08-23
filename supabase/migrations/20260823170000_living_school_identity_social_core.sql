create or replace function public.current_user_owns_character(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid());
$$;
revoke all on function public.current_user_owns_character(uuid) from public;
grant execute on function public.current_user_owns_character(uuid) to authenticated;

create table if not exists public.character_reputation_tags (
 id uuid primary key default gen_random_uuid(), character_id uuid not null references public.characters(id) on delete cascade,
 tag_key text not null,label text not null,source_type text not null default 'cosmetic' check (source_type in ('staff','roleplay','system','club','academic','sports','cosmetic')),
 source_id uuid,note text not null default '',visibility text not null default 'public' check (visibility in ('private','friends_only','public','staff_only')),
 featured boolean not null default false,awarded_by uuid,expires_at timestamptz,created_at timestamptz not null default now()
);
create index if not exists character_reputation_tags_character_idx on public.character_reputation_tags(character_id,featured desc,created_at desc);
alter table public.character_reputation_tags enable row level security;
create policy reputation_read on public.character_reputation_tags for select using (public.school_staff_can_manage() or public.current_user_owns_character(character_id) or visibility='public');
create policy reputation_self_cosmetic_insert on public.character_reputation_tags for insert with check (public.current_user_owns_character(character_id) and source_type='cosmetic');
create policy reputation_self_update on public.character_reputation_tags for update using (public.current_user_owns_character(character_id) or public.school_staff_can_manage()) with check (public.current_user_owns_character(character_id) or public.school_staff_can_manage());
create policy reputation_staff_manage on public.character_reputation_tags for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());

create table if not exists public.character_milestones (
 id uuid primary key default gen_random_uuid(),character_id uuid not null references public.characters(id) on delete cascade,milestone_key text not null,title text not null,
 description text not null default '',category text not null default 'school_life',source_type text,source_id uuid,roleplay_date date,
 visibility text not null default 'public' check (visibility in ('private','friends_only','public')),created_at timestamptz not null default now(),unique(character_id,milestone_key,source_id)
);
create index if not exists character_milestones_character_idx on public.character_milestones(character_id,created_at desc);
alter table public.character_milestones enable row level security;
create policy milestones_read on public.character_milestones for select using (public.school_staff_can_manage() or public.current_user_owns_character(character_id) or visibility='public');
create policy milestones_staff_manage on public.character_milestones for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());

create table if not exists public.school_memory_timeline (
 id uuid primary key default gen_random_uuid(),title text not null,summary text not null default '',category text not null default 'school_life',
 scope text not null default 'schoolwide' check (scope in ('character','homeroom','club','schoolwide')),target_id uuid,roleplay_date date not null,image_url text,
 source_type text,source_id uuid,visibility text not null default 'public' check (visibility in ('private','school','public')),created_by uuid default auth.uid(),created_at timestamptz not null default now()
);
create index if not exists school_memory_timeline_date_idx on public.school_memory_timeline(roleplay_date desc,created_at desc);
alter table public.school_memory_timeline enable row level security;
create policy school_memory_read on public.school_memory_timeline for select using (visibility in ('school','public') or public.school_staff_can_manage());
create policy school_memory_staff_manage on public.school_memory_timeline for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());

create table if not exists public.character_friendship_details (
 friendship_id uuid primary key references public.character_friendships(id) on delete cascade,relationship_label text not null default 'Friend',met_through text not null default '',
 anniversary_on date,shared_memory_note text not null default '',visibility text not null default 'friends_only' check (visibility in ('private','friends_only','public')),updated_at timestamptz not null default now()
);
alter table public.character_friendship_details enable row level security;
create policy friendship_details_read on public.character_friendship_details for select using (exists(select 1 from public.character_friendships f where f.id=friendship_id and (public.current_user_owns_character(f.requester_character_id) or public.current_user_owns_character(f.addressee_character_id))) or visibility='public' or public.school_staff_can_manage());
create policy friendship_details_manage on public.character_friendship_details for all using (exists(select 1 from public.character_friendships f where f.id=friendship_id and (public.current_user_owns_character(f.requester_character_id) or public.current_user_owns_character(f.addressee_character_id))) or public.school_staff_can_manage()) with check (exists(select 1 from public.character_friendships f where f.id=friendship_id and (public.current_user_owns_character(f.requester_character_id) or public.current_user_owns_character(f.addressee_character_id))) or public.school_staff_can_manage());

create table if not exists public.shared_scrapbook_pages (
 id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',cover_image_url text,visibility text not null default 'friends_only' check (visibility in ('private','friends_only','public')),
 created_by_character_id uuid not null references public.characters(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.shared_scrapbook_members (
 page_id uuid not null references public.shared_scrapbook_pages(id) on delete cascade,character_id uuid not null references public.characters(id) on delete cascade,
 role text not null default 'member' check (role in ('owner','editor','member')),joined_at timestamptz not null default now(),primary key(page_id,character_id)
);
create table if not exists public.shared_scrapbook_entries (
 id uuid primary key default gen_random_uuid(),page_id uuid not null references public.shared_scrapbook_pages(id) on delete cascade,author_character_id uuid not null references public.characters(id) on delete cascade,
 title text not null,body text not null default '',image_url text,roleplay_date date,created_at timestamptz not null default now()
);
alter table public.shared_scrapbook_pages enable row level security;alter table public.shared_scrapbook_members enable row level security;alter table public.shared_scrapbook_entries enable row level security;
create policy shared_scrapbook_pages_read on public.shared_scrapbook_pages for select using (visibility='public' or public.current_user_owns_character(created_by_character_id) or exists(select 1 from public.shared_scrapbook_members m where m.page_id=id and public.current_user_owns_character(m.character_id)) or public.school_staff_can_manage());
create policy shared_scrapbook_pages_insert on public.shared_scrapbook_pages for insert with check (public.current_user_owns_character(created_by_character_id));
create policy shared_scrapbook_pages_update on public.shared_scrapbook_pages for update using (public.current_user_owns_character(created_by_character_id) or public.school_staff_can_manage()) with check (public.current_user_owns_character(created_by_character_id) or public.school_staff_can_manage());
create policy shared_scrapbook_members_read on public.shared_scrapbook_members for select using (exists(select 1 from public.shared_scrapbook_pages p where p.id=page_id and (p.visibility='public' or public.current_user_owns_character(p.created_by_character_id))) or public.current_user_owns_character(character_id) or public.school_staff_can_manage());
create policy shared_scrapbook_members_manage on public.shared_scrapbook_members for all using (exists(select 1 from public.shared_scrapbook_pages p where p.id=page_id and public.current_user_owns_character(p.created_by_character_id)) or public.school_staff_can_manage()) with check (exists(select 1 from public.shared_scrapbook_pages p where p.id=page_id and public.current_user_owns_character(p.created_by_character_id)) or public.school_staff_can_manage());
create policy shared_scrapbook_entries_read on public.shared_scrapbook_entries for select using (exists(select 1 from public.shared_scrapbook_pages p where p.id=page_id and (p.visibility='public' or public.current_user_owns_character(p.created_by_character_id) or exists(select 1 from public.shared_scrapbook_members m where m.page_id=p.id and public.current_user_owns_character(m.character_id)))) or public.school_staff_can_manage());
create policy shared_scrapbook_entries_insert on public.shared_scrapbook_entries for insert with check (public.current_user_owns_character(author_character_id) and exists(select 1 from public.shared_scrapbook_members m where m.page_id=shared_scrapbook_entries.page_id and m.character_id=shared_scrapbook_entries.author_character_id and m.role in ('owner','editor')));

alter table public.profile_guestbook_entries add column if not exists pinned boolean not null default false;alter table public.profile_guestbook_entries add column if not exists sticker_asset_url text;alter table public.profile_guestbook_entries add column if not exists entry_mode text not null default 'guestbook' check (entry_mode in ('guestbook','yearbook_signature','sticker_note'));alter table public.profile_guestbook_entries add column if not exists visibility_scope text not null default 'public' check (visibility_scope in ('friends_only','public'));

create table if not exists public.portal_notifications (
 id uuid primary key default gen_random_uuid(),character_id uuid not null references public.characters(id) on delete cascade,category text not null,title text not null,body text not null default '',
 priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),action_path text,source_type text,source_id uuid,read_at timestamptz,created_at timestamptz not null default now()
);
create index if not exists portal_notifications_character_idx on public.portal_notifications(character_id,read_at,created_at desc);
alter table public.portal_notifications enable row level security;
create policy notifications_self_read on public.portal_notifications for select using (public.current_user_owns_character(character_id) or public.school_staff_can_manage());
create policy notifications_self_update on public.portal_notifications for update using (public.current_user_owns_character(character_id) or public.school_staff_can_manage()) with check (public.current_user_owns_character(character_id) or public.school_staff_can_manage());
create policy notifications_staff_insert on public.portal_notifications for insert with check (public.school_staff_can_manage());

create table if not exists public.homeroom_profiles (
 homeroom_id uuid primary key references public.homerooms(id) on delete cascade,color text not null default '#17375f',slogan text not null default '',mascot text not null default '',banner_url text,logo_url text,class_goal text not null default '',updated_at timestamptz not null default now()
);
create table if not exists public.homeroom_weekly_rankings (
 id uuid primary key default gen_random_uuid(),week_start date not null,category text not null check (category in ('attendance','cleanliness','festival','volunteer','club_participation','school_spirit')),
 homeroom_id uuid not null references public.homerooms(id) on delete cascade,points integer not null default 0,rank smallint,note text not null default '',created_at timestamptz not null default now(),unique(week_start,category,homeroom_id)
);
alter table public.homeroom_profiles enable row level security;alter table public.homeroom_weekly_rankings enable row level security;
create policy homeroom_profiles_read on public.homeroom_profiles for select using (auth.uid() is not null);create policy homeroom_profiles_staff_manage on public.homeroom_profiles for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());create policy homeroom_rankings_read on public.homeroom_weekly_rankings for select using (auth.uid() is not null);create policy homeroom_rankings_staff_manage on public.homeroom_weekly_rankings for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());

create table if not exists public.yearbook_profiles (
 character_id uuid primary key references public.characters(id) on delete cascade,portrait_url text,quote text not null default '',clubs_sports text[] not null default '{}',awards text[] not null default '{}',most_likely_to text[] not null default '{}',memories text not null default '',approved boolean not null default false,locked_at timestamptz,updated_at timestamptz not null default now()
);
create table if not exists public.yearbook_signatures (
 id uuid primary key default gen_random_uuid(),recipient_character_id uuid not null references public.characters(id) on delete cascade,author_character_id uuid not null references public.characters(id) on delete cascade,message text not null,sticker_asset_url text,status text not null default 'visible' check (status in ('visible','hidden','reported')),created_at timestamptz not null default now(),unique(recipient_character_id,author_character_id)
);
alter table public.yearbook_profiles enable row level security;alter table public.yearbook_signatures enable row level security;
create policy yearbook_profiles_read on public.yearbook_profiles for select using (approved or public.current_user_owns_character(character_id) or public.school_staff_can_manage());create policy yearbook_profiles_self_manage on public.yearbook_profiles for all using (public.current_user_owns_character(character_id) or public.school_staff_can_manage()) with check (public.current_user_owns_character(character_id) or public.school_staff_can_manage());create policy yearbook_signatures_read on public.yearbook_signatures for select using (status='visible' or public.current_user_owns_character(recipient_character_id) or public.current_user_owns_character(author_character_id) or public.school_staff_can_manage());create policy yearbook_signatures_insert on public.yearbook_signatures for insert with check (public.current_user_owns_character(author_character_id) and author_character_id<>recipient_character_id);create policy yearbook_signatures_recipient_manage on public.yearbook_signatures for update using (public.current_user_owns_character(recipient_character_id) or public.school_staff_can_manage()) with check (public.current_user_owns_character(recipient_character_id) or public.school_staff_can_manage());

create table if not exists public.student_id_extensions (
 character_id uuid primary key references public.characters(id) on delete cascade,library_number text,permissions jsonb not null default '[]'::jsonb,disciplinary_restrictions jsonb not null default '[]'::jsonb,event_stamps jsonb not null default '[]'::jsonb,updated_at timestamptz not null default now()
);
alter table public.student_id_extensions enable row level security;create policy student_id_extensions_self_read on public.student_id_extensions for select using (public.current_user_owns_character(character_id) or public.school_staff_can_manage());create policy student_id_extensions_staff_manage on public.student_id_extensions for all using (public.school_staff_can_manage()) with check (public.school_staff_can_manage());
