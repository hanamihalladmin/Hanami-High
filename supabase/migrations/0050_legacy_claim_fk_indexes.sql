-- Hanami High v2: cover the legacy-character foreign keys used during
-- Discord-identity carryover claims. These tables are private and retained so
-- returning v1 members can claim their old memberships safely over time.

create index if not exists legacy_v1_section_memberships_character_idx
  on private.legacy_v1_section_memberships(legacy_character_id);

create index if not exists legacy_v1_group_memberships_character_idx
  on private.legacy_v1_group_memberships(legacy_character_id);

create index if not exists legacy_v1_homeroom_memberships_character_idx
  on private.legacy_v1_homeroom_memberships(legacy_character_id);
