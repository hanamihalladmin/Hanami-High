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
  assert.match(dashboard,/Student Action & Support/);
  assert.match(dashboard,/NotificationAccessibilityPanel accessToken=\{accessToken\}/);
  assert.match(dashboard,/CommunityCenterPanel accessToken=\{accessToken\}/);
  assert.match(dashboard,/SchoolResourcesPanel accessToken=\{accessToken\}/);
  assert.match(dashboard,/Messages/);
  assert.match(dashboard,/Profile Studio/);
  assert.doesNotMatch(dashboard,/Module coming next/);
});

test("Student activity UI contains no launch test-data labels",()=>{
  assert.match(panel,/campus_activities/);
  assert.doesNotMatch(panel,/TEST|is_test_data/);
});
