create type public.conversation_kind as enum ('direct', 'group', 'office');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'direct',
  title text check (title is null or char_length(title) between 1 and 100),
  created_by_character_id uuid not null references public.characters(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, character_id)
);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_character_id uuid not null references public.characters(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index conversation_participants_character_idx on public.conversation_participants(character_id, joined_at desc);
create index conversation_messages_conversation_created_idx on public.conversation_messages(conversation_id, created_at asc);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.conversation_messages enable row level security;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.conversation_participants to authenticated;
grant select, insert on public.conversation_messages to authenticated;
revoke update, delete on public.conversations from authenticated;
revoke update, delete on public.conversation_participants from authenticated;
revoke update, delete on public.conversation_messages from authenticated;

create policy "members create conversations as own character"
on public.conversations for insert to authenticated
with check (
  exists (
    select 1 from public.characters c
    where c.id = conversations.created_by_character_id
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "members read participant conversations"
on public.conversations for select to authenticated
using (
  exists (
    select 1
    from public.conversation_participants cp
    join public.characters c on c.id = cp.character_id
    where cp.conversation_id = conversations.id
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "members read participants in own conversations"
on public.conversation_participants for select to authenticated
using (
  exists (
    select 1
    from public.conversation_participants mine
    join public.characters c on c.id = mine.character_id
    where mine.conversation_id = conversation_participants.conversation_id
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "conversation creators add participants"
on public.conversation_participants for insert to authenticated
with check (
  exists (
    select 1
    from public.conversations convo
    join public.characters creator on creator.id = convo.created_by_character_id
    where convo.id = conversation_participants.conversation_id
      and creator.owner_user_id = (select auth.uid())
  )
);

create policy "members read messages in own conversations"
on public.conversation_messages for select to authenticated
using (
  exists (
    select 1
    from public.conversation_participants cp
    join public.characters c on c.id = cp.character_id
    where cp.conversation_id = conversation_messages.conversation_id
      and c.owner_user_id = (select auth.uid())
  )
);

create policy "members send as own participating character"
on public.conversation_messages for insert to authenticated
with check (
  exists (
    select 1
    from public.characters sender
    join public.conversation_participants cp on cp.character_id = sender.id
    where sender.id = conversation_messages.sender_character_id
      and sender.owner_user_id = (select auth.uid())
      and cp.conversation_id = conversation_messages.conversation_id
  )
);
