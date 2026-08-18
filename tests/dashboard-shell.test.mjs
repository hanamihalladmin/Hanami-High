import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const manager=await readFile(new URL("../app/portal/CharacterManager.tsx",import.meta.url),"utf8");
const auth=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");

test("dashboard is driven by the active character role",()=>{
  assert.match(dashboard,/character\.role==="student"/);
  assert.match(dashboard,/STUDENT QUICK LINKS/);
  assert.match(dashboard,/FACULTY QUICK LINKS/);
  assert.match(dashboard,/Student/);
  assert.match(dashboard,/Faculty/);
});

test("dashboard does not present placeholder modules as real school data",()=>{
  assert.match(dashboard,/DASHBOARD FOUNDATION/);
  assert.match(dashboard,/placeholders until their database modules are connected/);
  assert.match(dashboard,/Module coming next/);
});

test("active character changes propagate from switcher to dashboard",()=>{
  assert.match(manager,/onActiveCharacterChange/);
  assert.match(manager,/rows\.find\(character=>character\.is_active\)/);
  assert.match(auth,/setActiveCharacter/);
  assert.match(auth,/DashboardShell character=\{activeCharacter\}/);
  assert.match(auth,/onActiveCharacterChange=\{setActiveCharacter\}/);
});
