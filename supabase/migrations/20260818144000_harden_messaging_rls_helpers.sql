create or replace function public.user_owns_character(target_character_id uuid)
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

create or replace function public.user_participates_in_conversation(target_conversation_id uuid)
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

create or replace function public.user_created_conversation(target_conversation_id uuid)
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

revoke all on function public.user_owns_character(uuid) from public, anon;
revoke all on function public.user_participates_in_conversation(uuid) from public, anon;
revoke all on function public.user_created_conversation(uuid) from public, anon;
grant execute on function public.user_owns_character(uuid) to authenticated;
grant execute on function public.user_participates_in_conversation(uuid) to authenticated;
grant execute on function public.user_created_conversation(uuid) to authenticated;

drop policy if exists "members create conversations as own character" on public.conversations;
drop policy if exists "members read participant conversations" on public.conversations;
drop policy if exists "members read participants in own conversations" on public.conversation_participants;
drop policy if exists "conversation creators add participants" on public.conversation_participants;
drop policy if exists "members read messages in own conversations" on public.conversation_messages;
drop policy if exists "members send as own participating character" on public.conversation_messages;

create policy "members create conversations as own character"
on public.conversations for insert to authenticated
with check (public.user_owns_character(created_by_character_id));

create policy "members read participant conversations"
on public.conversations for select to authenticated
using (public.user_participates_in_conversation(id));

create policy "members read participants in own conversations"
on public.conversation_participants for select to authenticated
using (public.user_participates_in_conversation(conversation_id));

create policy "conversation creators add participants"
on public.conversation_participants for insert to authenticated
with check (public.user_created_conversation(conversation_id));

create policy "members read messages in own conversations"
on public.conversation_messages for select to authenticated
using (public.user_participates_in_conversation(conversation_id));

create policy "members send as own participating character"
on public.conversation_messages for insert to authenticated
with check (
  public.user_owns_character(sender_character_id)
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation_messages.conversation_id
      and cp.character_id = conversation_messages.sender_character_id
  )
);
