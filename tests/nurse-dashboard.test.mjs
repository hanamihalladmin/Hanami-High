import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const nurse=await readFile(new URL("../app/portal/FacultyNurseDashboard.tsx",import.meta.url),"utf8");
const qa=await readFile(new URL("../app/portal/OwnerFacultyQaPanel.tsx",import.meta.url),"utf8");
const foundation=await readFile(new URL("../supabase/migrations/20260819113535_faculty_nurse_dashboard_and_qa_fixture_pack.sql",import.meta.url),"utf8");
const feed=await readFile(new URL("../supabase/migrations/20260819113611_nurse_health_office_feed.sql",import.meta.url),"utf8");
const restriction=await readFile(new URL("../supabase/migrations/20260819113838_restrict_test_bot_faculty_to_owner.sql",import.meta.url),"utf8");

test("Faculty dashboard verifies Nurse eligibility before exposing the alternate dashboard",()=>{
  assert.match(dashboard,/current_faculty_has_special_role/);
  assert.match(dashboard,/requested_role:"nurse"/);
  assert.match(dashboard,/Switch to Nurse Dashboard/);
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

test("Nurse special role is Faculty scoped and does not grant Site Admin",()=>{
  assert.match(foundation,/special_role in \('nurse'\)/);
  assert.match(foundation,/c\.role='faculty'/);
  assert.match(foundation,/nurses read health visits/);
  assert.match(foundation,/nurses update health visits/);
  assert.doesNotMatch(foundation,/insert into public\.account_permissions[\s\S]*site_admin/);
});

test("Owner QA pack includes realistic TEST classes and BOT Faculty",()=>{
  for(const code of ["QAJPN-101","QASCI-101","QAMAT-101","QAPHE-101"])assert.match(foundation,new RegExp(code));
  for(const handle of ["bot_tanaka","bot_sato","bot_kobayashi","bot_kuroda","bot_nurse_mori"])assert.match(foundation,new RegExp(handle));
  assert.match(qa,/Attach all TEST classes \+ Nurse access/);
  assert.match(qa,/TEST\/BOT Faculty below are data-only and cannot sign in/);
});

test("TEST Faculty QA attachment remains Owner-only",()=>{
  assert.match(foundation,/private\.is_owner_discord_user\(\)/);
  assert.match(foundation,/handle like 'testfaculty_%'/);
  assert.match(foundation,/attach_owner_test_faculty_qa_pack/);
  assert.match(dashboard,/character\.handle\.startsWith\("testfaculty_"\)/);
});

test("BOT Faculty directory and assignments are Owner-only",()=>{
  assert.match(restriction,/owner reads test bot faculty/);
  assert.match(restriction,/owner reads bot faculty assignments/);
  assert.match(restriction,/private\.is_owner_discord_user\(\)/);
  assert.doesNotMatch(restriction,/using \(true\)/);
});

test("Nurse feed validates ownership and special-role assignment",()=>{
  assert.match(feed,/c\.owner_user_id=auth\.uid\(\)/);
  assert.match(feed,/r\.special_role='nurse'/);
  assert.match(feed,/Nurse dashboard access required/);
  assert.match(feed,/student_display_name/);
  assert.match(feed,/student_handle/);
});
