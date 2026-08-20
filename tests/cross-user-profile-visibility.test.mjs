import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/20260820154000_fix_cross_user_profile_visibility_rpc_execution.sql","utf8");
const lookup=fs.readFileSync("app/portal/ProfileLookupPanel.tsx","utf8");

test("cross-user profile lookups use authenticated security-definer visibility wrappers",()=>{
 for(const fn of ["lookup_visible_character_profile","lookup_visible_profile_design","lookup_visible_profile_social"]){
  assert.match(migration,new RegExp(`function public\\.${fn}`));
 }
 assert.match(migration,/security definer/gi);
 assert.match(migration,/grant execute on function public\.lookup_visible_character_profile\(uuid,text\) to authenticated/);
 assert.match(migration,/grant execute on function public\.lookup_visible_profile_design\(uuid,text\) to authenticated/);
 assert.match(migration,/grant execute on function public\.lookup_visible_profile_social\(uuid,text\) to authenticated/);
 assert.match(migration,/revoke all on function private\.visible_character_profile_internal\(uuid,text\) from public,anon,authenticated/);
 assert.match(migration,/revoke all on function private\.visible_profile_design_internal\(uuid,text\) from public,anon,authenticated/);
 assert.match(migration,/revoke all on function private\.visible_profile_social_internal\(uuid,text\) from public,anon,authenticated/);
});

test("profile UI still loads profile, design, and social visibility together",()=>{
 assert.match(lookup,/lookup_visible_character_profile/);
 assert.match(lookup,/lookup_visible_profile_design/);
 assert.match(lookup,/lookup_visible_profile_social/);
 assert.match(lookup,/Public profiles can be viewed by signed-in Hanami members/);
 assert.match(lookup,/Friends-only profiles can be viewed by accepted character friends/);
 assert.match(lookup,/Private profiles remain owner-only/);
});
