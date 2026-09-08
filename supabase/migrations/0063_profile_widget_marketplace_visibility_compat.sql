begin;

-- The original V2 marketplace publisher snapshots `visible`, while the canonical
-- profile widget column is `is_visible`. Keep a generated read alias so existing
-- published-theme code and historical payloads remain compatible without creating
-- a second writable visibility state.
alter table public.profile_widgets
  add column if not exists visible boolean generated always as (is_visible) stored;

grant select(visible) on public.profile_widgets to authenticated;

commit;
