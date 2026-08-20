import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const adminClient=await readFile(new URL("../app/portal/admin/AdminPortalClient.tsx",import.meta.url),"utf8");
const workspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const privilegedLogin=await readFile(new URL("../app/portal/PrivilegedPortalLogin.tsx",import.meta.url),"utf8");
const statusManager=await readFile(new URL("../app/portal/admin/AdminSchoolStatusManager.tsx",import.meta.url),"utf8");
const manager=await readFile(new URL("../app/portal/admin/AdminAnnouncementManager.tsx",import.meta.url),"utf8");
const eventManager=await readFile(new URL("../app/portal/admin/AdminEventManager.tsx",import.meta.url),"utf8");
const directory=await readFile(new URL("../app/portal/admin/AdminCharacterDirectory.tsx",import.meta.url),"utf8");
const academics=await readFile(new URL("../app/portal/admin/AdminAcademicManager.tsx",import.meta.url),"utf8");
const adminPage=await readFile(new URL("../app/portal/admin/page.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818163000_administration_and_live_announcements_foundation.sql",import.meta.url),"utf8");
const hardening=await readFile(new URL("../supabase/migrations/20260818165000_harden_administration_rpc_boundaries.sql",import.meta.url),"utf8");
const directoryMigration=await readFile(new URL("../supabase/migrations/20260818170000_administration_character_directory.sql",import.meta.url),"utf8");
const academicMigration=await readFile(new URL("../supabase/migrations/20260818171500_administration_academic_management_permissions.sql",import.meta.url),"utf8");
const calendarMigration=await readFile(new URL("../supabase/migrations/20260818173000_school_calendar_events_foundation.sql",import.meta.url),"utf8");
const statusMigration=await readFile(new URL("../supabase/migrations/20260818174500_live_school_status_foundation.sql",import.meta.url),"utf8");
const claimMigration=await readFile(new URL("../supabase/migrations/20260818195549_allow_owner_created_unclaimed_admin_logins.sql",import.meta.url),"utf8");

test("Administration is account permission based rather than character role based",()=>{
  assert.match(adminClient,/current_account_admin_access/);
  assert.doesNotMatch(adminClient,/character\.role/);
  assert.match(adminClient,/has_privileged_portal_session/);
  assert.match(privilegedLogin,/ADMINISTRATOR SIGN IN/);
  assert.match(privilegedLogin,/verify_privileged_portal_login/);
  assert.match(migration,/account_permissions/);
  assert.match(migration,/site_admin/);
  assert.match(migration,/content_editor/);
  assert.match(migration,/moderator/);
});

test("Owner-issued unclaimed Administrator login can bind on first successful sign-in",()=>{
  assert.match(adminClient,/Owner-issued Administrator handle and password/);
  assert.match(adminClient,/unclaimed login will bind permanently/);
  assert.match(claimMigration,/bound_discord_user_id is null/);
  assert.match(claimMigration,/update public\.privileged_portal_credentials/);
  assert.match(claimMigration,/claimed_at = now\(\)/);
  assert.match(claimMigration,/values\(auth\.uid\(\), 'site_admin', null\)/);
});

test("ordinary authenticated users cannot self grant Administration permissions without a valid Owner-issued credential",()=>{
  assert.match(migration,/revoke all on public\.account_permissions from anon, authenticated/);
  assert.doesNotMatch(migration,/create policy .*account_permissions.*insert/is);
  assert.match(migration,/private\.account_has_permission/);
  assert.match(hardening,/deny direct permission reads/);
  assert.match(claimMigration,/extensions\.crypt\(requested_password, cred\.password_hash\)/);
});

test("public Administration RPCs are security-invoker wrappers around private helpers",()=>{
  assert.match(hardening,/private\.current_account_admin_access_internal/);
  assert.match(hardening,/public\.current_account_admin_access/);
  assert.match(hardening,/security invoker/);
  assert.match(hardening,/private\.moderation_report_queue_internal/);
});

test("school status is public-read and content-editor managed",()=>{
  assert.match(statusMigration,/public reads school status/);
  assert.match(statusMigration,/content editors update school status/);
  assert.match(statusMigration,/open','delayed','closed','holiday','emergency/);
  assert.match(statusManager,/school_status_config/);
  assert.match(statusManager,/Update school status/);
  assert.match(statusManager,/timeZone:"Asia\/Tokyo"/);
  assert.match(workspace,/AdminSchoolStatusManager/);
});

test("announcement management is protected by permission-aware RLS",()=>{
  assert.match(migration,/public reads published announcements/);
  assert.match(migration,/content editors create announcements/);
  assert.match(migration,/content editors update announcements/);
  assert.match(migration,/site admins delete announcements/);
  assert.match(manager,/status:"draft"/);
  assert.match(manager,/Publish/);
  assert.match(manager,/Archive/);
  assert.match(manager,/Delete permanently/);
});

test("school calendar management is content-editor scoped and Tokyo based",()=>{
  assert.match(calendarMigration,/public reads published school events/);
  assert.match(calendarMigration,/content editors create school events/);
  assert.match(calendarMigration,/content editors update school events/);
  assert.match(calendarMigration,/site admins delete school events/);
  assert.match(eventManager,/status:"draft"/);
  assert.match(eventManager,/Starts \(Tokyo\)/);
  assert.match(eventManager,/\+09:00/);
  assert.match(eventManager,/Publish/);
  assert.match(eventManager,/Cancel event/);
  assert.match(workspace,/AdminEventManager/);
});

test("moderators have a private character directory rather than global profile exposure",()=>{
  assert.match(directory,/administration_character_directory/);
  assert.match(directory,/Open reports/);
  assert.match(directoryMigration,/moderator permission required/);
  assert.match(directoryMigration,/security invoker/);
  assert.match(directoryMigration,/limit 100/);
});

test("Site Admin academic management preserves role separation",()=>{
  assert.match(workspace,/access\.site_admin&&<AdminAcademicManager/);
  assert.match(academics,/academic_courses/);
  assert.match(academics,/class_sections/);
  assert.match(academics,/section_meetings/);
  assert.match(academics,/admin_assign_character_to_section/);
  assert.match(academicMigration,/site admins manage academic courses/);
  assert.match(academicMigration,/student membership requires a student character/);
  assert.match(academicMigration,/instructor membership requires a faculty character/);
  assert.match(academicMigration,/security invoker/);
});

test("Administration is a full-screen Canvas-style application section",()=>{
  assert.match(adminPage,/PortalAppPage\.module\.css/);
  assert.match(adminPage,/AdminPortalClient/);
  assert.doesNotMatch(adminPage,/ADMINISTRATION NETWORK/);
  assert.doesNotMatch(adminPage,/Character roles cannot unlock admin tools/);
  assert.match(adminClient,/AdminWorkspace/);
  assert.match(workspace,/hanami-high-portal-icon\.png/);
  assert.match(workspace,/AdminSchoolStatusManager/);
  assert.match(workspace,/AdminAnnouncementManager/);
  assert.match(workspace,/AdminEventManager/);
  assert.match(workspace,/AdminModerationManager/);
  assert.match(workspace,/AdminCharacterDirectory/);
  assert.match(workspace,/AdminAcademicManager/);
});
