begin;

create table private.account_signin_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  signed_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index account_signin_events_account_time_idx
  on private.account_signin_events(account_id,signed_in_at desc);

revoke all on private.account_signin_events from public,anon,authenticated;

create or replace function public.record_my_signin()
returns timestamptz
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_time timestamptz := now();
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.accounts where id=v_account) then raise exception 'Hanami account not found' using errcode='P0002'; end if;

  -- Ignore rapid duplicate calls caused by app remounts/retries.
  if exists(
    select 1 from private.account_signin_events e
    where e.account_id=v_account and e.signed_in_at>now()-interval '2 minutes'
  ) then
    select max(e.signed_in_at) into v_time
    from private.account_signin_events e where e.account_id=v_account;
    return v_time;
  end if;

  insert into private.account_signin_events(account_id,signed_in_at)
  values(v_account,v_time);
  return v_time;
end;
$$;
revoke all on function public.record_my_signin() from public,anon;
grant execute on function public.record_my_signin() to authenticated;

create or replace function public.owner_account_tracking_summary()
returns table(
  account_id uuid,
  discord_user_id text,
  discord_username text,
  account_state text,
  account_created_at timestamptz,
  first_recorded_signin_at timestamptz,
  last_recorded_signin_at timestamptz,
  recorded_signin_count bigint,
  character_count bigint,
  lock_enabled boolean,
  pin_issued_at timestamptz,
  wallpaper_configured boolean,
  locked_until timestamptz,
  moderation_report_count bigint
)
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then
    raise exception 'Account management access required' using errcode='42501';
  end if;

  return query
  select
    a.id,
    a.discord_user_id,
    a.discord_username,
    a.account_state,
    a.created_at,
    min(s.signed_in_at),
    max(s.signed_in_at),
    count(distinct s.id),
    count(distinct c.id),
    (l.pin_hash is not null),
    l.pin_issued_at,
    (l.wallpaper_path is not null),
    l.locked_until,
    count(distinct r.id)
  from public.accounts a
  left join private.account_signin_events s on s.account_id=a.id
  left join public.characters c on c.account_id=a.id
  left join public.account_lockscreens l on l.account_id=a.id
  left join public.moderation_reports r on r.target_character_id=c.id
  group by a.id,a.discord_user_id,a.discord_username,a.account_state,a.created_at,l.pin_hash,l.pin_issued_at,l.wallpaper_path,l.locked_until
  order by a.created_at;
end;
$$;
revoke all on function public.owner_account_tracking_summary() from public,anon;
grant execute on function public.owner_account_tracking_summary() to authenticated;

create or replace function public.owner_signin_events(p_limit integer default 2000)
returns table(event_id uuid,account_id uuid,discord_username text,signed_in_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if not private.account_has_capability(v_actor,'accounts.manage'::extensions.citext) then
    raise exception 'Account management access required' using errcode='42501';
  end if;
  return query
  select e.id,e.account_id,a.discord_username,e.signed_in_at
  from private.account_signin_events e
  join public.accounts a on a.id=e.account_id
  order by e.signed_in_at desc
  limit greatest(1,least(coalesce(p_limit,2000),10000));
end;
$$;
revoke all on function public.owner_signin_events(integer) from public,anon;
grant execute on function public.owner_signin_events(integer) to authenticated;

commit;
