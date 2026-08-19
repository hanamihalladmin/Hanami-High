create table if not exists public.owner_bug_reports (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  source text not null check (source in ('client_runtime','qa','support','deployment','security','manual')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  title text not null check (char_length(title) between 2 and 220),
  details text not null default '' check (char_length(details)<=8000),
  affected_area text not null default 'unknown' check (char_length(affected_area)<=160),
  route text,
  reporter_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'detected' check (status in ('detected','investigating','fixed','ignored')),
  owner_notes text not null default '' check (char_length(owner_notes)<=6000),
  occurrences integer not null default 1 check (occurrences>0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fingerprint)
);
alter table public.owner_bug_reports enable row level security;
revoke all on public.owner_bug_reports from anon,authenticated;

create or replace function public.report_client_bug(
  bug_fingerprint text,
  bug_title text,
  bug_details text default '',
  bug_route text default null,
  bug_area text default 'website',
  bug_severity text default 'medium',
  bug_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=public,private,auth as $$
declare bug_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(coalesce(bug_fingerprint,''))<8 or char_length(coalesce(bug_fingerprint,''))>240 then raise exception 'Invalid bug fingerprint'; end if;
  if bug_severity not in ('low','medium','high','critical') then bug_severity:='medium'; end if;
  insert into public.owner_bug_reports(fingerprint,source,severity,title,details,affected_area,route,reporter_user_id,metadata)
  values(bug_fingerprint,'client_runtime',bug_severity,left(coalesce(bug_title,'Runtime error'),220),left(coalesce(bug_details,''),8000),left(coalesce(bug_area,'website'),160),left(bug_route,1000),auth.uid(),coalesce(bug_metadata,'{}'::jsonb))
  on conflict(fingerprint) do update set
    occurrences=public.owner_bug_reports.occurrences+1,
    last_seen_at=now(),
    details=excluded.details,
    route=coalesce(excluded.route,public.owner_bug_reports.route),
    metadata=public.owner_bug_reports.metadata||excluded.metadata,
    status=case when public.owner_bug_reports.status='fixed' then 'detected' else public.owner_bug_reports.status end,
    resolved_at=case when public.owner_bug_reports.status='fixed' then null else public.owner_bug_reports.resolved_at end,
    updated_at=now()
  returning id into bug_id;
  return bug_id;
end;$$;
revoke all on function public.report_client_bug(text,text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.report_client_bug(text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.owner_bug_detector_feed()
returns table(id uuid,source text,severity text,title text,details text,affected_area text,route text,status text,owner_notes text,occurrences integer,first_seen_at timestamptz,last_seen_at timestamptz,resolved_at timestamptz,metadata jsonb)
language plpgsql stable security definer set search_path=public,private,auth as $$
begin
  if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
  return query
  select b.id,b.source,b.severity,b.title,b.details,b.affected_area,b.route,b.status,b.owner_notes,b.occurrences,b.first_seen_at,b.last_seen_at,b.resolved_at,b.metadata
  from public.owner_bug_reports b
  order by case b.status when 'detected' then 1 when 'investigating' then 2 when 'fixed' then 3 else 4 end,
           case b.severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
           b.last_seen_at desc;
end;$$;
revoke all on function public.owner_bug_detector_feed() from public,anon,authenticated;
grant execute on function public.owner_bug_detector_feed() to authenticated;

create or replace function public.owner_update_bug_report(target_bug_id uuid,new_status text,new_notes text default null)
returns void
language plpgsql security definer set search_path=public,private,auth as $$
begin
  if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
  if new_status not in ('detected','investigating','fixed','ignored') then raise exception 'Invalid bug status'; end if;
  update public.owner_bug_reports
  set status=new_status,
      owner_notes=coalesce(new_notes,owner_notes),
      resolved_at=case when new_status in ('fixed','ignored') then now() else null end,
      updated_at=now()
  where id=target_bug_id;
  insert into public.system_audit_log(actor_user_id,action,target_type,target_id,details)
  values(auth.uid(),'owner_bug_status_updated','owner_bug_report',target_bug_id::text,jsonb_build_object('status',new_status));
end;$$;
revoke all on function public.owner_update_bug_report(uuid,text,text) from public,anon,authenticated;
grant execute on function public.owner_update_bug_report(uuid,text,text) to authenticated;

create or replace function public.owner_capture_bug_support_tickets()
returns integer
language plpgsql security definer set search_path=public,private,auth as $$
declare affected integer;
begin
  if not private.is_owner_discord_user() then raise exception 'Owner access required'; end if;
  insert into public.owner_bug_reports(fingerprint,source,severity,title,details,affected_area,route,metadata)
  select 'support:'||t.id::text,'support',case t.priority when 'urgent' then 'critical' when 'high' then 'high' when 'low' then 'low' else 'medium' end,
         left(t.subject,220),left(t.body,8000),'support','/portal/',jsonb_build_object('ticket_id',t.id,'category',t.category,'status',t.status,'tags',t.tags)
  from public.support_tickets t
  where (t.category='bug' or 'bug'=any(t.tags)) and t.status not in ('resolved','closed')
  on conflict(fingerprint) do update set last_seen_at=now(),details=excluded.details,metadata=excluded.metadata,updated_at=now();
  get diagnostics affected = row_count;
  return affected;
end;$$;
revoke all on function public.owner_capture_bug_support_tickets() from public,anon,authenticated;
grant execute on function public.owner_capture_bug_support_tickets() to authenticated;
