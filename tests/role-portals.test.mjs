import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const roleClient=await readFile(new URL("../app/portal/RolePortalClient.tsx",import.meta.url),"utf8");
const studentPage=await readFile(new URL("../app/portal/student/page.tsx",import.meta.url),"utf8");
const facultyPage=await readFile(new URL("../app/portal/faculty/page.tsx",import.meta.url),"utf8");

test("student and faculty have separate website sections",()=>{
  assert.match(studentPage,/Student Portal/);
  assert.match(studentPage,/RolePortalClient role="student"/);
  assert.match(facultyPage,/Faculty Portal/);
  assert.match(facultyPage,/RolePortalClient role="faculty"/);
});

test("role portal restores the selected character session",()=>{
  assert.match(roleClient,/hanami\.portal\.session\.v1/);
  assert.match(roleClient,/hanami\.portal\.character\.v1/);
  assert.match(roleClient,/localStorage\.getItem\(CHARACTER_SESSION_KEY\)/);
  assert.match(roleClient,/is_active=eq\.true/);
  assert.match(roleClient,/activeCharacter\.role!==role/);
});

test("direct navigation cannot bypass role matching",()=>{
  assert.match(roleClient,/Your active character is a \$\{activeCharacter\.role\}/);
  assert.match(roleClient,/Open the matching portal section or switch characters/);
  assert.match(roleClient,/DashboardShell character=\{character\} accessToken=\{session\.accessToken\}/);
});

test("role portal logout clears character and account session",()=>{
  assert.match(roleClient,/is_active:false/);
  assert.match(roleClient,/localStorage\.removeItem\(SESSION_KEY\)/);
  assert.match(roleClient,/localStorage\.removeItem\(CHARACTER_SESSION_KEY\)/);
  assert.match(roleClient,/>Logout</);
});
