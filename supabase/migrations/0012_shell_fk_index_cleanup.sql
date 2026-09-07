create index notifications_actor_character_idx
  on public.notifications(actor_character_id)
  where actor_character_id is not null;

create index search_documents_owner_character_idx
  on public.search_documents(owner_character_id)
  where owner_character_id is not null;
