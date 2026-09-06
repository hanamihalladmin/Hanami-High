import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const viewer=await readFile(new URL("../app/portal/owner/portal-viewer/OwnerUserPortalViewer.tsx",import.meta.url),"utf8");
const ownerClient=await readFile(new URL("../app/portal/owner/OwnerPortalClient.tsx",import.meta.url),"utf8");
const ownerPage=await readFile(new URL("../app/portal/owner/page.tsx",import.meta.url),"utf8");

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
});
