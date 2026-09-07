create table public.social_post_reactions (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart', 'star', 'laugh', 'support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, character_id)
);

create index social_post_reactions_character_idx
  on public.social_post_reactions(character_id, created_at desc);

alter table public.social_post_reactions enable row level security;

create policy social_post_reactions_select_visible_post
on public.social_post_reactions
for select
to authenticated
using (
  exists (
    select 1 from public.social_posts p
    where p.id = social_post_reactions.post_id
      and p.state = 'published'
  )
);

create policy social_post_reactions_insert_active_character
on public.social_post_reactions
for insert
to authenticated
with check (
  character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_reactions.post_id
      and p.state = 'published'
  )
);

create policy social_post_reactions_update_active_character
on public.social_post_reactions
for update
to authenticated
using (
  character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
)
with check (
  character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
);

create policy social_post_reactions_delete_active_character
on public.social_post_reactions
for delete
to authenticated
using (
  character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.social_post_reactions to authenticated;

create table public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_character_id uuid not null references public.characters(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_post_comments_post_created_idx
  on public.social_post_comments(post_id, created_at);
create index social_post_comments_author_created_idx
  on public.social_post_comments(author_character_id, created_at desc);

alter table public.social_post_comments enable row level security;

create policy social_post_comments_select_visible_post
on public.social_post_comments
for select
to authenticated
using (
  exists (
    select 1 from public.social_posts p
    where p.id = social_post_comments.post_id
      and p.state = 'published'
  )
);

create policy social_post_comments_insert_active_character
on public.social_post_comments
for insert
to authenticated
with check (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_comments.post_id
      and p.state = 'published'
      and p.comments_enabled
  )
);

create policy social_post_comments_update_active_character
on public.social_post_comments
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

create policy social_post_comments_delete_author_or_post_owner
on public.social_post_comments
for delete
to authenticated
using (
  author_character_id = (
    select a.active_character_id from public.accounts a where a.id = (select auth.uid())
  )
  or exists (
    select 1 from public.social_posts p
    where p.id = social_post_comments.post_id
      and p.author_character_id = (
        select a.active_character_id from public.accounts a where a.id = (select auth.uid())
      )
  )
);

grant select, insert, update, delete on public.social_post_comments to authenticated;

create or replace function private.prepare_social_post_interaction()
returns trigger
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_social_post_interaction() from public, anon, authenticated;

create trigger social_post_reactions_prepare
  before update on public.social_post_reactions
  for each row execute function private.prepare_social_post_interaction();

create trigger social_post_comments_prepare
  before update on public.social_post_comments
  for each row execute function private.prepare_social_post_interaction();

create or replace function private.notify_social_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_post public.social_posts%rowtype;
  v_target_account_id uuid;
  v_commenter_name text;
begin
  select * into v_post
  from public.social_posts p
  where p.id = new.post_id;

  if not found or v_post.author_character_id = new.author_character_id then
    return new;
  end if;

  select c.account_id
  into v_target_account_id
  from public.characters c
  where c.id = v_post.author_character_id;

  select coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  )
  into v_commenter_name
  from public.characters c
  where c.id = new.author_character_id;

  insert into public.notifications (
    account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
  ) values (
    v_target_account_id,
    v_post.author_character_id,
    new.author_character_id,
    'post_comment',
    'New comment',
    v_commenter_name || ' commented on your ' || v_post.post_type || '.',
    'social',
    case v_post.post_type when 'blog' then 'blogs' when 'bulletin' then 'bulletins' else 'feed' end,
    jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
  );

  return new;
end;
$$;

revoke all on function private.notify_social_post_comment() from public, anon, authenticated;

create trigger social_post_comments_notify
  after insert on public.social_post_comments
  for each row execute function private.notify_social_post_comment();
