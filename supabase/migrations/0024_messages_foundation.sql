create table public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null check (conversation_type in ('direct', 'group')),
  title text check (title is null or length(trim(title)) between 1 and 120),
  created_by_character_id uuid not null references public.characters(id) on delete cascade,
  direct_character_a_id uuid references public.characters(id) on delete cascade,
  direct_character_b_id uuid references public.characters(id) on delete cascade,
  request_state text not null default 'accepted' check (request_state in ('pending', 'accepted', 'declined')),
  request_recipient_character_id uuid references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (
    (
      conversation_type = 'direct'
      and direct_character_a_id is not null
      and direct_character_b_id is not null
      and direct_character_a_id < direct_character_b_id
    )
    or (
      conversation_type = 'group'
      and direct_character_a_id is null
      and direct_character_b_id is null
      and request_state = 'accepted'
      and request_recipient_character_id is null
    )
  ),
  check (request_state <> 'pending' or request_recipient_character_id is not null)
);

create unique index conversation_threads_direct_pair_uidx
  on public.conversation_threads(direct_character_a_id, direct_character_b_id)
  where conversation_type = 'direct';
create index conversation_threads_last_message_idx
  on public.conversation_threads(last_message_at desc);
create index conversation_threads_request_recipient_idx
  on public.conversation_threads(request_recipient_character_id, request_state, last_message_at desc)
  where request_recipient_character_id is not null;

create table public.conversation_members (
  conversation_id uuid not null references public.conversation_threads(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, character_id)
);

create index conversation_members_character_idx
  on public.conversation_members(character_id, joined_at desc);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversation_threads(id) on delete cascade,
  sender_character_id uuid not null references public.characters(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index conversation_messages_conversation_created_idx
  on public.conversation_messages(conversation_id, created_at);
create index conversation_messages_sender_created_idx
  on public.conversation_messages(sender_character_id, created_at desc);

alter table public.conversation_threads enable row level security;
alter table public.conversation_members enable row level security;
alter table public.conversation_messages enable row level security;

create or replace function private.active_character_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts a
    join public.conversation_members cm
      on cm.character_id = a.active_character_id
    where a.id = (select auth.uid())
      and cm.conversation_id = p_conversation_id
  );
$$;

revoke all on function private.active_character_is_conversation_member(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.active_character_is_conversation_member(uuid) to authenticated;

create policy conversation_threads_select_member
on public.conversation_threads
for select
to authenticated
using (private.active_character_is_conversation_member(id));

create policy conversation_members_select_member
on public.conversation_members
for select
to authenticated
using (private.active_character_is_conversation_member(conversation_id));

create policy conversation_members_update_active_character
on public.conversation_members
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

create policy conversation_messages_select_member
on public.conversation_messages
for select
to authenticated
using (private.active_character_is_conversation_member(conversation_id));

grant select on public.conversation_threads to authenticated;
grant select on public.conversation_members to authenticated;
grant update(last_read_at) on public.conversation_members to authenticated;
grant select on public.conversation_messages to authenticated;

create or replace function private.start_direct_message_impl(p_target_character_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_target_account_id uuid;
  v_target_state text;
  v_character_a uuid;
  v_character_b uuid;
  v_thread public.conversation_threads%rowtype;
  v_request_state text;
  v_message_id uuid;
  v_sender_name text;
begin
  if v_account_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Messages must be between 1 and 4000 characters' using errcode = '23514';
  end if;

  select a.active_character_id
  into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  if v_active_character_id is null then
    raise exception 'Choose an active character before messaging' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = v_active_character_id
      and c.account_id = v_account_id
      and c.character_state = 'active'
  ) then
    raise exception 'Active character is not available' using errcode = '42501';
  end if;

  select c.account_id, c.character_state
  into v_target_account_id, v_target_state
  from public.characters c
  where c.id = p_target_character_id;

  if not found or v_target_state <> 'active' then
    raise exception 'Target character is not available' using errcode = 'P0002';
  end if;

  if v_target_account_id = v_account_id then
    raise exception 'You cannot message one of your own characters' using errcode = '23514';
  end if;

  if v_active_character_id < p_target_character_id then
    v_character_a := v_active_character_id;
    v_character_b := p_target_character_id;
  else
    v_character_a := p_target_character_id;
    v_character_b := v_active_character_id;
  end if;

  select * into v_thread
  from public.conversation_threads t
  where t.conversation_type = 'direct'
    and t.direct_character_a_id = v_character_a
    and t.direct_character_b_id = v_character_b
  for update;

  if found then
    if v_thread.request_state = 'declined' then
      raise exception 'This message request was declined' using errcode = '42501';
    end if;
    if v_thread.request_state = 'pending' and v_thread.created_by_character_id <> v_active_character_id then
      raise exception 'Accept this message request before replying' using errcode = '42501';
    end if;
  else
    v_request_state := case when exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_character_id = v_active_character_id and f.addressee_character_id = p_target_character_id)
          or (f.addressee_character_id = v_active_character_id and f.requester_character_id = p_target_character_id)
        )
    ) then 'accepted' else 'pending' end;

    insert into public.conversation_threads (
      conversation_type,
      created_by_character_id,
      direct_character_a_id,
      direct_character_b_id,
      request_state,
      request_recipient_character_id
    ) values (
      'direct',
      v_active_character_id,
      v_character_a,
      v_character_b,
      v_request_state,
      case when v_request_state = 'pending' then p_target_character_id else null end
    )
    returning * into v_thread;

    insert into public.conversation_members (conversation_id, character_id, member_role, last_read_at)
    values
      (v_thread.id, v_active_character_id, 'owner', now()),
      (v_thread.id, p_target_character_id, 'member', null);
  end if;

  insert into public.conversation_messages (conversation_id, sender_character_id, body)
  values (v_thread.id, v_active_character_id, trim(p_body))
  returning id into v_message_id;

  update public.conversation_threads
  set last_message_at = now(), updated_at = now()
  where id = v_thread.id;

  update public.conversation_members
  set last_read_at = now()
  where conversation_id = v_thread.id
    and character_id = v_active_character_id;

  select coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  )
  into v_sender_name
  from public.characters c
  where c.id = v_active_character_id;

  insert into public.notifications (
    account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
  ) values (
    v_target_account_id,
    p_target_character_id,
    v_active_character_id,
    case when v_thread.request_state = 'pending' then 'message_request' else 'direct_message' end,
    case when v_thread.request_state = 'pending' then 'New message request' else 'New direct message' end,
    v_sender_name || case when v_thread.request_state = 'pending' then ' sent you a message request.' else ' sent you a message.' end,
    'messages',
    case when v_thread.request_state = 'pending' then 'message-requests' else 'direct-messages' end,
    jsonb_build_object('conversation_id', v_thread.id, 'message_id', v_message_id)
  );

  return v_thread.id;
end;
$$;

create or replace function private.respond_message_request_impl(p_conversation_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_thread public.conversation_threads%rowtype;
  v_sender_account_id uuid;
  v_responder_name text;
  v_state text := case when p_accept then 'accepted' else 'declined' end;
begin
  select a.active_character_id into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  select * into v_thread
  from public.conversation_threads t
  where t.id = p_conversation_id
    and t.conversation_type = 'direct'
  for update;

  if not found or v_thread.request_state <> 'pending' then
    raise exception 'Message request is no longer pending' using errcode = 'P0002';
  end if;

  if v_thread.request_recipient_character_id <> v_active_character_id then
    raise exception 'Switch to the character who received this message request' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = v_active_character_id
      and c.account_id = v_account_id
  ) then
    raise exception 'Active character is not owned by this account' using errcode = '42501';
  end if;

  update public.conversation_threads
  set request_state = v_state,
      request_recipient_character_id = null,
      updated_at = now()
  where id = p_conversation_id;

  select c.account_id into v_sender_account_id
  from public.characters c
  where c.id = v_thread.created_by_character_id;

  select coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  ) into v_responder_name
  from public.characters c
  where c.id = v_active_character_id;

  insert into public.notifications (
    account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
  ) values (
    v_sender_account_id,
    v_thread.created_by_character_id,
    v_active_character_id,
    case when p_accept then 'message_request_accepted' else 'message_request_declined' end,
    case when p_accept then 'Message request accepted' else 'Message request declined' end,
    v_responder_name || case when p_accept then ' accepted your message request.' else ' declined your message request.' end,
    'messages',
    case when p_accept then 'direct-messages' else 'message-requests' end,
    jsonb_build_object('conversation_id', p_conversation_id)
  );

  return v_state;
end;
$$;

create or replace function private.send_conversation_message_impl(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_thread public.conversation_threads%rowtype;
  v_message_id uuid;
  v_sender_name text;
  v_recipient record;
begin
  if length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Messages must be between 1 and 4000 characters' using errcode = '23514';
  end if;

  select a.active_character_id into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  if not exists (
    select 1 from public.conversation_members cm
    join public.characters c on c.id = cm.character_id
    where cm.conversation_id = p_conversation_id
      and cm.character_id = v_active_character_id
      and c.account_id = v_account_id
  ) then
    raise exception 'Conversation is not available to the active character' using errcode = '42501';
  end if;

  select * into v_thread
  from public.conversation_threads t
  where t.id = p_conversation_id
  for update;

  if v_thread.request_state = 'declined' then
    raise exception 'This conversation is closed' using errcode = '42501';
  end if;

  if v_thread.request_state = 'pending' and v_thread.created_by_character_id <> v_active_character_id then
    raise exception 'Accept this message request before replying' using errcode = '42501';
  end if;

  insert into public.conversation_messages (conversation_id, sender_character_id, body)
  values (p_conversation_id, v_active_character_id, trim(p_body))
  returning id into v_message_id;

  update public.conversation_threads
  set last_message_at = now(), updated_at = now()
  where id = p_conversation_id;

  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and character_id = v_active_character_id;

  select coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  ) into v_sender_name
  from public.characters c
  where c.id = v_active_character_id;

  for v_recipient in
    select c.id as character_id, c.account_id
    from public.conversation_members cm
    join public.characters c on c.id = cm.character_id
    where cm.conversation_id = p_conversation_id
      and cm.character_id <> v_active_character_id
  loop
    insert into public.notifications (
      account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
    ) values (
      v_recipient.account_id,
      v_recipient.character_id,
      v_active_character_id,
      case
        when v_thread.conversation_type = 'group' then 'group_message'
        when v_thread.request_state = 'pending' then 'message_request'
        else 'direct_message'
      end,
      case
        when v_thread.conversation_type = 'group' then 'New group message'
        when v_thread.request_state = 'pending' then 'Message request updated'
        else 'New direct message'
      end,
      v_sender_name || ' sent a message.',
      'messages',
      case
        when v_thread.conversation_type = 'group' then 'groups'
        when v_thread.request_state = 'pending' then 'message-requests'
        else 'direct-messages'
      end,
      jsonb_build_object('conversation_id', p_conversation_id, 'message_id', v_message_id)
    );
  end loop;

  return v_message_id;
end;
$$;

create or replace function private.create_group_conversation_impl(p_member_character_ids uuid[], p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid := (select auth.uid());
  v_active_character_id uuid;
  v_members uuid[];
  v_thread_id uuid;
  v_member_id uuid;
  v_creator_name text;
begin
  select a.active_character_id into v_active_character_id
  from public.accounts a
  where a.id = v_account_id;

  if v_active_character_id is null then
    raise exception 'Choose an active character before creating a group' using errcode = '23514';
  end if;

  if length(trim(coalesce(p_title, ''))) not between 1 and 120 then
    raise exception 'Group titles must be between 1 and 120 characters' using errcode = '23514';
  end if;

  select array_agg(distinct x order by x)
  into v_members
  from unnest(coalesce(p_member_character_ids, array[]::uuid[])) x
  where x <> v_active_character_id;

  if coalesce(cardinality(v_members), 0) not between 2 and 9 then
    raise exception 'Groups require 2 to 9 other members' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(v_members) member_id
    left join public.characters c on c.id = member_id
    where c.id is null
      or c.character_state <> 'active'
      or c.account_id = v_account_id
      or not exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_character_id = v_active_character_id and f.addressee_character_id = member_id)
            or (f.addressee_character_id = v_active_character_id and f.requester_character_id = member_id)
          )
      )
  ) then
    raise exception 'Every group member must be an accepted friend of the active character' using errcode = '42501';
  end if;

  insert into public.conversation_threads (
    conversation_type, title, created_by_character_id, request_state
  ) values (
    'group', trim(p_title), v_active_character_id, 'accepted'
  ) returning id into v_thread_id;

  insert into public.conversation_members (conversation_id, character_id, member_role, last_read_at)
  values (v_thread_id, v_active_character_id, 'owner', now());

  insert into public.conversation_members (conversation_id, character_id, member_role)
  select v_thread_id, member_id, 'member'
  from unnest(v_members) member_id;

  select coalesce(
    nullif(trim(c.display_name), ''),
    nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''),
    'Hanami Student'
  ) into v_creator_name
  from public.characters c
  where c.id = v_active_character_id;

  foreach v_member_id in array v_members
  loop
    insert into public.notifications (
      account_id, character_id, actor_character_id, kind, title, body, section, subsection, metadata
    )
    select
      c.account_id,
      c.id,
      v_active_character_id,
      'group_added',
      'Added to a group',
      v_creator_name || ' added you to ' || trim(p_title) || '.',
      'messages',
      'groups',
      jsonb_build_object('conversation_id', v_thread_id)
    from public.characters c
    where c.id = v_member_id;
  end loop;

  return v_thread_id;
end;
$$;

revoke all on function private.start_direct_message_impl(uuid, text) from public, anon, authenticated;
revoke all on function private.respond_message_request_impl(uuid, boolean) from public, anon, authenticated;
revoke all on function private.send_conversation_message_impl(uuid, text) from public, anon, authenticated;
revoke all on function private.create_group_conversation_impl(uuid[], text) from public, anon, authenticated;

grant execute on function private.start_direct_message_impl(uuid, text) to authenticated;
grant execute on function private.respond_message_request_impl(uuid, boolean) to authenticated;
grant execute on function private.send_conversation_message_impl(uuid, text) to authenticated;
grant execute on function private.create_group_conversation_impl(uuid[], text) to authenticated;

create function public.start_direct_message(p_target_character_id uuid, p_body text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.start_direct_message_impl(p_target_character_id, p_body); $$;

create function public.respond_message_request(p_conversation_id uuid, p_accept boolean)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.respond_message_request_impl(p_conversation_id, p_accept); $$;

create function public.send_conversation_message(p_conversation_id uuid, p_body text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.send_conversation_message_impl(p_conversation_id, p_body); $$;

create function public.create_group_conversation(p_member_character_ids uuid[], p_title text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_group_conversation_impl(p_member_character_ids, p_title); $$;

revoke all on function public.start_direct_message(uuid, text) from public, anon;
revoke all on function public.respond_message_request(uuid, boolean) from public, anon;
revoke all on function public.send_conversation_message(uuid, text) from public, anon;
revoke all on function public.create_group_conversation(uuid[], text) from public, anon;
grant execute on function public.start_direct_message(uuid, text) to authenticated;
grant execute on function public.respond_message_request(uuid, boolean) to authenticated;
grant execute on function public.send_conversation_message(uuid, text) to authenticated;
grant execute on function public.create_group_conversation(uuid[], text) to authenticated;
