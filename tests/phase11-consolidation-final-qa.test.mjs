import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";

const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");
const auth=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");
const classroom=await readFile(new URL("../app/portal/ClassroomOperationsPanel.tsx",import.meta.url),"utf8");
const regressionCss=await readFile(new URL("../app/post-rebuild-regressions.css",import.meta.url),"utf8");
const phase6=await readFile(new URL("../app/styles/rebuild/profile-community-phase6.css",import.meta.url),"utf8");

test("final layout no longer mounts the obsolete post-rebuild DOM patcher",async()=>{
  assert.doesNotMatch(layout,/PostRebuildRegressionRuntime/);
  await assert.rejects(access(new URL("../app/components/PostRebuildRegressionRuntime.tsx",import.meta.url)));
});

test("portal logout scopes character deactivation and browser memory to the authenticated account",()=>{
  assert.match(auth,/\/auth\/v1\/user/);
  assert.match(auth,/owner_user_id=eq\.\$\{encodeURIComponent\(userId\)\}/);
  assert.match(auth,/hanami\.portal\.character\.v2\.\$\{userId\}/);
  assert.match(auth,/clearSession\(userId\)/);
});

test("classroom seating is component-owned as a five by four grid",()=>{
  assert.match(classroom,/SEAT_ROWS=5,SEAT_COLS=4/);
  assert.match(classroom,/repeat\(\$\{SEAT_COLS\}/);
  assert.doesNotMatch(regressionCss,/repeat\(6/);
  assert.doesNotMatch(regressionCss,/hanami-course-banner-editor/);
});

test("Phase 6 social identity styling remains attached to the live Account wrapper",()=>{
  assert.match(phase6,/dashboard-title/);
  assert.match(phase6,/data-portal-view=\"account\"/);
  assert.match(phase6,/HANAMI SOCIAL IDENTITY/);
});
