import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const manager=await readFile(new URL("../app/portal/CharacterManager.tsx",import.meta.url),"utf8");
const auth=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");
const roleClient=await readFile(new URL("../app/portal/RolePortalClient.tsx",import.meta.url),"utf8");
const statusPanel=await readFile(new URL("../app/portal/SchoolStatusPanel.tsx",import.meta.url),"utf8");
const schedule=await readFile(new URL("../app/portal/SchedulePanel.tsx",import.meta.url),"utf8");
const notices=await readFile(new URL("../app/portal/SchoolNoticesPanel.tsx",import.meta.url),"utf8");
const calendar=await readFile(new URL("../app/portal/SchoolCalendarPanel.tsx",import.meta.url),"utf8");
const academicMigration=await readFile(new URL("../supabase/migrations/20260818140500_academic_schedule_foundation.sql",import.meta.url),"utf8");

test("dashboard is driven by the active character role",()=>{
  assert.match(dashboard,/character\.role==="student"/);
  assert.match(dashboard,/STUDENT QUICK LINKS/);
  assert.match(dashboard,/FACULTY QUICK LINKS/);
  assert.match(dashboard,/Student/);
  assert.match(dashboard,/Faculty/);
});

test("role dashboards use live authenticated modules without placeholder cards",()=>{
  assert.match(dashboard,/LIVE DASHBOARD/);
  assert.match(dashboard,/SchoolStatusPanel accessToken=\{accessToken\}/);
  assert.match(dashboard,/SchoolNoticesPanel accessToken=\{accessToken\}/);
  assert.match(dashboard,/SchoolCalendarPanel accessToken=\{accessToken\}/);
  assert.match(dashboard,/SchedulePanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.match(dashboard,/CourseworkPanel/);
  assert.match(dashboard,/StudentActivitiesPanel/);
  assert.match(dashboard,/FacultyCourseManager/);
  assert.match(dashboard,/FacultyGradingPanel/);
  assert.match(dashboard,/FacultyAdvisingPanel/);
  assert.match(dashboard,/MessageCenterPanel/);
  assert.doesNotMatch(dashboard,/Module coming next/);
  assert.match(schedule,/section_memberships/);
  assert.match(schedule,/Authorization:`Bearer \$\{accessToken\}`/);
});

test("role dashboards read school status notices and calendar from Administration",()=>{
  assert.match(statusPanel,/school_status_config/);
  assert.match(statusPanel,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.match(statusPanel,/HANAMI SCHOOL STATUS/);
  assert.match(statusPanel,/timeZone:"Asia\/Tokyo"/);
  assert.match(notices,/site_announcements/);
  assert.match(notices,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.match(notices,/LIVE CMS/);
  assert.match(notices,/is_test_data/);
  assert.match(calendar,/school_calendar_events/);
  assert.match(calendar,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.match(calendar,/LIVE CALENDAR/);
  assert.match(calendar,/is_test_data/);
  assert.match(calendar,/timeZone:"Asia\/Tokyo"/);
});

test("academic database keeps membership reads owner scoped",()=>{
  assert.match(academicMigration,/alter table public\.section_memberships enable row level security/);
  assert.match(academicMigration,/members read own section memberships/);
  assert.match(academicMigration,/c\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(academicMigration,/revoke insert, update, delete on public\.section_memberships from authenticated/);
});

test("active character flows from gateway into role-specific dashboard",()=>{
  assert.match(manager,/onActiveCharacterChange/);
  assert.match(auth,/setActiveCharacter/);
  assert.match(auth,/Enter Student Portal/);
  assert.match(auth,/Enter Faculty Portal/);
  assert.doesNotMatch(auth,/DashboardShell character=/);
  assert.match(roleClient,/DashboardShell character=\{character\} accessToken=\{session\.accessToken\}/);
});
