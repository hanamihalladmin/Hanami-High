create table public.top_friends (
  character_id uuid not null references public.characters(id) on delete cascade,
  friend_character_id uuid not null references public.characters(id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (character_id, friend_character_id),
  unique (character_id, position),
  check (character_id <> friend_character_id)
);

create index top_friends_friend_character_idx
  on public.top_friends(friend_character_id);

alter table public.top_friends enable row level security;

create policy top_friends_select_owner
on public.top_friends
for select
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = top_friends.character_id
      and c.account_id = (select auth.uid())
  )
);

grant select on public.top_friends to authenticated;

create or replace function private.set_top_friends_impl(p_friend_character_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_count integer := coalesce(cardinality(p_friend_character_ids), 0);
  v_distinct_count integer;
begin
  if v_account_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select a.active_character_id
  into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  if v_active_character_id is null or not exists (
    select 1 from public.characters c
    where c.id = v_active_character_id
      and c.account_id = v_account_id
      and c.character_state = 'active'
  ) then
    raise exception 'Choose an active character before editing Top Friends' using errcode = '42501';
  end if;

  if v_count > 8 then
    raise exception 'Top Friends supports at most 8 characters' using errcode = '23514';
  end if;

  select count(distinct friend_id)
  into v_distinct_count
  from unnest(coalesce(p_friend_character_ids, '{}'::uuid[])) as ids(friend_id);

  if v_distinct_count <> v_count then
    raise exception 'Top Friends cannot contain duplicate characters' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_friend_character_ids, '{}'::uuid[])) as ids(friend_id)
    where ids.friend_id = v_active_character_id
       or not exists (
         select 1
         from public.friendships f
         where f.status = 'accepted'
           and (
             (f.requester_character_id = v_active_character_id and f.addressee_character_id = ids.friend_id)
             or (f.addressee_character_id = v_active_character_id and f.requester_character_id = ids.friend_id)
           )
       )
  ) then
    raise exception 'Every Top Friend must be an accepted friend of the active character' using errcode = '23514';
  end if;

  delete from public.top_friends
  where character_id = v_active_character_id;

  insert into public.top_friends (character_id, friend_character_id, position)
  select v_active_character_id, friend_id, ordinality::smallint
  from unnest(coalesce(p_friend_character_ids, '{}'::uuid[])) with ordinality as ids(friend_id, ordinality);

  return v_count;
end;
$$;

revoke all on function private.set_top_friends_impl(uuid[]) from public, anon, authenticated;
grant execute on function private.set_top_friends_impl(uuid[]) to authenticated;

create function public.set_top_friends(p_friend_character_ids uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.set_top_friends_impl(p_friend_character_ids);
$$;

revoke all on function public.set_top_friends(uuid[]) from public, anon;
grant execute on function public.set_top_friends(uuid[]) to authenticated;
