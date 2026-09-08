begin;

create table public.creator_profiles (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  primary_character_id uuid references public.characters(id) on delete set null,
  creator_slug text not null unique check (creator_slug ~ '^[a-z0-9_-]{3,32}$'),
  display_name text not null check (length(display_name) between 1 and 60),
  bio text check (bio is null or length(bio) <= 600),
  banner_url text,
  avatar_url text,
  portfolio_visibility text not null default 'public' check (portfolio_visibility in ('public','unlisted','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_theme_listings (
  id uuid primary key default gen_random_uuid(),
  author_account_id uuid not null references public.accounts(id) on delete cascade,
  author_character_id uuid references public.characters(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9_-]{3,48}$'),
  title text not null check (length(title) between 1 and 80),
  description text check (description is null or length(description) <= 1000),
  preview_image_url text,
  tags text[] not null default '{}',
  state text not null default 'draft' check (state in ('draft','published','hidden','retired')),
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  current_version integer not null default 0 check (current_version >= 0),
  download_count bigint not null default 0 check (download_count >= 0),
  favorite_count bigint not null default 0 check (favorite_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_theme_versions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  theme_payload jsonb not null,
  changelog text check (changelog is null or length(changelog) <= 1000),
  created_at timestamptz not null default now(),
  unique(listing_id,version_no)
);

create table public.creator_theme_favorites (
  account_id uuid not null references public.accounts(id) on delete cascade,
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(account_id,listing_id)
);

create table public.creator_theme_ratings (
  account_id uuid not null references public.accounts(id) on delete cascade,
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key(account_id,listing_id)
);

create table public.creator_theme_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  author_account_id uuid not null references public.accounts(id) on delete cascade,
  author_character_id uuid references public.characters(id) on delete set null,
  body text not null check (length(body) between 1 and 800),
  state text not null default 'visible' check (state in ('visible','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_follows (
  follower_account_id uuid not null references public.accounts(id) on delete cascade,
  creator_account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_account_id,creator_account_id),
  check(follower_account_id <> creator_account_id)
);

create table public.creator_collections (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  description text check (description is null or length(description) <= 500),
  visibility text not null default 'private' check (visibility in ('public','unlisted','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_collection_items (
  collection_id uuid not null references public.creator_collections(id) on delete cascade,
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  sort_order integer not null default 0,
  added_at timestamptz not null default now(),
  primary key(collection_id,listing_id)
);

create table public.creator_theme_gifts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  version_id uuid references public.creator_theme_versions(id) on delete set null,
  sender_account_id uuid not null references public.accounts(id) on delete cascade,
  recipient_account_id uuid not null references public.accounts(id) on delete cascade,
  gift_message text check (gift_message is null or length(gift_message) <= 280),
  status text not null default 'delivered' check (status in ('delivered','opened','declined')),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  check(sender_account_id <> recipient_account_id)
);

create table public.creator_contests (
  id uuid primary key default gen_random_uuid(),
  contest_key text not null unique,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  voting_ends_at timestamptz,
  state text not null default 'draft' check (state in ('draft','open','voting','closed','archived')),
  rules jsonb not null default '{}'::jsonb,
  reward_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at > starts_at),
  check(voting_ends_at is null or voting_ends_at >= ends_at)
);

create table public.creator_contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.creator_contests(id) on delete cascade,
  listing_id uuid not null references public.creator_theme_listings(id) on delete cascade,
  entrant_account_id uuid not null references public.accounts(id) on delete cascade,
  submitted_version_id uuid references public.creator_theme_versions(id) on delete set null,
  caption text check (caption is null or length(caption) <= 500),
  state text not null default 'submitted' check (state in ('submitted','withdrawn','disqualified','winner')),
  submitted_at timestamptz not null default now(),
  unique(contest_id,entrant_account_id,listing_id)
);

create index creator_theme_listings_browse_idx on public.creator_theme_listings(state,visibility,published_at desc);
create index creator_theme_listings_author_idx on public.creator_theme_listings(author_account_id,updated_at desc);
create index creator_theme_versions_listing_idx on public.creator_theme_versions(listing_id,version_no desc);
create index creator_theme_comments_listing_idx on public.creator_theme_comments(listing_id,created_at desc);
create index creator_follows_creator_idx on public.creator_follows(creator_account_id,created_at desc);
create index creator_contest_entries_contest_idx on public.creator_contest_entries(contest_id,submitted_at desc);

create trigger creator_profiles_touch_updated_at before update on public.creator_profiles for each row execute function private.touch_updated_at();
create trigger creator_theme_listings_touch_updated_at before update on public.creator_theme_listings for each row execute function private.touch_updated_at();
create trigger creator_theme_ratings_touch_updated_at before update on public.creator_theme_ratings for each row execute function private.touch_updated_at();
create trigger creator_theme_comments_touch_updated_at before update on public.creator_theme_comments for each row execute function private.touch_updated_at();
create trigger creator_collections_touch_updated_at before update on public.creator_collections for each row execute function private.touch_updated_at();
create trigger creator_contests_touch_updated_at before update on public.creator_contests for each row execute function private.touch_updated_at();

create or replace function private.account_has_active_hanami_plus(p_account_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.hanami_plus_entitlements e where e.account_id=p_account_id and e.ends_at>now());
$$;
revoke all on function private.account_has_active_hanami_plus(uuid) from public,anon,authenticated;

alter table public.creator_profiles enable row level security;
alter table public.creator_theme_listings enable row level security;
alter table public.creator_theme_versions enable row level security;
alter table public.creator_theme_favorites enable row level security;
alter table public.creator_theme_ratings enable row level security;
alter table public.creator_theme_comments enable row level security;
alter table public.creator_follows enable row level security;
alter table public.creator_collections enable row level security;
alter table public.creator_collection_items enable row level security;
alter table public.creator_theme_gifts enable row level security;
alter table public.creator_contests enable row level security;
alter table public.creator_contest_entries enable row level security;

create policy creator_profiles_read on public.creator_profiles for select to authenticated using (portfolio_visibility in ('public','unlisted') or account_id=(select auth.uid()));
create policy creator_profiles_plus_insert on public.creator_profiles for insert to authenticated with check (account_id=(select auth.uid()) and private.account_has_active_hanami_plus(account_id));
create policy creator_profiles_plus_update on public.creator_profiles for update to authenticated using (account_id=(select auth.uid()) and private.account_has_active_hanami_plus(account_id)) with check (account_id=(select auth.uid()));

create policy creator_theme_listings_read on public.creator_theme_listings for select to authenticated using ((state='published' and visibility in ('public','unlisted')) or author_account_id=(select auth.uid()));
create policy creator_theme_listings_plus_insert on public.creator_theme_listings for insert to authenticated with check (author_account_id=(select auth.uid()) and private.account_has_active_hanami_plus(author_account_id));
create policy creator_theme_listings_plus_update on public.creator_theme_listings for update to authenticated using (author_account_id=(select auth.uid()) and private.account_has_active_hanami_plus(author_account_id)) with check (author_account_id=(select auth.uid()));
create policy creator_theme_listings_plus_delete on public.creator_theme_listings for delete to authenticated using (author_account_id=(select auth.uid()) and private.account_has_active_hanami_plus(author_account_id));

create policy creator_theme_versions_read on public.creator_theme_versions for select to authenticated using (exists(select 1 from public.creator_theme_listings l where l.id=listing_id and ((l.state='published' and l.visibility in ('public','unlisted')) or l.author_account_id=(select auth.uid()))));

create policy creator_theme_favorites_read_self on public.creator_theme_favorites for select to authenticated using (account_id=(select auth.uid()));
create policy creator_theme_favorites_insert_self on public.creator_theme_favorites for insert to authenticated with check (account_id=(select auth.uid()) and exists(select 1 from public.creator_theme_listings l where l.id=listing_id and l.state='published' and l.visibility in ('public','unlisted')));
create policy creator_theme_favorites_delete_self on public.creator_theme_favorites for delete to authenticated using (account_id=(select auth.uid()));

create policy creator_theme_ratings_read on public.creator_theme_ratings for select to authenticated using (exists(select 1 from public.creator_theme_listings l where l.id=listing_id and l.state='published' and l.visibility in ('public','unlisted')) or account_id=(select auth.uid()));
create policy creator_theme_ratings_insert_self on public.creator_theme_ratings for insert to authenticated with check (account_id=(select auth.uid()));
create policy creator_theme_ratings_update_self on public.creator_theme_ratings for update to authenticated using (account_id=(select auth.uid())) with check (account_id=(select auth.uid()));
create policy creator_theme_ratings_delete_self on public.creator_theme_ratings for delete to authenticated using (account_id=(select auth.uid()));

create policy creator_theme_comments_read on public.creator_theme_comments for select to authenticated using (state='visible' and exists(select 1 from public.creator_theme_listings l where l.id=listing_id and l.state='published' and l.visibility in ('public','unlisted')) or author_account_id=(select auth.uid()));
create policy creator_theme_comments_insert_self on public.creator_theme_comments for insert to authenticated with check (author_account_id=(select auth.uid()) and exists(select 1 from public.characters c where c.id=author_character_id and c.account_id=(select auth.uid())));
create policy creator_theme_comments_update_self on public.creator_theme_comments for update to authenticated using (author_account_id=(select auth.uid())) with check (author_account_id=(select auth.uid()));

create policy creator_follows_read_self on public.creator_follows for select to authenticated using (follower_account_id=(select auth.uid()) or creator_account_id=(select auth.uid()));
create policy creator_follows_insert_self on public.creator_follows for insert to authenticated with check (follower_account_id=(select auth.uid()));
create policy creator_follows_delete_self on public.creator_follows for delete to authenticated using (follower_account_id=(select auth.uid()));

create policy creator_collections_read on public.creator_collections for select to authenticated using (owner_account_id=(select auth.uid()) or visibility in ('public','unlisted'));
create policy creator_collections_insert_self on public.creator_collections for insert to authenticated with check (owner_account_id=(select auth.uid()));
create policy creator_collections_update_self on public.creator_collections for update to authenticated using (owner_account_id=(select auth.uid())) with check (owner_account_id=(select auth.uid()));
create policy creator_collections_delete_self on public.creator_collections for delete to authenticated using (owner_account_id=(select auth.uid()));

create policy creator_collection_items_read on public.creator_collection_items for select to authenticated using (exists(select 1 from public.creator_collections c where c.id=collection_id and (c.owner_account_id=(select auth.uid()) or c.visibility in ('public','unlisted'))));
create policy creator_collection_items_insert_self on public.creator_collection_items for insert to authenticated with check (exists(select 1 from public.creator_collections c where c.id=collection_id and c.owner_account_id=(select auth.uid())));
create policy creator_collection_items_delete_self on public.creator_collection_items for delete to authenticated using (exists(select 1 from public.creator_collections c where c.id=collection_id and c.owner_account_id=(select auth.uid())));

create policy creator_theme_gifts_read_participant on public.creator_theme_gifts for select to authenticated using (sender_account_id=(select auth.uid()) or recipient_account_id=(select auth.uid()));
create policy creator_theme_gifts_insert_self on public.creator_theme_gifts for insert to authenticated with check (sender_account_id=(select auth.uid()) and exists(select 1 from public.creator_theme_listings l where l.id=listing_id and l.state='published' and l.visibility in ('public','unlisted')));
create policy creator_theme_gifts_update_recipient on public.creator_theme_gifts for update to authenticated using (recipient_account_id=(select auth.uid())) with check (recipient_account_id=(select auth.uid()));

create policy creator_contests_read on public.creator_contests for select to authenticated using (state in ('open','voting','closed','archived'));
create policy creator_contest_entries_read on public.creator_contest_entries for select to authenticated using (exists(select 1 from public.creator_contests c where c.id=contest_id and c.state in ('open','voting','closed','archived')));
create policy creator_contest_entries_plus_insert on public.creator_contest_entries for insert to authenticated with check (entrant_account_id=(select auth.uid()) and private.account_has_active_hanami_plus(entrant_account_id) and exists(select 1 from public.creator_contests c where c.id=contest_id and c.state='open' and now() between c.starts_at and c.ends_at));
create policy creator_contest_entries_self_update on public.creator_contest_entries for update to authenticated using (entrant_account_id=(select auth.uid())) with check (entrant_account_id=(select auth.uid()));

revoke all on public.creator_profiles,public.creator_theme_listings,public.creator_theme_versions,public.creator_theme_favorites,public.creator_theme_ratings,public.creator_theme_comments,public.creator_follows,public.creator_collections,public.creator_collection_items,public.creator_theme_gifts,public.creator_contests,public.creator_contest_entries from anon;
grant select,insert,update on public.creator_profiles to authenticated;
grant select,insert,update,delete on public.creator_theme_listings to authenticated;
grant select on public.creator_theme_versions to authenticated;
grant select,insert,delete on public.creator_theme_favorites to authenticated;
grant select,insert,update,delete on public.creator_theme_ratings to authenticated;
grant select,insert,update on public.creator_theme_comments to authenticated;
grant select,insert,delete on public.creator_follows to authenticated;
grant select,insert,update,delete on public.creator_collections to authenticated;
grant select,insert,delete on public.creator_collection_items to authenticated;
grant select,insert,update on public.creator_theme_gifts to authenticated;
grant select on public.creator_contests to authenticated;
grant select,insert,update on public.creator_contest_entries to authenticated;

create or replace function public.publish_creator_theme_version(p_listing_id uuid,p_theme_payload jsonb,p_changelog text default null)
returns table(version_id uuid,version_no integer,published_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_next integer;
  v_version uuid;
  v_now timestamptz := now();
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.account_has_active_hanami_plus(v_account) then raise exception 'Active Hanami+ required to publish creator themes' using errcode='42501'; end if;
  perform 1 from public.creator_theme_listings l where l.id=p_listing_id and l.author_account_id=v_account for update;
  if not found then raise exception 'Creator theme is unavailable' using errcode='42501'; end if;
  select coalesce(max(v.version_no),0)+1 into v_next from public.creator_theme_versions v where v.listing_id=p_listing_id;
  insert into public.creator_theme_versions(listing_id,version_no,theme_payload,changelog)
  values(p_listing_id,v_next,p_theme_payload,p_changelog) returning id into v_version;
  update public.creator_theme_listings set current_version=v_next,state='published',published_at=coalesce(published_at,v_now),updated_at=v_now where id=p_listing_id;
  return query select v_version,v_next,v_now;
end;
$$;
revoke all on function public.publish_creator_theme_version(uuid,jsonb,text) from public,anon;
grant execute on function public.publish_creator_theme_version(uuid,jsonb,text) to authenticated;

create or replace function public.toggle_creator_theme_favorite(p_listing_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_account uuid := (select auth.uid()); v_added boolean;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if exists(select 1 from public.creator_theme_favorites f where f.account_id=v_account and f.listing_id=p_listing_id) then
    delete from public.creator_theme_favorites where account_id=v_account and listing_id=p_listing_id;
    update public.creator_theme_listings set favorite_count=greatest(0,favorite_count-1) where id=p_listing_id;
    v_added := false;
  else
    if not exists(select 1 from public.creator_theme_listings l where l.id=p_listing_id and l.state='published' and l.visibility in ('public','unlisted')) then raise exception 'Theme listing unavailable' using errcode='P0002'; end if;
    insert into public.creator_theme_favorites(account_id,listing_id) values(v_account,p_listing_id);
    update public.creator_theme_listings set favorite_count=favorite_count+1 where id=p_listing_id;
    v_added := true;
  end if;
  return v_added;
end;
$$;
revoke all on function public.toggle_creator_theme_favorite(uuid) from public,anon;
grant execute on function public.toggle_creator_theme_favorite(uuid) to authenticated;

create or replace function public.record_creator_theme_use(p_listing_id uuid)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_count bigint;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.creator_theme_listings set download_count=download_count+1 where id=p_listing_id and state='published' and visibility in ('public','unlisted') returning download_count into v_count;
  if v_count is null then raise exception 'Theme listing unavailable' using errcode='P0002'; end if;
  return v_count;
end;
$$;
revoke all on function public.record_creator_theme_use(uuid) from public,anon;
grant execute on function public.record_creator_theme_use(uuid) to authenticated;

commit;
