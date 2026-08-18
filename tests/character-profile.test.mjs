import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const panel=await readFile(new URL("../app/portal/CharacterProfilePanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818151500_character_profile_foundation.sql",import.meta.url),"utf8");

test("profile editor reads and saves only the active character record",()=>{
  assert.match(panel,/character_profiles\?select=headline,bio,status_message/);
  assert.match(panel,/character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.match(panel,/characters\?id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.match(panel,/Authorization:`Bearer \$\{accessToken\}`/);
});

test("profile save uses an upsert and updates privacy separately",()=>{
  assert.match(panel,/on_conflict=character_id/);
  assert.match(panel,/resolution=merge-duplicates/);
  assert.match(panel,/visibility,updated_at/);
  assert.match(panel,/Save profile & privacy/);
});

test("character profile table is owner scoped by RLS",()=>{
  assert.match(migration,/members read own character profiles/);
  assert.match(migration,/members create own character profiles/);
  assert.match(migration,/members update own character profiles/);
  assert.match(migration,/c\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration,/revoke delete on public\.character_profiles from authenticated/);
});

test("both role dashboards render the profile editor",()=>{
  assert.match(dashboard,/CharacterProfilePanel accessToken=\{accessToken\} characterId=\{character\.id\} currentVisibility=\{character\.visibility\}/);
  assert.match(dashboard,/Profile & Privacy/);
});
