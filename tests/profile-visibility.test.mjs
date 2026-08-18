import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const lookup=await readFile(new URL("../app/portal/ProfileLookupPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const baseMigration=await readFile(new URL("../supabase/migrations/20260818152000_visible_character_profile_lookup.sql",import.meta.url),"utf8");
const friendshipMigration=await readFile(new URL("../supabase/migrations/20260818160500_character_friendship_foundation.sql",import.meta.url),"utf8");

test("profile lookup is exact-handle and active-character scoped",()=>{assert.match(lookup,/lookup_visible_character_profile/);assert.match(lookup,/lookup_visible_profile_design/);assert.match(lookup,/viewer_character_id:viewerCharacterId/);assert.match(lookup,/target_handle:clean/);assert.match(lookup,/Authorization:`Bearer \$\{accessToken\}`/);});
test("public and accepted Friends-only profiles are visible while private stays owner only",()=>{assert.match(baseMigration,/target\.visibility = 'public'/);assert.match(friendshipMigration,/target\.visibility='friends_only'/);assert.match(friendshipMigration,/private\.characters_are_friends\(viewer\.id,target\.id\)/);assert.match(lookup,/Friends-only profiles are visible to accepted character friends/);assert.match(lookup,/Private profiles remain owner-only/);});
test("profile lookup keeps private helpers behind security-invoker wrappers",()=>{assert.match(baseMigration,/private\.visible_character_profile_internal/);assert.match(baseMigration,/create or replace function public\.lookup_visible_character_profile/);assert.match(baseMigration,/security invoker/);assert.match(friendshipMigration,/private\.visible_profile_design_internal/);});
test("both role dashboards expose privacy-aware profile lookup",()=>{assert.match(dashboard,/ProfileLookupPanel accessToken=\{accessToken\} viewerCharacterId=\{character\.id\}/);assert.match(dashboard,/FriendsPanel/);});
