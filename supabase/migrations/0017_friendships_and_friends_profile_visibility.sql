create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_character_id uuid not null references public.characters(id) on delete cascade,
  addressee_character_id uuid not null references public.characters(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  check (requester_character_id <> addressee_character_id)
);

create unique index friendships_character_pair_uidx
  on public.friendships (
    least(requester_character_id, addressee_character_id),
    greatest(requester_character_id, addressee_character_id)
  );
create index friendships_requester_status_idx
  on public.friendships(requester_character_id, status, updated_at desc);
create index friendships_addressee_status_idx
  on public.friendships(addressee_character_id, status, updated_at desc);

alter table public.friendships enable row level security;

create policy friendships_select_participant
on public.friendships
for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.account_id = (select auth.uid())
      and c.id in (friendships.requester_character_id, friendships.addressee_character_id)
  )
);

grant select on public.friendships to authenticated;

create or replace function public.request_friendship(p_target_character_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_target_account_id uuid;
  v_target_name text;
  v_requester_name text;
  v_existing public.friendships%rowtype;
  v_friendship_id uuid;
begin
  if v_account_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select a.active_character_id
  into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  if v_active_character_id is null then
    raise exception 'Choose an active character before sending a friend request' using errcode = '23514';
  end if;

  select c.account_id,
         coalesce(nullif(trim(c.display_name), ''), nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''), 'Hanami Student')
  into v_target_account_id, v_target_name
  from public.characters c
  where c.id = p_target_character_id
    and c.character_state = 'active';

  if not found then
    raise exception 'Target character is not available' using errcode = 'P0002';
  end if;

  if v_target_account_id = v_account_id then
    raise exception 'You cannot friend one of your own characters' using errcode = '23514';
  end if;

  select coalesce(nullif(trim(c.display_name), ''), nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''), 'Hanami Student')
  into v_requester_name
  from public.characters c
  where c.id = v_active_character_id
    and c.account_id = v_account_id
    and c.character_state = 'active';

  if not found then
    raise exception 'Active character is not available' using errcode = 'P0002';
  end if;

  select *
  into v_existing
  from public.friendships f
  where least(f.requester_character_id, f.addressee_character_id) = least(v_active_character_id, p_target_character_id)
    and greatest(f.requester_character_id, f.addressee_character_id) = greatest(v_active_character_id, p_target_character_id)
  limit 1;

  if found then
    if v_existing.status = 'accepted' then
      raise exception 'These characters are already friends' using errcode = '23514';
    elsif v_existing.status = 'pending' then
      raise exception 'A friend request is already pending between these characters' using errcode = '23514';
    end if;

    update public.friendships
    set requester_character_id = v_active_character_id,
        addressee_character_id = p_target_character_id,
        status = 'pending',
        responded_at = null,
        updated_at = now()
    where id = v_existing.id
    returning id into v_friendship_id;
  else
    insert into public.friendships (requester_character_id, addressee_character_id)
    values (v_active_character_id, p_target_character_id)
    returning id into v_friendship_id;
  end if;

  insert into public.notifications (
    account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
  ) values (
    v_target_account_id,
    p_target_character_id,
    v_active_character_id,
    'friend_request',
    'New friend request',
    v_requester_name || ' wants to add you as a friend.',
    'social',
    'friends',
    jsonb_build_object('friendship_id', v_friendship_id)
  );

  return v_friendship_id;
end;
$$;

create or replace function public.respond_friendship(p_friendship_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_friendship public.friendships%rowtype;
  v_requester_account_id uuid;
  v_responder_name text;
  v_status text := case when p_accept then 'accepted' else 'declined' end;
begin
  if v_account_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select a.active_character_id
  into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  select *
  into v_friendship
  from public.friendships f
  where f.id = p_friendship_id
  for update;

  if not found or v_friendship.status <> 'pending' then
    raise exception 'Friend request is no longer pending' using errcode = 'P0002';
  end if;

  if v_friendship.addressee_character_id <> v_active_character_id then
    raise exception 'Switch to the character who received this friend request' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = v_active_character_id
      and c.account_id = v_account_id
  ) then
    raise exception 'Active character is not owned by this account' using errcode = '42501';
  end if;

  update public.friendships
  set status = v_status,
      responded_at = now(),
      updated_at = now()
  where id = p_friendship_id;

  select c.account_id
  into v_requester_account_id
  from public.characters c
  where c.id = v_friendship.requester_character_id;

  select coalesce(nullif(trim(c.display_name), ''), nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''), 'Hanami Student')
  into v_responder_name
  from public.characters c
  where c.id = v_friendship.addressee_character_id;

  insert into public.notifications (
    account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
  ) values (
    v_requester_account_id,
    v_friendship.requester_character_id,
    v_friendship.addressee_character_id,
    case when p_accept then 'friend_accepted' else 'friend_declined' end,
    case when p_accept then 'Friend request accepted' else 'Friend request declined' end,
    v_responder_name || case when p_accept then ' accepted your friend request.' else ' declined your friend request.' end,
    'social',
    'friends',
    jsonb_build_object('friendship_id', p_friendship_id)
  );

  return v_status;
end;
$$;

create or replace function public.remove_friendship(p_friendship_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_deleted boolean := false;
begin
  if v_account_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select a.active_character_id
  into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  delete from public.friendships f
  where f.id = p_friendship_id
    and v_active_character_id in (f.requester_character_id, f.addressee_character_id)
    and exists (
      select 1 from public.characters c
      where c.id = v_active_character_id
        and c.account_id = v_account_id
    );

  v_deleted := found;
  if not v_deleted then
    raise exception 'Friendship is not available to the active character' using errcode = '42501';
  end if;

  return true;
end;
$$;

revoke all on function public.request_friendship(uuid) from public, anon;
revoke all on function public.respond_friendship(uuid, boolean) from public, anon;
revoke all on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.request_friendship(uuid) to authenticated;
grant execute on function public.respond_friendship(uuid, boolean) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;

drop policy if exists published_profiles_select_visible on public.published_character_profiles;
create policy published_profiles_select_visible
on public.published_character_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.characters c
    where c.id = published_character_profiles.character_id
      and (
        c.account_id = (select auth.uid())
        or (
          c.character_state = 'active'
          and (
            published_character_profiles.profile_visibility = 'hanami'
            or (
              published_character_profiles.profile_visibility = 'friends'
              and exists (
                select 1
                from public.friendships f
                join public.accounts a on a.id = (select auth.uid())
                where f.status = 'accepted'
                  and a.active_character_id is not null
                  and (
                    (f.requester_character_id = published_character_profiles.character_id and f.addressee_character_id = a.active_character_id)
                    or (f.addressee_character_id = published_character_profiles.character_id and f.requester_character_id = a.active_character_id)
                  )
              )
            )
          )
        )
      )
  )
);

drop policy if exists published_widgets_select_visible on public.published_profile_widgets;
create policy published_widgets_select_visible
on public.published_profile_widgets
for select
to authenticated
using (
  exists (
    select 1
    from public.published_character_profiles p
    join public.characters c on c.id = p.character_id
    where p.character_id = published_profile_widgets.character_id
      and (
        c.account_id = (select auth.uid())
        or (
          c.character_state = 'active'
          and (
            p.profile_visibility = 'hanami'
            or (
              p.profile_visibility = 'friends'
              and exists (
                select 1
                from public.friendships f
                join public.accounts a on a.id = (select auth.uid())
                where f.status = 'accepted'
                  and a.active_character_id is not null
                  and (
                    (f.requester_character_id = p.character_id and f.addressee_character_id = a.active_character_id)
                    or (f.addressee_character_id = p.character_id and f.requester_character_id = a.active_character_id)
                  )
              )
            )
          )
        )
      )
  )
);

drop policy if exists profile_media_select_visible on storage.objects;
create policy profile_media_select_visible
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.published_character_profiles p
      join public.characters c on c.id = p.character_id
      where c.id::text = (storage.foldername(name))[2]
        and c.account_id::text = (storage.foldername(name))[1]
        and c.character_state = 'active'
        and (
          p.profile_visibility = 'hanami'
          or (
            p.profile_visibility = 'friends'
            and exists (
              select 1
              from public.friendships f
              join public.accounts a on a.id = (select auth.uid())
              where f.status = 'accepted'
                and a.active_character_id is not null
                and (
                  (f.requester_character_id = p.character_id and f.addressee_character_id = a.active_character_id)
                  or (f.addressee_character_id = p.character_id and f.requester_character_id = a.active_character_id)
                )
            )
          )
        )
    )
  )
);
