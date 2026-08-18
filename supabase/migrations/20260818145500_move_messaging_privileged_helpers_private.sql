create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.user_owns_character(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.characters c
    where c.id = target_character_id
      and c.owner_user_id = auth.uid()
  );
$$;

create or replace function private.user_participates_in_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.characters c on c.id = cp.character_id
    where cp.conversation_id = target_conversation_id
      and c.owner_user_id = auth.uid()
  );
$$;

create or replace function private.user_created_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations convo
    join public.characters creator on creator.id = convo.created_by_character_id
    where convo.id = target_conversation_id
      and creator.owner_user_id = auth.uid()
  );
$$;

create or replace function private.resolve_character_id_by_handle(target_handle text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.characters c
  where c.handle = lower(trim(leading '@' from target_handle))
  limit 1;
$$;

create or replace function private.conversation_participant_directory_internal(target_conversation_id uuid)
returns table (
  character_id uuid,
  display_name text,
  handle text,
  role public.character_role
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.display_name, c.handle, c.role
  from public.conversation_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.conversation_id = target_conversation_id
    and private.user_participates_in_conversation(target_conversation_id)
  order by cp.joined_at asc;
$$;

revoke all on function private.user_owns_character(uuid) from public, anon;
revoke all on function private.user_participates_in_conversation(uuid) from public, anon;
revoke all on function private.user_created_conversation(uuid) from public, anon;
revoke all on function private.resolve_character_id_by_handle(text) from public, anon;
revoke all on function private.conversation_participant_directory_internal(uuid) from public, anon;
grant execute on function private.user_owns_character(uuid) to authenticated;
grant execute on function private.user_participates_in_conversation(uuid) to authenticated;
grant execute on function private.user_created_conversation(uuid) to authenticated;
grant execute on function private.resolve_character_id_by_handle(text) to authenticated;
grant execute on function private.conversation_participant_directory_internal(uuid) to authenticated;

drop policy if exists "members create conversations as own character" on public.conversations;
drop policy if exists "members read participant conversations" on public.conversations;
drop policy if exists "members read participants in own conversations" on public.conversation_participants;
drop policy if exists "conversation creators add participants" on public.conversation_participants;
drop policy if exists "members read messages in own conversations" on public.conversation_messages;
drop policy if exists "members send as own participating character" on public.conversation_messages;

create policy "members create conversations as own character"
on public.conversations for insert to authenticated
with check (private.user_owns_character(created_by_character_id));

create policy "members read participant conversations"
on public.conversations for select to authenticated
using (private.user_participates_in_conversation(id));

create policy "members read participants in own conversations"
on public.conversation_participants for select to authenticated
using (private.user_participates_in_conversation(conversation_id));

create policy "conversation creators add participants"
on public.conversation_participants for insert to authenticated
with check (private.user_created_conversation(conversation_id));

create policy "members read messages in own conversations"
on public.conversation_messages for select to authenticated
using (private.user_participates_in_conversation(conversation_id));

create policy "members send as own participating character"
on public.conversation_messages for insert to authenticated
with check (
  private.user_owns_character(sender_character_id)
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_messages.conversation_id
      and cp.character_id = conversation_messages.sender_character_id
  )
);

create or replace function public.start_direct_conversation(sender_character_id uuid, target_handle text)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  target_character_id uuid;
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if not private.user_owns_character(sender_character_id) then
    raise exception 'Sender character is not owned by the signed-in account.';
  end if;

  target_character_id := private.resolve_character_id_by_handle(target_handle);

  if target_character_id is null then
    raise exception 'No Hanami character was found for that handle.';
  end if;

  if target_character_id = sender_character_id then
    raise exception 'You cannot start a direct conversation with the same character.';
  end if;

  select convo.id into existing_conversation_id
  from public.conversations convo
  where convo.kind = 'direct'
    and exists (
      select 1 from public.conversation_participants a
      where a.conversation_id = convo.id and a.character_id = sender_character_id
    )
    and exists (
      select 1 from public.conversation_participants b
      where b.conversation_id = convo.id and b.character_id = target_character_id
    )
    and 2 = (
      select count(*) from public.conversation_participants cp
      where cp.conversation_id = convo.id
    )
  order by convo.created_at asc
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations (kind, title, created_by_character_id)
  values ('direct', null, sender_character_id)
  returning id into new_conversation_id;

  insert into public.conversation_participants (conversation_id, character_id)
  values
    (new_conversation_id, sender_character_id),
    (new_conversation_id, target_character_id);

  return new_conversation_id;
end;
$$;

create or replace function public.conversation_participant_directory(target_conversation_id uuid)
returns table (
  character_id uuid,
  display_name text,
  handle text,
  role public.character_role
)
language sql
stable
security invoker
set search_path = public, private
as $$
  select * from private.conversation_participant_directory_internal(target_conversation_id);
$$;

revoke all on function public.user_owns_character(uuid) from authenticated;
revoke all on function public.user_participates_in_conversation(uuid) from authenticated;
revoke all on function public.user_created_conversation(uuid) from authenticated;
drop function if exists public.user_owns_character(uuid);
drop function if exists public.user_participates_in_conversation(uuid);
drop function if exists public.user_created_conversation(uuid);
