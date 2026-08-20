import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const page=await readFile(new URL("../app/portal/owner/page.tsx",import.meta.url),"utf8");
const owner=await readFile(new URL("../app/portal/owner/OwnerPortalClient.tsx",import.meta.url),"utf8");
const workspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const gateway=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");
const workflow=await readFile(new URL("../.github/workflows/deploy-pages.yml",import.meta.url),"utf8");
const claimMigration=await readFile(new URL("../supabase/migrations/20260818195549_allow_owner_created_unclaimed_admin_logins.sql",import.meta.url),"utf8");
const ownerAdminAccessMigration=await readFile(new URL("../supabase/migrations/20260818201207_owner_automatic_administrator_portal_access.sql",import.meta.url),"utf8");
const helperGrantMigration=await readFile(new URL("../supabase/migrations/20260818202431_restore_privileged_session_helper_execute.sql",import.meta.url),"utf8");

test("Owner has a separate exported portal section",()=>{
  assert.match(page,/PortalAppPage\.module\.css/);
  assert.match(page,/OwnerPortalClient/);
  assert.doesNotMatch(page,/OWNER CONTROL NETWORK/);
  assert.match(workflow,/out\/portal\/owner\/index\.html/);
});

test("Owner portal requires both Discord Owner identity and privileged credentials",()=>{
  assert.match(owner,/current_owner_status/);
  assert.match(owner,/has_privileged_portal_session/);
  assert.match(owner,/portalKind="owner"/);
  assert.match(owner,/allowOwnerBootstrap/);
  assert.match(owner,/Owner identity and privileged sign-in verified/);
});

test("Owner automatically satisfies the Administrator privileged gate",()=>{
  assert.match(ownerAdminAccessMigration,/requested_portal = 'administrator'/);
  assert.match(ownerAdminAccessMigration,/private\.is_owner_discord_user\(\)/);
  assert.match(ownerAdminAccessMigration,/then true/);
  assert.match(ownerAdminAccessMigration,/privileged_portal_sessions/);
});

test("privileged session wrapper can execute its private helper",()=>{
  assert.match(helperGrantMigration,/grant execute on function private\.has_privileged_portal_session_internal\(text\) to authenticated/);
});

test("Owner controls are integrated into the shared Canvas administration shell",()=>{
  assert.match(owner,/NETWORK OVERVIEW/);
  assert.match(owner,/ADMINISTRATOR PROVISIONING/);
  assert.match(owner,/AdminWorkspace/);
  assert.match(owner,/OWNER_ADMIN_ACCESS/);
  assert.match(owner,/ownerOverview=\{ownerOverview\}/);
  assert.match(owner,/actions=\{railActions\}/);
  assert.doesNotMatch(owner,/Owner Control Center/);
  assert.doesNotMatch(owner,/PORTAL ACCESS/);
  assert.match(workspace,/ownerMode/);
  assert.match(workspace,/AdminAnnouncementManager/);
  assert.match(workspace,/AdminAcademicManager/);
  assert.match(workspace,/AdminHallPassManager/);
});

test("Owner gateway handoff is returned only after server Owner verification",()=>{
  assert.match(gateway,/current_owner_status/);
  assert.match(gateway,/setIsOwner\(ownerStatus\)/);
  assert.match(gateway,/isOwner&&/);
  assert.match(gateway,/Enter Owner Portal/);
});

test("Owner can create bound or claimable Administrator logins",()=>{
  assert.match(owner,/owner_create_admin_credential/);
  assert.match(owner,/target_discord_user_id:cleanTarget\|\|null/);
  assert.match(owner,/ADMIN DISCORD USER ID • OPTIONAL/);
  assert.match(owner,/ADMIN PASSWORD • 12\+ CHARACTERS/);
  assert.match(claimMigration,/bound_discord_user_id is null/);
  assert.match(claimMigration,/claimed_at = now\(\)/);
  assert.match(claimMigration,/values\(auth\.uid\(\), 'site_admin', null\)/);
});
