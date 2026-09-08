begin;

create table public.creator_release_events (
  id uuid primary key default gen_random_uuid(),
  creator_account_id uuid not null references public.accounts(id) on delete cascade,
  release_type text not null check (release_type in ('theme','theme_version','widget_kit','widget_kit_version','collection')),
  source_id uuid not null,
  source_title text not null,
  version_no integer,
  summary text,
  created_at timestamptz not null default now()
);

create index creator_release_events_creator_created_idx on public.creator_release_events(creator_account_id,created_at desc);
create index creator_release_events_created_idx on public.creator_release_events(created_at desc);

alter table public.creator_release_events enable row level security;
revoke all on public.creator_release_events from anon;
grant select on public.creator_release_events to authenticated;

create policy creator_release_events_visible on public.creator_release_events
for select to authenticated using (
  case release_type
    when 'theme' then exists(select 1 from public.creator_theme_listings l where l.id=source_id and l.state='published' and l.visibility='public')
    when 'theme_version' then exists(select 1 from public.creator_theme_listings l where l.id=source_id and l.state='published' and l.visibility='public')
    when 'widget_kit' then exists(select 1 from public.creator_widget_kits k where k.id=source_id and k.state='published' and k.visibility='public')
    when 'widget_kit_version' then exists(select 1 from public.creator_widget_kits k where k.id=source_id and k.state='published' and k.visibility='public')
    when 'collection' then exists(select 1 from public.creator_collections c where c.id=source_id and c.visibility='public')
    else false
  end
);

create or replace function private.notify_creator_followers(
  p_creator_account_id uuid,
  p_release_type text,
  p_source_id uuid,
  p_source_title text,
  p_version_no integer default null,
  p_summary text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  v_creator_name text;
  v_title text;
  v_body text;
begin
  select coalesce(cp.display_name,'Hanami Creator') into v_creator_name
  from public.creator_profiles cp where cp.account_id=p_creator_account_id;

  v_title := case p_release_type
    when 'theme' then v_creator_name||' published a new theme'
    when 'theme_version' then v_creator_name||' updated a theme'
    when 'widget_kit' then v_creator_name||' published a new component kit'
    when 'widget_kit_version' then v_creator_name||' updated a component kit'
    when 'collection' then v_creator_name||' shared a creator collection'
    else v_creator_name||' published something new'
  end;

  v_body := p_source_title || case when p_version_no is not null then ' · version '||p_version_no::text else '' end;

  insert into public.notifications(account_id,kind,title,body,section,subsection,metadata)
  select f.follower_account_id,
         'creator_release',
         v_title,
         v_body,
         'hanami-plus',
         'following',
         jsonb_build_object(
           'creator_account_id',p_creator_account_id,
           'release_type',p_release_type,
           'source_id',p_source_id,
           'source_title',p_source_title,
           'version_no',p_version_no
         )
  from public.creator_follows f
  left join public.account_preferences ap on ap.account_id=f.follower_account_id
  where f.creator_account_id=p_creator_account_id
    and f.follower_account_id<>p_creator_account_id
    and coalesce(ap.notify_social,true);
end;
$$;

create or replace function private.record_creator_release(
  p_creator_account_id uuid,
  p_release_type text,
  p_source_id uuid,
  p_source_title text,
  p_version_no integer default null,
  p_summary text default null
) returns void
language plpgsql security definer set search_path='' as $$
begin
  insert into public.creator_release_events(creator_account_id,release_type,source_id,source_title,version_no,summary)
  values(p_creator_account_id,p_release_type,p_source_id,p_source_title,p_version_no,nullif(trim(coalesce(p_summary,'')),''));
  perform private.notify_creator_followers(p_creator_account_id,p_release_type,p_source_id,p_source_title,p_version_no,p_summary);
end;
$$;

create or replace function private.creator_theme_release_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.state='published' and new.visibility='public' then
    if (tg_op='INSERT') or old.state is distinct from 'published' or old.visibility is distinct from 'public' then
      perform private.record_creator_release(new.author_account_id,'theme',new.id,new.title,new.current_version,new.description);
    elsif new.current_version>coalesce(old.current_version,0) then
      perform private.record_creator_release(new.author_account_id,'theme_version',new.id,new.title,new.current_version,new.description);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists creator_theme_release_event on public.creator_theme_listings;
create trigger creator_theme_release_event after insert or update of state,visibility,current_version on public.creator_theme_listings
for each row execute function private.creator_theme_release_trigger();

create or replace function private.creator_widget_kit_release_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.state='published' and new.visibility='public' then
    if (tg_op='INSERT') or old.state is distinct from 'published' or old.visibility is distinct from 'public' then
      perform private.record_creator_release(new.author_account_id,'widget_kit',new.id,new.title,new.current_version,new.description);
    elsif new.current_version>coalesce(old.current_version,0) then
      perform private.record_creator_release(new.author_account_id,'widget_kit_version',new.id,new.title,new.current_version,new.description);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists creator_widget_kit_release_event on public.creator_widget_kits;
create trigger creator_widget_kit_release_event after insert or update of state,visibility,current_version on public.creator_widget_kits
for each row execute function private.creator_widget_kit_release_trigger();

create or replace function private.creator_collection_release_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.visibility='public' and ((tg_op='INSERT') or old.visibility is distinct from 'public') then
    perform private.record_creator_release(new.owner_account_id,'collection',new.id,new.title,null,new.description);
  end if;
  return new;
end;
$$;

drop trigger if exists creator_collection_release_event on public.creator_collections;
create trigger creator_collection_release_event after insert or update of visibility on public.creator_collections
for each row execute function private.creator_collection_release_trigger();

create or replace function public.creator_following_feed(p_limit integer default 50)
returns table(
  release_id uuid,
  creator_account_id uuid,
  creator_name text,
  creator_slug text,
  creator_avatar_url text,
  release_type text,
  source_id uuid,
  source_title text,
  version_no integer,
  summary text,
  released_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select e.id,
         e.creator_account_id,
         cp.display_name,
         cp.creator_slug,
         cp.avatar_url,
         e.release_type,
         e.source_id,
         e.source_title,
         e.version_no,
         e.summary,
         e.created_at
  from public.creator_release_events e
  join public.creator_follows f on f.creator_account_id=e.creator_account_id and f.follower_account_id=(select auth.uid())
  join public.creator_profiles cp on cp.account_id=e.creator_account_id and cp.portfolio_visibility in ('public','unlisted')
  where case e.release_type
    when 'theme' then exists(select 1 from public.creator_theme_listings l where l.id=e.source_id and l.state='published' and l.visibility='public')
    when 'theme_version' then exists(select 1 from public.creator_theme_listings l where l.id=e.source_id and l.state='published' and l.visibility='public')
    when 'widget_kit' then exists(select 1 from public.creator_widget_kits k where k.id=e.source_id and k.state='published' and k.visibility='public')
    when 'widget_kit_version' then exists(select 1 from public.creator_widget_kits k where k.id=e.source_id and k.state='published' and k.visibility='public')
    when 'collection' then exists(select 1 from public.creator_collections c where c.id=e.source_id and c.visibility='public')
    else false
  end
  order by e.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),100));
$$;

revoke all on function public.creator_following_feed(integer) from public,anon;
grant execute on function public.creator_following_feed(integer) to authenticated;

commit;
