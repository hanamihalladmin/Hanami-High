create table public.school_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'general' check (category in ('general','academic','campus','urgent','event')),
  state text not null default 'draft' check (state in ('draft','published','archived')),
  pinned boolean not null default false,
  school_date date,
  expires_school_date date,
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) between 2 and 180),
  check (school_date is null or extract(year from school_date)=2006),
  check (expires_school_date is null or extract(year from expires_school_date)=2006),
  check (school_date is null or expires_school_date is null or expires_school_date >= school_date)
);

create table public.character_presence (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  status text not null default 'online' check (status in ('online','idle','away')),
  current_section text,
  current_subsection text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index school_announcements_state_date_idx on public.school_announcements(state,pinned desc,school_date desc,created_at desc);
create index school_announcements_creator_idx on public.school_announcements(created_by_character_id);
create index character_presence_recent_idx on public.character_presence(last_seen_at desc);
create index character_presence_account_idx on public.character_presence(account_id);

create trigger school_announcements_touch_updated_at before update on public.school_announcements for each row execute function private.touch_updated_at();
create trigger character_presence_touch_updated_at before update on public.character_presence for each row execute function private.touch_updated_at();

create or replace function private.validate_school_announcement_author()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.created_by_character_id <> old.created_by_character_id then
    raise exception 'Announcement author cannot be changed' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.characters c where c.id=new.created_by_character_id and c.character_state='active'
      and (c.character_kind='faculty' or c.school_role in ('faculty','administration'))
  ) then raise exception 'Announcement author must be active faculty or administration' using errcode='23514'; end if;
  return new;
end;
$$;
revoke all on function private.validate_school_announcement_author() from public,anon,authenticated;
create trigger school_announcements_validate_author before insert or update of created_by_character_id on public.school_announcements for each row execute function private.validate_school_announcement_author();

create or replace function private.validate_character_presence_owner()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists (
    select 1 from public.characters c where c.id=new.character_id and c.account_id=new.account_id and c.character_state='active'
  ) then raise exception 'Presence character must be an active character owned by the account' using errcode='23514'; end if;
  if tg_op='UPDATE' and (new.character_id<>old.character_id or new.account_id<>old.account_id) then
    raise exception 'Presence identity cannot be changed' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_character_presence_owner() from public,anon,authenticated;
create trigger character_presence_validate_owner before insert or update on public.character_presence for each row execute function private.validate_character_presence_owner();

alter table public.school_announcements enable row level security;
alter table public.character_presence enable row level security;
revoke all on public.school_announcements,public.character_presence from anon,authenticated;
grant select,insert,update,delete on public.school_announcements to authenticated;
grant select,insert,update,delete on public.character_presence to authenticated;

create policy school_announcements_select_visible on public.school_announcements for select to authenticated using (
  state='published' or public.has_capability('school.configure')
);
create policy school_announcements_admin_insert on public.school_announcements for insert to authenticated with check (
  public.has_capability('school.configure') and created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
);
create policy school_announcements_admin_update on public.school_announcements for update to authenticated using (public.has_capability('school.configure')) with check (
  public.has_capability('school.configure') and created_by_character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
);
create policy school_announcements_admin_delete on public.school_announcements for delete to authenticated using (public.has_capability('school.configure'));

create policy character_presence_select_campus on public.character_presence for select to authenticated using (true);
create policy character_presence_insert_own on public.character_presence for insert to authenticated with check (
  account_id=(select auth.uid()) and character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
);
create policy character_presence_update_own on public.character_presence for update to authenticated using (
  account_id=(select auth.uid()) and character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
) with check (
  account_id=(select auth.uid()) and character_id=(select active_character_id from public.accounts where id=(select auth.uid()))
);
create policy character_presence_delete_own on public.character_presence for delete to authenticated using (account_id=(select auth.uid()));

create or replace function private.sync_character_search_document()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_source_key text; v_title text; v_subsection text; v_subtitle text;
begin
  if tg_op='DELETE' then delete from public.search_documents where source_key='character:'||old.id::text; return old; end if;
  v_source_key := 'character:'||new.id::text;
  v_title := coalesce(nullif(trim(new.display_name),''),nullif(trim(concat_ws(' ',new.first_name,new.last_name)),''),'Hanami Student');
  v_subsection := case when new.character_kind='faculty' or new.school_role in ('faculty','administration') then 'faculty' else 'students' end;
  v_subtitle := case when new.school_role is null then case when new.character_kind='faculty' then 'Faculty' else 'Hanami Student' end else initcap(replace(new.school_role,'_',' ')) end;
  if new.character_state='active' then
    insert into public.search_documents(source_key,document_type,entity_id,owner_account_id,owner_character_id,title,subtitle,body,section,subsection,visibility)
    values(v_source_key,'character',new.id,new.account_id,new.id,v_title,v_subtitle,concat_ws(' ',new.first_name,new.last_name,new.display_name,new.handle,new.school_role,new.character_kind),'discover',v_subsection,'campus')
    on conflict(source_key) do update set entity_id=excluded.entity_id,owner_account_id=excluded.owner_account_id,owner_character_id=excluded.owner_character_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();
  else delete from public.search_documents where source_key=v_source_key; end if;
  return new;
end;
$$;
revoke all on function private.sync_character_search_document() from public,anon,authenticated;

create or replace function private.sync_campus_group_search_document()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then delete from public.search_documents where source_key='campus_group:'||old.id::text; return old; end if;
  if new.status='active' then
    insert into public.search_documents(source_key,document_type,entity_id,title,subtitle,body,section,subsection,visibility)
    values('campus_group:'||new.id::text,'campus_group',new.id,new.name,initcap(replace(new.group_type,'_',' ')),concat_ws(' ',new.name,new.description,new.meeting_room),'discover','clubs','campus')
    on conflict(source_key) do update set entity_id=excluded.entity_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();
  else delete from public.search_documents where source_key='campus_group:'||new.id::text; end if;
  return new;
end;
$$;
revoke all on function private.sync_campus_group_search_document() from public,anon,authenticated;
create trigger campus_groups_search_document_sync after insert or update of name,group_type,description,status,meeting_room or delete on public.campus_groups for each row execute function private.sync_campus_group_search_document();

create or replace function private.sync_campus_event_search_document()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then delete from public.search_documents where source_key='campus_event:'||old.id::text; return old; end if;
  if new.status in ('published','completed') then
    insert into public.search_documents(source_key,document_type,entity_id,title,subtitle,body,section,subsection,visibility)
    values('campus_event:'||new.id::text,'campus_event',new.id,new.title,initcap(replace(new.event_type,'_',' ')),concat_ws(' ',new.title,new.description,new.location,new.school_date::text),'discover','events','campus')
    on conflict(source_key) do update set entity_id=excluded.entity_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();
  else delete from public.search_documents where source_key='campus_event:'||new.id::text; end if;
  return new;
end;
$$;
revoke all on function private.sync_campus_event_search_document() from public,anon,authenticated;
create trigger campus_events_search_document_sync after insert or update of title,description,event_type,school_date,location,status or delete on public.campus_events for each row execute function private.sync_campus_event_search_document();

create or replace function private.sync_school_announcement_search_document()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then delete from public.search_documents where source_key='announcement:'||old.id::text; return old; end if;
  if new.state='published' then
    insert into public.search_documents(source_key,document_type,entity_id,title,subtitle,body,section,subsection,visibility)
    values('announcement:'||new.id::text,'announcement',new.id,new.title,initcap(new.category),new.body,'home','announcements','campus')
    on conflict(source_key) do update set entity_id=excluded.entity_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();
  else delete from public.search_documents where source_key='announcement:'||new.id::text; end if;
  return new;
end;
$$;
revoke all on function private.sync_school_announcement_search_document() from public,anon,authenticated;
create trigger school_announcements_search_document_sync after insert or update of title,body,category,state or delete on public.school_announcements for each row execute function private.sync_school_announcement_search_document();

insert into public.search_documents(source_key,document_type,title,subtitle,body,section,subsection,visibility) values
('route:home:whos-online','route','Who''s Online','Hanami Home','online presence active campus characters','home','whos-online','campus'),
('route:home:my-schedule','route','My Schedule','Hanami Home','today classes schedule timetable','home','my-schedule','campus'),
('route:home:my-classes','route','My Classes','Hanami Home','enrolled classes courses teachers','home','my-classes','campus'),
('route:home:my-clubs','route','My Clubs','Hanami Home','club memberships organizations','home','my-clubs','campus'),
('route:discover:faculty','route','Faculty Directory','Discover','find faculty teachers staff administration','discover','faculty','campus'),
('route:discover:clubs','route','Discover Clubs','Discover','find clubs organizations student council','discover','clubs','campus'),
('route:discover:posts','route','Discover Posts','Discover','search bulletins blogs statuses','discover','posts','campus'),
('route:discover:events','route','Discover Events','Discover','search school campus club events','discover','events','campus'),
('route:profile:blog','route','My Blog','Profile','manage character blog drafts published posts','profile','blog','campus')
on conflict(source_key) do update set title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();

insert into public.search_documents(source_key,document_type,entity_id,owner_account_id,owner_character_id,title,subtitle,body,section,subsection,visibility)
select 'character:'||c.id::text,'character',c.id,c.account_id,c.id,
  coalesce(nullif(trim(c.display_name),''),nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),'Hanami Student'),
  case when c.school_role is null then case when c.character_kind='faculty' then 'Faculty' else 'Hanami Student' end else initcap(replace(c.school_role,'_',' ')) end,
  concat_ws(' ',c.first_name,c.last_name,c.display_name,c.handle,c.school_role,c.character_kind),
  'discover',case when c.character_kind='faculty' or c.school_role in ('faculty','administration') then 'faculty' else 'students' end,'campus'
from public.characters c where c.character_state='active'
on conflict(source_key) do update set entity_id=excluded.entity_id,owner_account_id=excluded.owner_account_id,owner_character_id=excluded.owner_character_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();

insert into public.search_documents(source_key,document_type,entity_id,title,subtitle,body,section,subsection,visibility)
select 'campus_group:'||g.id::text,'campus_group',g.id,g.name,initcap(replace(g.group_type,'_',' ')),concat_ws(' ',g.name,g.description,g.meeting_room),'discover','clubs','campus'
from public.campus_groups g where g.status='active'
on conflict(source_key) do update set entity_id=excluded.entity_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();

insert into public.search_documents(source_key,document_type,entity_id,title,subtitle,body,section,subsection,visibility)
select 'campus_event:'||e.id::text,'campus_event',e.id,e.title,initcap(replace(e.event_type,'_',' ')),concat_ws(' ',e.title,e.description,e.location,e.school_date::text),'discover','events','campus'
from public.campus_events e where e.status in ('published','completed')
on conflict(source_key) do update set entity_id=excluded.entity_id,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,section=excluded.section,subsection=excluded.subsection,visibility=excluded.visibility,updated_at=now();
