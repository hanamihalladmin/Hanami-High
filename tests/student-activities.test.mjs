import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const panel=await readFile(new URL("../app/portal/StudentActivitiesPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818150000_campus_activities_foundation.sql",import.meta.url),"utf8");

test("student activities are loaded for the active character",()=>{
  assert.match(panel,/campus_activity_memberships/);
  assert.match(panel,/character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.match(panel,/campus_activity_events/);
  assert.match(panel,/Authorization:`Bearer \$\{accessToken\}`/);
});

test("campus activity membership reads remain owner scoped",()=>{
  assert.match(migration,/members read own campus memberships/);
  assert.match(migration,/c\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration,/revoke insert, update, delete on public\.campus_activity_memberships from authenticated/);
});

test("student dashboard has no remaining placeholder modules",()=>{
  assert.match(dashboard,/StudentActivitiesPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.match(dashboard,/Student Schedule, Coursework, Campus Activities/);
  assert.match(dashboard,/Hanami Messages/);
  assert.match(dashboard,/Profile & Privacy/);
  assert.match(dashboard,/Hanami Profiles/);
  assert.doesNotMatch(dashboard,/Module coming next/);
});

test("test activity data stays visibly labeled",()=>{
  assert.match(panel,/TEST/);
  assert.match(panel,/is_test_data/);
});
