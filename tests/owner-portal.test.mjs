import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const page=await readFile(new URL("../app/portal/owner/page.tsx",import.meta.url),"utf8");
const owner=await readFile(new URL("../app/portal/owner/OwnerPortalClient.tsx",import.meta.url),"utf8");
const gateway=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");
const workflow=await readFile(new URL("../.github/workflows/deploy-pages.yml",import.meta.url),"utf8");

test("Owner has a separate exported portal section",()=>{
  assert.match(page,/OWNER CONTROL NETWORK/);
  assert.match(page,/OwnerPortalClient/);
  assert.match(workflow,/out\/portal\/owner\/index\.html/);
});

test("Owner portal requires both Discord Owner identity and privileged credentials",()=>{
  assert.match(owner,/current_owner_status/);
  assert.match(owner,/has_privileged_portal_session/);
  assert.match(owner,/portalKind="owner"/);
  assert.match(owner,/allowOwnerBootstrap/);
  assert.match(owner,/Owner identity and privileged sign-in verified/);
});

test("Owner Control Center stays separate from Administration operations",()=>{
  assert.match(owner,/Owner Control Center/);
  assert.match(owner,/NETWORK OVERVIEW/);
  assert.match(owner,/PORTAL ACCESS/);
  assert.match(owner,/ADMINISTRATOR PROVISIONING/);
  assert.match(owner,/OWNER TESTING/);
  assert.match(owner,/\.\.\/admin\//);
  assert.doesNotMatch(owner,/AdminAnnouncementManager/);
  assert.doesNotMatch(owner,/AdminAcademicManager/);
});

test("Owner gateway handoff is returned only after server Owner verification",()=>{
  assert.match(gateway,/current_owner_status/);
  assert.match(gateway,/setIsOwner\(ownerStatus\)/);
  assert.match(gateway,/isOwner&&/);
  assert.match(gateway,/Enter Owner Portal/);
});

test("Owner can provision bound Administrator credentials",()=>{
  assert.match(owner,/owner_create_admin_credential/);
  assert.match(owner,/target_discord_user_id/);
  assert.match(owner,/ADMIN DISCORD USER ID/);
  assert.match(owner,/ADMIN PASSWORD • 12\+ CHARACTERS/);
});
