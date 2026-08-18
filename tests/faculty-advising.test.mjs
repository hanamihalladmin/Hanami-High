import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const panel=await readFile(new URL("../app/portal/FacultyAdvisingPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818150500_faculty_student_advising_roster.sql",import.meta.url),"utf8");

test("faculty advising roster is loaded through controlled RPC",()=>{
  assert.match(panel,/rpc\/faculty_student_roster/);
  assert.match(panel,/faculty_character_id:characterId/);
  assert.match(panel,/Authorization:`Bearer \$\{accessToken\}`/);
});

test("advising roster only includes students from taught sections",()=>{
  assert.match(migration,/faculty\.owner_user_id = auth\.uid\(\)/);
  assert.match(migration,/faculty\.role = 'faculty'/);
  assert.match(migration,/instructor\.relationship = 'instructor'/);
  assert.match(migration,/enrolled\.relationship = 'student'/);
  assert.match(migration,/student\.role = 'student'/);
});

test("public advising RPC is security invoker with private internal helper",()=>{
  assert.match(migration,/private\.faculty_student_roster_internal/);
  assert.match(migration,/create or replace function public\.faculty_student_roster/);
  assert.match(migration,/security invoker/);
  assert.match(migration,/revoke all on function private\.faculty_student_roster_internal/);
});

test("faculty dashboard renders advising without a placeholder",()=>{
  assert.match(dashboard,/FacultyAdvisingPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.doesNotMatch(dashboard,/Module coming next/);
  assert.match(panel,/It does not open private student profiles or expose unrelated characters/);
});
