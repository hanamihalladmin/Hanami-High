create or replace function public.conversation_participant_directory(target_conversation_id uuid)
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
    and public.user_participates_in_conversation(target_conversation_id)
  order by cp.joined_at asc;
$$;

revoke all on function public.conversation_participant_directory(uuid) from public, anon;
grant execute on function public.conversation_participant_directory(uuid) to authenticated;
