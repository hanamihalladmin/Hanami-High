begin;

create table if not exists public.hanami_plus_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until timestamptz,
  permanent boolean not null default false,
  last_source_type text,
  last_source_ref text,
  updated_at timestamptz not null default now(),
  check (permanent or active_until is not null)
);

create table if not exists public.hanami_plus_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_days integer,
  permanent boolean not null default false,
  source_type text not null check (source_type in ('petal_pass','milestone','event','activity_reward','gift','staff_award','community_award','bloom_day','permanent_unlock','migration')),
  source_ref text,
  note text,
  granted_at timestamptz not null default now(),
  check ((permanent and duration_days is null) or (not permanent and duration_days in (1,7,30)))
);
create index if not exists hanami_plus_grants_user_granted_idx on public.hanami_plus_grants(user_id,granted_at desc);

alter table public.hanami_plus_memberships enable row level security;
alter table public.hanami_plus_grants enable row level security;

revoke all on public.hanami_plus_memberships from anon, authenticated;
revoke all on public.hanami_plus_grants from anon, authenticated;
grant select on public.hanami_plus_memberships to authenticated;
grant select on public.hanami_plus_grants to authenticated;

drop policy if exists hanami_plus_membership_self on public.hanami_plus_memberships;
create policy hanami_plus_membership_self on public.hanami_plus_memberships for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists hanami_plus_grants_self on public.hanami_plus_grants;
create policy hanami_plus_grants_self on public.hanami_plus_grants for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.current_hanami_plus_status()
returns table(active boolean,permanent boolean,active_until timestamptz,last_source_type text,last_source_ref text)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(m.permanent or m.active_until > now(),false) as active,
    coalesce(m.permanent,false) as permanent,
    m.active_until,
    m.last_source_type,
    m.last_source_ref
  from (select auth.uid() as uid) u
  left join public.hanami_plus_memberships m on m.user_id = u.uid;
$$;
revoke execute on function public.current_hanami_plus_status() from public, anon;
grant execute on function public.current_hanami_plus_status() to authenticated;

create schema if not exists private;

create or replace function private.apply_hanami_plus_grant(
  target_user_id uuid,
  target_duration_days integer,
  target_permanent boolean,
  target_source_type text,
  target_source_ref text default null,
  target_note text default null
)
returns public.hanami_plus_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.hanami_plus_memberships;
  base_time timestamptz;
begin
  if target_user_id is null then raise exception 'Target user is required'; end if;
  if target_source_type not in ('petal_pass','milestone','event','activity_reward','gift','staff_award','community_award','bloom_day','permanent_unlock','migration') then raise exception 'Invalid Hanami+ grant source'; end if;
  if target_permanent then
    target_duration_days := null;
  elsif target_duration_days not in (1,7,30) then
    raise exception 'Hanami+ duration must be 1, 7, or 30 days';
  end if;

  insert into public.hanami_plus_grants(user_id,duration_days,permanent,source_type,source_ref,note)
  values(target_user_id,target_duration_days,target_permanent,target_source_type,target_source_ref,target_note);

  if target_permanent then
    insert into public.hanami_plus_memberships(user_id,active_until,permanent,last_source_type,last_source_ref,updated_at)
    values(target_user_id,null,true,target_source_type,target_source_ref,now())
    on conflict (user_id) do update set permanent=true,last_source_type=excluded.last_source_type,last_source_ref=excluded.last_source_ref,updated_at=now();
  else
    select greatest(coalesce(active_until,now()),now()) into base_time from public.hanami_plus_memberships where user_id=target_user_id;
    if base_time is null then base_time := now(); end if;
    insert into public.hanami_plus_memberships(user_id,active_until,permanent,last_source_type,last_source_ref,updated_at)
    values(target_user_id,base_time + make_interval(days=>target_duration_days),false,target_source_type,target_source_ref,now())
    on conflict (user_id) do update set
      active_until = case when public.hanami_plus_memberships.permanent then public.hanami_plus_memberships.active_until else greatest(coalesce(public.hanami_plus_memberships.active_until,now()),now()) + make_interval(days=>target_duration_days) end,
      last_source_type = excluded.last_source_type,
      last_source_ref = excluded.last_source_ref,
      updated_at = now();
  end if;

  select * into result from public.hanami_plus_memberships where user_id=target_user_id;
  return result;
end;
$$;
revoke all on function private.apply_hanami_plus_grant(uuid,integer,boolean,text,text,text) from public, anon, authenticated;

commit;
