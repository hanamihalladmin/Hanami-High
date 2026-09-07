create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  actor_character_id uuid references public.characters(id) on delete set null,
  kind text not null default 'general' check (length(trim(kind)) > 0),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  section text,
  subsection text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_account_created_idx
  on public.notifications(account_id, created_at desc);
create index notifications_unread_idx
  on public.notifications(account_id, created_at desc)
  where read_at is null;
create index notifications_character_created_idx
  on public.notifications(character_id, created_at desc)
  where character_id is not null;

alter table public.notifications enable row level security;

create policy notifications_select_own
on public.notifications
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy notifications_update_own
on public.notifications
for update
to authenticated
using ((select auth.uid()) = account_id)
with check ((select auth.uid()) = account_id);

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function private.validate_notification_character_owner()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.character_id is not null and not exists (
    select 1
    from public.characters c
    where c.id = new.character_id
      and c.account_id = new.account_id
  ) then
    raise exception 'Notification character must belong to the target account.';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_notification_character_owner() from public;

create trigger notifications_validate_character_owner
  before insert or update of account_id, character_id
  on public.notifications
  for each row
  execute function private.validate_notification_character_owner();

create table public.search_documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  document_type text not null check (length(trim(document_type)) > 0),
  entity_id uuid,
  owner_account_id uuid references public.accounts(id) on delete cascade,
  owner_character_id uuid references public.characters(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  subtitle text,
  body text not null default '',
  section text not null,
  subsection text,
  visibility text not null default 'campus' check (visibility in ('campus', 'owner')),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index search_documents_fts_idx
  on public.search_documents using gin(search_vector);
create index search_documents_owner_idx
  on public.search_documents(owner_account_id)
  where owner_account_id is not null;
create index search_documents_type_idx
  on public.search_documents(document_type);

alter table public.search_documents enable row level security;

create policy search_documents_select_visible
on public.search_documents
for select
to authenticated
using (
  visibility = 'campus'
  or owner_account_id = (select auth.uid())
);

grant select on public.search_documents to authenticated;

create or replace function public.search_hanami(
  p_query text,
  p_limit integer default 12
)
returns table (
  id uuid,
  document_type text,
  entity_id uuid,
  title text,
  subtitle text,
  section text,
  subsection text,
  rank real
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with parsed as (
    select websearch_to_tsquery('simple', trim(coalesce(p_query, ''))) as query
  )
  select
    d.id,
    d.document_type,
    d.entity_id,
    d.title,
    d.subtitle,
    d.section,
    d.subsection,
    ts_rank_cd(d.search_vector, parsed.query)::real as rank
  from public.search_documents d
  cross join parsed
  where length(trim(coalesce(p_query, ''))) > 0
    and d.search_vector @@ parsed.query
  order by rank desc, d.title asc
  limit greatest(1, least(coalesce(p_limit, 12), 30));
$$;

grant execute on function public.search_hanami(text, integer) to authenticated;

insert into public.search_documents (
  source_key, document_type, title, subtitle, body, section, subsection, visibility
)
values
  ('route:home:overview', 'route', 'Hanami Home', 'Campus overview', 'home dashboard announcements schedule network', 'home', 'overview', 'campus'),
  ('route:home:announcements', 'route', 'Announcements', 'Hanami Home', 'school announcements notices updates', 'home', 'announcements', 'campus'),
  ('route:home:calendar', 'route', 'School Calendar', 'Hanami Home', 'calendar dates events school year', 'home', 'school-calendar', 'campus'),
  ('route:messages:inbox', 'route', 'Messages', 'Inbox', 'direct messages friends requests groups', 'messages', 'friends', 'campus'),
  ('route:social:feed', 'route', 'Social Feed', 'Your Circle', 'friends posts activity bulletins blogs guestbook', 'social', 'feed', 'campus'),
  ('route:academics:schedule', 'route', 'My Schedule', 'Academics', 'classes periods timetable school schedule', 'academics', 'my-schedule', 'campus'),
  ('route:academics:classes', 'route', 'Classes', 'Academics', 'courses teachers assignments grades', 'academics', 'classes', 'campus'),
  ('route:campus:events', 'route', 'Campus Events', 'Campus', 'school events festivals activities', 'campus', 'events', 'campus'),
  ('route:campus:clubs', 'route', 'Clubs', 'Campus', 'clubs organizations extracurriculars', 'campus', 'clubs', 'campus'),
  ('route:profile:view', 'route', 'My Profile', 'Profile', 'character profile public page', 'profile', 'view-profile', 'campus'),
  ('route:profile:studio', 'route', 'Profile Studio', 'Profile', 'customize widgets themes profile editor', 'profile', 'profile-studio', 'campus'),
  ('route:discover:students', 'route', 'Student Directory', 'Discover', 'find search students campus directory', 'discover', 'students', 'campus'),
  ('route:petals:balance', 'route', 'Petals Wallet', 'Petals', 'balance rewards earning history currency', 'petals', 'balance', 'campus'),
  ('route:boutique:featured', 'route', 'Hanami Boutique', 'Boutique', 'featured rewards frames effects nameplates', 'boutique', 'featured', 'campus'),
  ('route:achievements:mine', 'route', 'Achievements', 'Milestones', 'achievements collections school history', 'achievements', 'my-achievements', 'campus'),
  ('route:settings:account', 'route', 'Settings', 'Hanami Settings', 'account character privacy notifications accessibility connections', 'settings', 'account', 'campus')
on conflict (source_key) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  body = excluded.body,
  section = excluded.section,
  subsection = excluded.subsection,
  visibility = excluded.visibility,
  updated_at = now();

create or replace function private.sync_character_search_document()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_source_key text;
  v_title text;
begin
  if tg_op = 'DELETE' then
    delete from public.search_documents
    where source_key = 'character:' || old.id::text;
    return old;
  end if;

  v_source_key := 'character:' || new.id::text;
  v_title := coalesce(
    nullif(trim(new.display_name), ''),
    nullif(trim(concat_ws(' ', new.first_name, new.last_name)), ''),
    'Hanami Student'
  );

  if new.character_state = 'active' then
    insert into public.search_documents (
      source_key,
      document_type,
      entity_id,
      owner_account_id,
      owner_character_id,
      title,
      subtitle,
      body,
      section,
      subsection,
      visibility
    ) values (
      v_source_key,
      'character',
      new.id,
      new.account_id,
      new.id,
      v_title,
      case
        when new.school_role is null then 'Hanami Student'
        else initcap(replace(new.school_role, '_', ' '))
      end,
      concat_ws(' ', new.first_name, new.last_name, new.display_name, new.handle),
      'discover',
      'students',
      'campus'
    )
    on conflict (source_key) do update set
      entity_id = excluded.entity_id,
      owner_account_id = excluded.owner_account_id,
      owner_character_id = excluded.owner_character_id,
      title = excluded.title,
      subtitle = excluded.subtitle,
      body = excluded.body,
      section = excluded.section,
      subsection = excluded.subsection,
      visibility = excluded.visibility,
      updated_at = now();
  else
    delete from public.search_documents where source_key = v_source_key;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_character_search_document() from public;

create trigger characters_search_document_sync
  after insert or update of character_state, display_name, first_name, last_name, handle, school_role, account_id
  or delete on public.characters
  for each row
  execute function private.sync_character_search_document();

insert into public.search_documents (
  source_key,
  document_type,
  entity_id,
  owner_account_id,
  owner_character_id,
  title,
  subtitle,
  body,
  section,
  subsection,
  visibility
)
select
  'character:' || c.id::text,
  'character',
  c.id,
  c.account_id,
  c.id,
  coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  ),
  case
    when c.school_role is null then 'Hanami Student'
    else initcap(replace(c.school_role, '_', ' '))
  end,
  concat_ws(' ', c.first_name, c.last_name, c.display_name, c.handle),
  'discover',
  'students',
  'campus'
from public.characters c
where c.character_state = 'active'
on conflict (source_key) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  body = excluded.body,
  updated_at = now();