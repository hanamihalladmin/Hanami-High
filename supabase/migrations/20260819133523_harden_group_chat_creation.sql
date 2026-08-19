create or replace function private.start_group_conversation_internal(sender_character_id uuid, conversation_title text, target_handles text[])
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare
  clean_title text;
  clean_handle text;
  target_character_id uuid;
  participant_ids uuid[] := array[]::uuid[];
  new_conversation_id uuid;
begin
  if not private.user_owns_character(sender_character_id) then
    raise exception 'Sender character is not owned by the signed-in account.';
  end if;

  clean_title := trim(conversation_title);
  if char_length(clean_title) < 2 or char_length(clean_title) > 100 then
    raise exception 'Group title must be between 2 and 100 characters.';
  end if;

  if target_handles is null or cardinality(target_handles) < 1 or cardinality(target_handles) > 7 then
    raise exception 'Group chats require between 1 and 7 invited handles.';
  end if;

  foreach clean_handle in array target_handles loop
    clean_handle := lower(trim(leading '@' from trim(clean_handle)));
    if clean_handle = '' then continue; end if;
    target_character_id := private.resolve_character_id_by_handle(clean_handle);
    if target_character_id is null then
      raise exception 'Hanami handle @% could not be found.', clean_handle;
    end if;
    if target_character_id <> sender_character_id and not (target_character_id = any(participant_ids)) then
      participant_ids := array_append(participant_ids,target_character_id);
    end if;
  end loop;

  if cardinality(participant_ids) < 1 then
    raise exception 'Add at least one other Hanami character to the group.';
  end if;

  insert into public.conversations(kind,title,created_by_character_id)
  values('group',clean_title,sender_character_id)
  returning id into new_conversation_id;

  insert into public.conversation_participants(conversation_id,character_id,last_read_at,can_manage)
  values(new_conversation_id,sender_character_id,now(),true);

  insert into public.conversation_participants(conversation_id,character_id,last_read_at,can_manage)
  select new_conversation_id,participant_id,now(),false
  from unnest(participant_ids) as participant_id;

  return new_conversation_id;
end;
$$;

revoke all on function private.start_group_conversation_internal(uuid,text,text[]) from public,anon;
grant execute on function private.start_group_conversation_internal(uuid,text,text[]) to authenticated;

create or replace function public.start_group_conversation(sender_character_id uuid, conversation_title text, target_handles text[])
returns uuid
language sql
security invoker
set search_path=private
as $$ select private.start_group_conversation_internal(sender_character_id,conversation_title,target_handles); $$;
revoke all on function public.start_group_conversation(uuid,text,text[]) from public,anon;
grant execute on function public.start_group_conversation(uuid,text,text[]) to authenticated;
