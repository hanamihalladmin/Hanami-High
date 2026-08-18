create or replace function public.start_direct_conversation(sender_character_id uuid, target_handle text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character_id uuid;
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if not public.user_owns_character(sender_character_id) then
    raise exception 'Sender character is not owned by the signed-in account.';
  end if;

  select c.id into target_character_id
  from public.characters c
  where c.handle = lower(trim(leading '@' from target_handle))
  limit 1;

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

revoke all on function public.start_direct_conversation(uuid, text) from public, anon;
grant execute on function public.start_direct_conversation(uuid, text) to authenticated;
