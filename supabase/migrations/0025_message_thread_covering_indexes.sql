create index conversation_threads_created_by_idx
  on public.conversation_threads(created_by_character_id, updated_at desc);

create index conversation_threads_direct_character_b_idx
  on public.conversation_threads(direct_character_b_id)
  where direct_character_b_id is not null;
