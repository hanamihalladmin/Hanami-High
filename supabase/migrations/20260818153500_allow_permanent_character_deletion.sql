alter table public.conversations
  alter column created_by_character_id drop not null;
alter table public.conversations
  drop constraint if exists conversations_created_by_character_id_fkey;
alter table public.conversations
  add constraint conversations_created_by_character_id_fkey
  foreign key (created_by_character_id) references public.characters(id) on delete set null;

alter table public.conversation_messages
  alter column sender_character_id drop not null;
alter table public.conversation_messages
  drop constraint if exists conversation_messages_sender_character_id_fkey;
alter table public.conversation_messages
  add constraint conversation_messages_sender_character_id_fkey
  foreign key (sender_character_id) references public.characters(id) on delete set null;
