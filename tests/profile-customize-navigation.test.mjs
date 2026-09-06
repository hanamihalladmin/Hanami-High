import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const context=await readFile(new URL("../app/portal/PortalContextBar.tsx",import.meta.url),"utf8");
const appearance=await readFile(new URL("../app/portal/AppearanceCollectiblesPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");

test("Student and Faculty Account navigation exposes the real Profile Designer",()=>{
  assert.match(context,/subView:"designer",label:"Profile Designer"/);
  assert.match(dashboard,/\["designer","Profile Designer"\]/);
});

test("Customize your profile opens the real designer workspace",()=>{
  assert.match(appearance,/Open Profile Designer/);
  assert.match(appearance,/view:"profile",subView:"designer"/);
  assert.match(dashboard,/ProfileDesignWorkspace accessToken=\{accessToken\} characterId=\{character\.id\}/);
});
