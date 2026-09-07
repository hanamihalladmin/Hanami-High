-- Hanami High v2 Phase 2 hardening: keep RLS authorization simple and enforce active-character integrity in the database trigger.

-- The signed-in account may update only active_character_id because column grants restrict UPDATE.
-- The accounts_enforce_active_character trigger validates that any non-null value belongs to the same account
-- and references a character whose lifecycle state is active.
drop policy if exists accounts_update_own on public.accounts;

create policy accounts_update_own
on public.accounts for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
