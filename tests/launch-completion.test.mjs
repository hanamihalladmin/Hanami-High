import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const [gateway,rolePortal,admin,owner,workspace,governance,inbox,signer,dashboard,facultyCourses,studio,profileWorkspace,lookup,mobile,layout,roleplayDate,calendar,accountGate,discordSync]=await Promise.all([
  read("app/portal/PortalAuthPanel.tsx"),read("app/portal/RolePortalClient.tsx"),read("app/portal/admin/AdminPortalClient.tsx"),read("app/portal/owner/OwnerPortalClient.tsx"),read("app/portal/admin/AdminWorkspace.tsx"),read("app/portal/admin/AdminGovernancePanel.tsx"),read("app/portal/InboxPanel.tsx"),read("supabase/functions/message-media-sign/index.ts"),read("app/portal/DashboardShell.tsx"),read("app/portal/FacultyCourseManager.tsx"),read("app/portal/ProfileStudioPanel.tsx"),read("app/portal/ProfileDesignWorkspace.tsx"),read("app/portal/ProfileLookupPanel.tsx"),read("app/mobile.css"),read("app/layout.tsx"),read("app/components/roleplay-date.ts"),read("app/calendar/page.tsx"),read("supabase/migrations/20260818213000_enforce_account_status_at_portal_gate.sql"),read("supabase/functions/discord-role-sync/index.ts")
]);

test("launch gate synchronizes Discord roles through signed-in OAuth without exposing a bot token",()=>{
  assert.match(discordSync,/provider_token/);assert.match(discordSync,/discord_guild_id/);assert.match(discordSync,/users\/@me\/guilds/);assert.match(discordSync,/users\/@me/);
  assert.doesNotMatch(discordSync,/HANAMI_DISCORD_BOT_TOKEN/);
  assert.match(gateway,/discord-role-sync/);assert.match(gateway,/current_discord_role_sync/);assert.match(gateway,/Resync roles/);
  assert.match(rolePortal,/roleSync\?\.sync_status==="synced"/);assert.match(rolePortal,/roleSync\[role\]/);
  assert.match(admin,/roles\.administrator/);assert.match(admin,/roles\.owner/);
  assert.doesNotMatch(gateway,/HANAMI_DISCORD_BOT_TOKEN/);
});

test("Owner TEST Faculty fixture remains usable after Discord role sync is enabled",()=>{
  assert.match(rolePortal,/current_owner_status/);
  assert.match(rolePortal,/const ownerTestFaculty=isOwner&&role==="faculty"&&activeCharacter\.handle\.startsWith\("testfaculty_"\)/);
  assert.match(rolePortal,/sync_status==="not_member"&&!ownerTestFaculty/);
  assert.match(rolePortal,/!roleSync\[role\]&&!ownerTestFaculty/);
});

test("suspended accounts are blocked and governance is audited",()=>{
  assert.match(accountGate,/current_account_status/);assert.match(rolePortal,/current_account_status/);assert.match(admin,/current_account_status/);
  assert.match(governance,/account_governance_directory/);assert.match(governance,/set_account_status/);assert.match(governance,/system_audit_log_feed/);assert.match(governance,/Suspend/);assert.match(governance,/Reactivate/);
  assert.match(admin,/AdminWorkspace/);assert.match(owner,/AdminWorkspace/);assert.match(workspace,/AdminGovernancePanel/);
});

test("messaging launch feature set includes unread state attachments and group management",()=>{
  assert.match(inbox,/conversation_unread_counts/);assert.match(inbox,/mark_conversation_read/);assert.match(inbox,/message_attachments/);assert.match(inbox,/message-media-sign/);assert.match(inbox,/8\*1024\*1024/);
  for(const action of ["add_group_participant","remove_group_participant","rename_group_conversation","leave_group_conversation"])assert.match(inbox,new RegExp(action));
  assert.match(signer,/conversation_participants/);assert.match(signer,/message_attachments/);assert.match(signer,/expiresIn:900/);assert.match(signer,/expires_in:900/);
});

test("academic launch feature set includes attendance report cards and weighted grading",()=>{
  assert.match(dashboard,/StudentAcademicRecordPanel/);assert.match(dashboard,/FacultyAttendanceReportPanel/);
  assert.match(facultyCourses,/section_grade_categories/);assert.match(facultyCourses,/weight_percent/);assert.match(facultyCourses,/grade_category_id/);assert.match(facultyCourses,/assignment_group/);assert.match(facultyCourses,/late_policy/);
});

test("Profile Studio includes duplication shape choice and private backgrounds",()=>{
  assert.match(studio,/Duplicate/);assert.match(studio,/Corner radius/);assert.match(studio,/borderRadius/);
  assert.match(profileWorkspace,/Upload background/);assert.match(profileWorkspace,/Clear background/);assert.match(profileWorkspace,/background_storage_path/);assert.match(lookup,/background_storage_path/);
});

test("public chronology is anchored to April 7 2006 and calendar stays in-universe",()=>{
  assert.match(roleplayDate,/HANAMI_ROLEPLAY_YEAR=2006/);assert.match(roleplayDate,/HANAMI_SCHOOL_YEAR="2006–07"/);assert.match(roleplayDate,/HANAMI_FIRST_DAY_ISO="2006-04-07T12:00:00\+09:00"/);assert.match(roleplayDate,/Asia\/Tokyo/);
  assert.match(calendar,/HANAMI_ROLEPLAY_YEAR/);assert.match(calendar,/LIVE CMS • \{HANAMI_ROLEPLAY_YEAR\} • JST/);assert.match(calendar,/status=eq\.published/);
});

test("site-wide responsive layer is loaded and includes phone/tablet QA breakpoints",()=>{
  assert.match(layout,/mobile\.css/);assert.match(mobile,/@media\(max-width:900px\)/);assert.match(mobile,/@media\(max-width:640px\)/);assert.match(mobile,/@media\(max-width:420px\)/);assert.match(mobile,/font-size:16px!important/);assert.match(mobile,/pointer:coarse/);
});

test("launch client source contains no service-role credential",()=>{
  for(const source of [gateway,rolePortal,admin,owner,workspace,governance,inbox,dashboard,facultyCourses,studio,profileWorkspace,lookup])assert.doesNotMatch(source,/service[_-]?role/i);
});
