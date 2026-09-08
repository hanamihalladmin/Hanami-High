-- Restore the table-level privileges required by the authenticated client.
-- Row-level policies continue to enforce account ownership and Hanami+ write gating.

revoke all on table public.account_site_theme_presets from anon, authenticated;
grant select, insert, update, delete on table public.account_site_theme_presets to authenticated;
