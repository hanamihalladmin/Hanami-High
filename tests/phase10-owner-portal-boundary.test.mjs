import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const viewer=await readFile(new URL("../app/portal/owner/portal-viewer/OwnerUserPortalViewer.tsx",import.meta.url),"utf8");
const ownerClient=await readFile(new URL("../app/portal/owner/OwnerPortalClient.tsx",import.meta.url),"utf8");
const ownerPage=await readFile(new URL("../app/portal/owner/page.tsx",import.meta.url),"utf8");
const workspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const ownerCss=await readFile(new URL("../app/styles/rebuild/owner-phase10.css",import.meta.url),"utf8");

test("Owner portal viewer requires configured Owner identity and privileged Owner unlock",()=>{
  assert.match(viewer,/current_owner_status/);
  assert.match(viewer,/has_privileged_portal_session/);
  assert.match(viewer,/requested_portal:\"owner\"/);
  assert.match(viewer,/Unlock the Owner Portal with the separate Owner credential/);
  assert.match(ownerClient,/has_privileged_portal_session/);
});

test("Owner portal oversight remains read-only and does not require an OC",()=>{
  assert.match(viewer,/owner_portal_directory/);
  assert.match(viewer,/Viewing does not switch or impersonate/);
  assert.match(viewer,/does not require creating an OC/);
  assert.doesNotMatch(viewer,/hanami\.portal\.character\.v2/);
  assert.match(ownerPage,/Owner access does not require creating or switching to a student or faculty OC/);
  assert.match(ownerPage,/View portal/);
  assert.match(ownerClient,/Portal Viewer/);
  assert.doesNotMatch(ownerClient,/>Student Portal</);
  assert.doesNotMatch(ownerClient,/>Faculty Portal</);
});

test("Owner uses the canonical Phase 10 OperationsShell map while Admin keeps Phase 9 navigation",()=>{
  for(const label of ["Command Center","Users","Characters","Portals","School Data","Website","Moderation","Economy","Integrations","System","Settings"])assert.match(workspace,new RegExp(`\\"${label}\\"`));
  for(const label of ["Dashboard","People","Academics","Communications","Campus","Events","Reports"])assert.match(workspace,new RegExp(`\\"${label}\\"`));
  assert.match(workspace,/ownerMode\?ownerNav:adminNav/);
  assert.match(workspace,/ownerProvisioning/);
  assert.match(workspace,/portalOverview/);
  assert.match(workspace,/discordSync/);
  assert.match(workspace,/systemHealth/);
  assert.match(workspace,/ownerGovernance/);
});

test("Owner-only controls are distributed into owning sections and long desktop lists scroll",()=>{
  assert.match(workspace,/OwnerDiscordRoleSyncPanel/);
  assert.match(workspace,/OwnerSystemHealthAnalyticsPanel/);
  assert.match(workspace,/OwnerFeedbackInboxPanel/);
  assert.match(workspace,/OwnerBugDetectorPanel/);
  assert.match(workspace,/OwnerGovernanceExpansionPanel/);
  assert.match(ownerCss,/Owner global navigation/);
  assert.match(ownerCss,/flex:1 1 auto/);
  assert.match(ownerCss,/aria-label\$=\" tools\"/);
  assert.match(ownerCss,/max-height:calc\(100dvh - 82px\)/);
  assert.match(ownerCss,/overflow-y:auto/);
});

test("Owner lock preserves normal portal session while logout clears account-scoped character memory",()=>{
  assert.match(ownerClient,/end_privileged_portal_session/);
  assert.match(ownerClient,/Normal Hanami sign-in remains active/);
  assert.match(ownerClient,/localStorage\.removeItem\(`hanami\.portal\.character\.v2\.\$\{userId\}`\)/);
  assert.match(ownerClient,/localStorage\.removeItem\(SESSION_KEY\)/);
});
