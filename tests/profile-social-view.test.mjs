import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const viewer=await readFile(new URL("../app/portal/ProfileLookupPanel.tsx",import.meta.url),"utf8");
const controls=await readFile(new URL("../app/portal/ProfileSocialControlsPanel.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260820024000_complete_visible_profile_social_and_harden_visits.sql",import.meta.url),"utf8");

test("visible profile renderer includes Top Friends badges status and visit counter",()=>{
 assert.match(viewer,/lookup_visible_profile_social/);
 assert.match(viewer,/record_profile_visit/);
 assert.match(viewer,/TOP FRIENDS/);
 assert.match(viewer,/PROFILE BADGES/);
 assert.match(viewer,/PROFILE VIEWS/);
 assert.match(viewer,/status_kind/);
});

test("Top Friends remain strictly accepted-friend and platonic controls",()=>{
 assert.match(controls,/Top Friends • platonic only/);
 assert.match(controls,/character_friendship_directory/);
 assert.match(controls,/status==="accepted"/);
 assert.match(controls,/profile_top_friends/);
});

test("profile visit RPC verifies viewer ownership and target visibility",()=>{
 assert.match(migration,/Viewer character is not owned by current account/);
 assert.match(migration,/Profile is not visible to this character/);
 assert.match(migration,/private\.characters_are_friends/);
 assert.match(migration,/lookup_visible_profile_social/);
});
