import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const nurse=await readFile(new URL("../app/portal/FacultyNurseDashboard.tsx",import.meta.url),"utf8");
const feed=await readFile(new URL("../supabase/migrations/20260819113611_nurse_health_office_feed.sql",import.meta.url),"utf8");

test("Faculty dashboard verifies Nurse eligibility before exposing the alternate dashboard",()=>{
  assert.match(dashboard,/current_faculty_has_special_role/);
  assert.match(dashboard,/requested_role:"nurse"/);
  assert.match(dashboard,/Open Nurse Dashboard/);
  assert.match(dashboard,/FacultyNurseDashboard/);
});

test("Nurse Dashboard is a dedicated Health Office workspace",()=>{
  assert.match(nurse,/Nurse Dashboard/);
  assert.match(nurse,/nurse_health_office_feed/);
  assert.match(nurse,/Visit requests & appointments/);
  assert.match(nurse,/Private nurse response/);
  assert.match(nurse,/Publish Health Office notice/);
  assert.match(nurse,/Switch to Faculty Dashboard/);
});

test("Nurse feed validates ownership and special-role assignment",()=>{
  assert.match(feed,/c\.owner_user_id=auth\.uid\(\)/);
  assert.match(feed,/r\.special_role='nurse'/);
  assert.match(feed,/Nurse dashboard access required/);
  assert.match(feed,/student_display_name/);
  assert.match(feed,/student_handle/);
});

test("launch Nurse dashboard contains no test Faculty or bot QA wiring",()=>{
  assert.doesNotMatch(dashboard,/testfaculty_|OwnerFacultyQaPanel|Attach all TEST classes/);
  assert.doesNotMatch(nurse,/TEST\/BOT|testfaculty_|bot_nurse/);
});
