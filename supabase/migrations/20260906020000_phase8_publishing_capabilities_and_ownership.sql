-- Phase 8: school publishing capability bridge and ownership boundaries.

create or replace function private.account_has_publishing_capability(target_user uuid, requested_capability text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select case lower(trim(coalesce(requested_capability,'')))
    when 'chronicle_publish' then
      private.account_has_permission(target_user, 'site_admin'::public.hanami_account_permission)
      or private.account_has_permission(target_user, 'content_editor'::public.hanami_account_permission)
      or exists (
        select 1 from public.characters c
        join public.newspaper_editors e on e.character_id=c.id
        where c.owner_user_id=target_user and c.is_active=true
      )
    when 'yearbook_manage' then
      private.account_has_permission(target_user, 'site_admin'::public.hanami_account_permission)
      or private.account_has_permission(target_user, 'content_editor'::public.hanami_account_permission)
    when 'announcement_publish' then
      private.account_has_permission(target_user, 'site_admin'::public.hanami_account_permission)
      or private.account_has_permission(target_user, 'content_editor'::public.hanami_account_permission)
    when 'event_publish' then
      private.account_has_permission(target_user, 'site_admin'::public.hanami_account_permission)
      or private.account_has_permission(target_user, 'content_editor'::public.hanami_account_permission)
    when 'club_manage' then
      private.account_has_permission(target_user, 'site_admin'::public.hanami_account_permission)
      or private.account_has_permission(target_user, 'content_editor'::public.hanami_account_permission)
    when 'opportunity_publish' then
      private.account_has_permission(target_user, 'site_admin'::public.hanami_account_permission)
      or private.account_has_permission(target_user, 'content_editor'::public.hanami_account_permission)
    else false
  end;
$$;

create or replace function public.current_publishing_capabilities()
returns table(
  chronicle_publish boolean,
  yearbook_manage boolean,
  announcement_publish boolean,
  event_publish boolean,
  club_manage boolean,
  opportunity_publish boolean
)
language sql
stable
security definer
set search_path=''
as $$
  select
    private.account_has_publishing_capability(auth.uid(),'chronicle_publish'),
    private.account_has_publishing_capability(auth.uid(),'yearbook_manage'),
    private.account_has_publishing_capability(auth.uid(),'announcement_publish'),
    private.account_has_publishing_capability(auth.uid(),'event_publish'),
    private.account_has_publishing_capability(auth.uid(),'club_manage'),
    private.account_has_publishing_capability(auth.uid(),'opportunity_publish');
$$;
revoke all on function public.current_publishing_capabilities() from public,anon;
grant execute on function public.current_publishing_capabilities() to authenticated;

alter table public.newspaper_articles alter column author_character_id drop not null;

drop policy if exists "approved editors create newspaper articles" on public.newspaper_articles;
create policy "chronicle capable editors create newspaper articles"
on public.newspaper_articles for insert to authenticated
with check (
  private.account_has_publishing_capability(auth.uid(),'chronicle_publish')
  and (
    author_character_id is null
    or exists (select 1 from public.characters c where c.id=newspaper_articles.author_character_id and c.owner_user_id=auth.uid())
    or private.account_has_permission(auth.uid(),'content_editor'::public.hanami_account_permission)
    or private.account_has_permission(auth.uid(),'site_admin'::public.hanami_account_permission)
  )
);

drop policy if exists "authors and content staff edit newspaper articles" on public.newspaper_articles;
create policy "chronicle capable editors update newspaper articles"
on public.newspaper_articles for update to authenticated
using (
  private.account_has_publishing_capability(auth.uid(),'chronicle_publish')
  and (
    author_character_id is null
    or exists (select 1 from public.characters c where c.id=newspaper_articles.author_character_id and c.owner_user_id=auth.uid())
    or private.account_has_permission(auth.uid(),'content_editor'::public.hanami_account_permission)
    or private.account_has_permission(auth.uid(),'site_admin'::public.hanami_account_permission)
  )
)
with check (
  private.account_has_publishing_capability(auth.uid(),'chronicle_publish')
  and (
    author_character_id is null
    or exists (select 1 from public.characters c where c.id=newspaper_articles.author_character_id and c.owner_user_id=auth.uid())
    or private.account_has_permission(auth.uid(),'content_editor'::public.hanami_account_permission)
    or private.account_has_permission(auth.uid(),'site_admin'::public.hanami_account_permission)
  )
);

create or replace function public.save_my_yearbook_profile(
  target_character_id uuid,
  requested_portrait_url text default null,
  requested_quote text default '',
  requested_clubs_sports text[] default '{}'::text[],
  requested_awards text[] default '{}'::text[],
  requested_most_likely_to text[] default '{}'::text[],
  requested_memories text default ''
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare existing_locked timestamptz;
begin
  if not public.current_user_owns_character(target_character_id) then raise exception 'Character ownership required'; end if;
  select y.locked_at into existing_locked from public.yearbook_profiles y where y.character_id=target_character_id;
  if existing_locked is not null then raise exception 'This yearbook profile is locked for archive'; end if;
  insert into public.yearbook_profiles(character_id,portrait_url,quote,clubs_sports,awards,most_likely_to,memories,approved,locked_at,updated_at)
  values(target_character_id,nullif(trim(coalesce(requested_portrait_url,'')),''),left(coalesce(requested_quote,''),1000),coalesce(requested_clubs_sports,'{}'::text[]),coalesce(requested_awards,'{}'::text[]),coalesce(requested_most_likely_to,'{}'::text[]),left(coalesce(requested_memories,''),10000),false,null,now())
  on conflict(character_id) do update set portrait_url=excluded.portrait_url,quote=excluded.quote,clubs_sports=excluded.clubs_sports,awards=excluded.awards,most_likely_to=excluded.most_likely_to,memories=excluded.memories,approved=false,updated_at=now();
end;
$$;
revoke all on function public.save_my_yearbook_profile(uuid,text,text,text[],text[],text[],text) from public,anon;
grant execute on function public.save_my_yearbook_profile(uuid,text,text,text[],text[],text[],text) to authenticated;

create or replace function public.set_yearbook_publication_state(target_character_id uuid,requested_approved boolean,requested_locked boolean default false)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.account_has_publishing_capability(auth.uid(),'yearbook_manage') then raise exception 'yearbook_manage capability required'; end if;
  update public.yearbook_profiles set approved=coalesce(requested_approved,false),locked_at=case when requested_locked then coalesce(locked_at,now()) else null end,updated_at=now() where character_id=target_character_id;
  if not found then raise exception 'Yearbook profile not found'; end if;
end;
$$;
revoke all on function public.set_yearbook_publication_state(uuid,boolean,boolean) from public,anon;
grant execute on function public.set_yearbook_publication_state(uuid,boolean,boolean) to authenticated;

drop policy if exists "yearbook_profiles_self_manage" on public.yearbook_profiles;
create policy "yearbook_profiles_owner_delete" on public.yearbook_profiles for delete to authenticated using (public.current_user_owns_character(character_id) and locked_at is null and approved=false);

create or replace function public.admin_publish_content_draft(target_draft_id uuid, force_publish boolean default false)
returns text
language plpgsql
security definer
set search_path='public','private'
as $$
declare d public.admin_content_drafts%rowtype; publish_time timestamptz; rp_day date; required_capability text;
begin
  select * into d from public.admin_content_drafts where id=target_draft_id for update;
  if d.id is null then raise exception 'Draft not found.'; end if;
  if d.status='published' then return 'already_published'; end if;
  if d.scheduled_for is not null and d.scheduled_for>now() and not force_publish then raise exception 'Draft is scheduled for a future time.'; end if;
  required_capability:=case d.draft_type when 'announcement' then 'announcement_publish' when 'event' then 'event_publish' when 'newspaper' then 'chronicle_publish' when 'roleplay_prompt' then 'announcement_publish' else null end;
  if required_capability is null or not private.account_has_publishing_capability(auth.uid(),required_capability) then raise exception 'Publishing capability required for %.',d.draft_type; end if;
  publish_time:=coalesce(d.scheduled_for,now());
  rp_day:=make_date(2006,extract(month from timezone('Asia/Tokyo',publish_time))::int,extract(day from timezone('Asia/Tokyo',publish_time))::int);
  case d.draft_type
    when 'announcement' then insert into public.site_announcements(title,body,category,status,featured,published_at,created_by,audience_scope,severity,requires_acknowledgement) values(d.title,coalesce(d.content->>'body',''),case when coalesce(d.content->>'category','general') in ('general','event','urgent') then (coalesce(d.content->>'category','general'))::public.announcement_category else 'general'::public.announcement_category end,'published',coalesce((d.content->>'featured')::boolean,false),now(),auth.uid(),coalesce(nullif(d.content->>'audience_scope',''),'schoolwide'),coalesce(nullif(d.content->>'severity',''),'info'),coalesce((d.content->>'requires_acknowledgement')::boolean,false));
    when 'newspaper' then insert into public.newspaper_articles(author_character_id,section,headline,dek,body,status,approved_by,published_at) values(null,coalesce(nullif(d.content->>'section',''),'news'),d.title,coalesce(d.content->>'dek',''),coalesce(d.content->>'body',''),'published',auth.uid(),now());
    when 'roleplay_prompt' then insert into public.roleplay_calendar_entries(cadence,roleplay_date,title,prompt,continuity_summary,category,status,created_by,published_at) values(case when coalesce(d.content->>'cadence','daily') in ('daily','weekly') then coalesce(d.content->>'cadence','daily') else 'daily' end,rp_day,d.title,coalesce(d.content->>'body',''),coalesce(d.content->>'continuity_summary',''),coalesce(nullif(d.content->>'category',''),'school_life'),'published',auth.uid(),now());
    when 'event' then insert into public.school_calendar_events(title,description,location,starts_at,ends_at,all_day,category,status,featured,created_by) values(d.title,coalesce(d.content->>'body',''),nullif(d.content->>'location',''),publish_time,publish_time+interval '1 hour',false,'general','published',coalesce((d.content->>'featured')::boolean,false),auth.uid());
    else raise exception 'Draft type % must be published through its dedicated school tool.',d.draft_type;
  end case;
  update public.admin_content_drafts set status='published',updated_by=auth.uid(),updated_at=now() where id=d.id;
  return 'published';
end;
$$;
