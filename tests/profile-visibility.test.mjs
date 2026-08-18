import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const lookup=await readFile(new URL("../app/portal/ProfileLookupPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818152000_visible_character_profile_lookup.sql",import.meta.url),"utf8");

test("profile lookup is exact-handle and active-character scoped",()=>{
  assert.match(lookup,/lookup_visible_character_profile/);
  assert.match(lookup,/viewer_character_id:viewerCharacterId/);
  assert.match(lookup,/target_handle:clean/);
  assert.match(lookup,/Authorization:`Bearer \$\{accessToken\}`/);
});

test("only own or public profiles are visible before friendship support",()=>{
  assert.match(migration,/target\.owner_user_id = auth\.uid\(\)/);
  assert.match(migration,/target\.visibility = 'public'/);
  assert.doesNotMatch(migration,/target\.visibility = 'friends_only'/);
});

test("public lookup uses private helper and security-invoker wrapper",()=>{
  assert.match(migration,/private\.visible_character_profile_internal/);
  assert.match(migration,/create or replace function public\.lookup_visible_character_profile/);
  assert.match(migration,/security invoker/);
});

test("both role dashboards expose privacy-aware profile lookup",()=>{
  assert.match(dashboard,/ProfileLookupPanel accessToken=\{accessToken\} viewerCharacterId=\{character\.id\}/);
  assert.match(lookup,/Private profiles remain owner-only/);
});
