-- Hanami High v2 foundation hardening.
-- Keep extensions out of public and cover foreign keys used by administrative queries.

alter extension citext set schema extensions;

create index if not exists accounts_active_character_id_idx
  on public.accounts(active_character_id)
  where active_character_id is not null;

create index if not exists account_platform_roles_role_id_idx
  on public.account_platform_roles(role_id);

create index if not exists account_platform_roles_granted_by_idx
  on public.account_platform_roles(granted_by)
  where granted_by is not null;

create index if not exists platform_role_capabilities_capability_idx
  on public.platform_role_capabilities(capability_code);

create index if not exists audit_events_actor_character_idx
  on private.audit_events(actor_character_id, created_at desc)
  where actor_character_id is not null;
