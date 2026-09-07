alter table public.search_documents
  drop constraint search_documents_visibility_check;

alter table public.search_documents
  add constraint search_documents_visibility_check
  check (visibility in ('campus', 'friends', 'owner'));

drop policy if exists search_documents_select_visible on public.search_documents;
create policy search_documents_select_visible
on public.search_documents
for select
to authenticated
using (
  owner_account_id = (select auth.uid())
  or visibility = 'campus'
  or (
    visibility = 'friends'
    and owner_character_id is not null
    and exists (
      select 1
      from public.accounts a
      join public.friendships f
        on f.status = 'accepted'
       and (
         (f.requester_character_id = owner_character_id and f.addressee_character_id = a.active_character_id)
         or (f.addressee_character_id = owner_character_id and f.requester_character_id = a.active_character_id)
       )
      where a.id = (select auth.uid())
        and a.active_character_id is not null
    )
  )
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_character_id uuid not null references public.characters(id) on delete cascade,
  post_type text not null check (post_type in ('status', 'bulletin', 'blog')),
  state text not null default 'published' check (state in ('draft', 'published', 'archived')),
  visibility text not null default 'hanami' check (visibility in ('hanami', 'friends', 'private')),
  title text,
  body text not null,
  comments_enabled boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(body)) between 1 and 20000),
  check (title is null or length(trim(title)) between 1 and 160),
  check (post_type <> 'blog' or title is not null),
  check (post_type <> 'status' or (title is null and length(body) <= 500)),
  check (post_type <> 'bulletin' or length(body) <= 4000)
);

create index social_posts_published_idx
  on public.social_posts(published_at desc)
  where state = 'published';
create index social_posts_author_created_idx
  on public.social_posts(author_character_id, created_at desc);
create index social_posts_type_published_idx
  on public.social_posts(post_type, published_at desc)
  where state = 'published';

alter table public.social_posts enable row level security;

create policy social_posts_select_visible
on public.social_posts
for select
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = social_posts.author_character_id
      and c.account_id = (select auth.uid())
  )
  or (
    state = 'published'
    and exists (
      select 1 from public.characters author
      where author.id = social_posts.author_character_id
        and author.character_state = 'active'
    )
    and (
      visibility = 'hanami'
      or (
        visibility = 'friends'
        and exists (
          select 1
          from public.accounts a
          join public.friendships f
            on f.status = 'accepted'
           and (
             (f.requester_character_id = social_posts.author_character_id and f.addressee_character_id = a.active_character_id)
             or (f.addressee_character_id = social_posts.author_character_id and f.requester_character_id = a.active_character_id)
           )
          where a.id = (select auth.uid())
            and a.active_character_id is not null
        )
      )
    )
  )
);

create policy social_posts_insert_active_character
on public.social_posts
for insert
to authenticated
with check (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
  and exists (
    select 1 from public.characters c
    where c.id = social_posts.author_character_id
      and c.account_id = (select auth.uid())
      and c.character_state = 'active'
  )
);

create policy social_posts_update_active_character
on public.social_posts
for update
to authenticated
using (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
)
with check (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
);

create policy social_posts_delete_active_character
on public.social_posts
for delete
to authenticated
using (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.social_posts to authenticated;

create or replace function private.prepare_social_post()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at := now();
  if new.state = 'published' then
    new.published_at := coalesce(new.published_at, now());
  elsif new.state = 'draft' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_social_post() from public, anon, authenticated;

create trigger social_posts_prepare
  before insert or update on public.social_posts
  for each row
  execute function private.prepare_social_post();

create or replace function private.sync_social_post_search_document()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_account_id uuid;
  v_title text;
  v_subsection text;
  v_search_visibility text;
begin
  if tg_op = 'DELETE' then
    delete from public.search_documents where source_key = 'social-post:' || old.id::text;
    return old;
  end if;

  select c.account_id into v_account_id
  from public.characters c
  where c.id = new.author_character_id;

  v_title := coalesce(nullif(trim(new.title), ''), nullif(left(regexp_replace(trim(new.body), '\s+', ' ', 'g'), 80), ''), 'Hanami Post');
  v_subsection := case new.post_type
    when 'blog' then 'blogs'
    when 'bulletin' then 'bulletins'
    else 'feed'
  end;
  v_search_visibility := case
    when new.state <> 'published' then 'owner'
    when new.visibility = 'hanami' then 'campus'
    when new.visibility = 'friends' then 'friends'
    else 'owner'
  end;

  if new.state = 'archived' then
    delete from public.search_documents where source_key = 'social-post:' || new.id::text;
    return new;
  end if;

  insert into public.search_documents (
    source_key, document_type, entity_id, owner_account_id, owner_character_id,
    title, subtitle, body, section, subsection, visibility
  ) values (
    'social-post:' || new.id::text,
    'social_post',
    new.id,
    v_account_id,
    new.author_character_id,
    v_title,
    initcap(new.post_type),
    new.body,
    'social',
    v_subsection,
    v_search_visibility
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

  return new;
end;
$$;

revoke all on function private.sync_social_post_search_document() from public, anon, authenticated;

create trigger social_posts_search_sync
  after insert or update of author_character_id, post_type, state, visibility, title, body
  or delete on public.social_posts
  for each row
  execute function private.sync_social_post_search_document();
