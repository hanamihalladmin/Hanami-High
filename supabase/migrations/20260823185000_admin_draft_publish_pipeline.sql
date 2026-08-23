create or replace function public.admin_publish_content_draft(target_draft_id uuid, force_publish boolean default false)
returns text
language plpgsql
security definer
set search_path=public,private
as $$
declare
  d public.admin_content_drafts%rowtype;
  a record;
  publish_time timestamptz;
  rp_day date;
begin
  select * into a from public.current_account_admin_access() limit 1;
  if not coalesce(a.site_admin,false) and not coalesce(a.content_editor,false) then
    raise exception 'Content editor permission required.';
  end if;

  select * into d from public.admin_content_drafts where id=target_draft_id for update;
  if d.id is null then raise exception 'Draft not found.'; end if;
  if d.status='published' then return 'already_published'; end if;
  if d.scheduled_for is not null and d.scheduled_for>now() and not force_publish then
    raise exception 'Draft is scheduled for a future time.';
  end if;

  publish_time:=coalesce(d.scheduled_for,now());
  rp_day:=make_date(2006,extract(month from timezone('Asia/Tokyo',publish_time))::int,extract(day from timezone('Asia/Tokyo',publish_time))::int);

  case d.draft_type
    when 'announcement' then
      insert into public.site_announcements(title,body,category,status,featured,published_at,created_by,audience_scope,severity,requires_acknowledgement)
      values(d.title,coalesce(d.content->>'body',''),case when coalesce(d.content->>'category','general') in ('general','event','urgent') then (coalesce(d.content->>'category','general'))::announcement_category else 'general'::announcement_category end,'published',coalesce((d.content->>'featured')::boolean,false),now(),auth.uid(),coalesce(nullif(d.content->>'audience_scope',''),'schoolwide'),coalesce(nullif(d.content->>'severity',''),'info'),coalesce((d.content->>'requires_acknowledgement')::boolean,false));
    when 'newspaper' then
      insert into public.newspaper_articles(author_character_id,section,headline,dek,body,status,approved_by,published_at)
      values(null,coalesce(nullif(d.content->>'section',''),'news'),d.title,coalesce(d.content->>'dek',''),coalesce(d.content->>'body',''),'published',auth.uid(),now());
    when 'roleplay_prompt' then
      insert into public.roleplay_calendar_entries(cadence,roleplay_date,title,prompt,continuity_summary,category,status,created_by,published_at)
      values(case when coalesce(d.content->>'cadence','daily') in ('daily','weekly') then coalesce(d.content->>'cadence','daily') else 'daily' end,rp_day,d.title,coalesce(d.content->>'body',''),coalesce(d.content->>'continuity_summary',''),coalesce(nullif(d.content->>'category',''),'school_life'),'published',auth.uid(),now());
    when 'event' then
      insert into public.school_calendar_events(title,description,location,starts_at,ends_at,all_day,category,status,featured,created_by)
      values(d.title,coalesce(d.content->>'body',''),nullif(d.content->>'location',''),publish_time,publish_time+interval '1 hour',false,'general','published',coalesce((d.content->>'featured')::boolean,false),auth.uid());
    else
      raise exception 'Draft type % must be published through its dedicated school tool.',d.draft_type;
  end case;

  update public.admin_content_drafts set status='published',updated_by=auth.uid(),updated_at=now() where id=d.id;
  return 'published';
end;
$$;

create or replace function public.admin_publish_due_content_drafts()
returns integer
language plpgsql
security definer
set search_path=public,private
as $$
declare
  a record;
  item record;
  published_count integer:=0;
begin
  select * into a from public.current_account_admin_access() limit 1;
  if not coalesce(a.site_admin,false) and not coalesce(a.content_editor,false) then
    raise exception 'Content editor permission required.';
  end if;

  for item in select id from public.admin_content_drafts where status='ready' and scheduled_for is not null and scheduled_for<=now() and draft_type in ('announcement','newspaper','roleplay_prompt','event') order by scheduled_for asc
  loop
    perform public.admin_publish_content_draft(item.id,false);
    published_count:=published_count+1;
  end loop;
  return published_count;
end;
$$;

revoke all on function public.admin_publish_content_draft(uuid,boolean) from public,anon;
revoke all on function public.admin_publish_due_content_drafts() from public,anon;
grant execute on function public.admin_publish_content_draft(uuid,boolean) to authenticated;
grant execute on function public.admin_publish_due_content_drafts() to authenticated;
