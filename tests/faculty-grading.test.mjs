import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const grading=await readFile(new URL("../app/portal/FacultyGradingPanel.tsx",import.meta.url),"utf8");
const faculty=await readFile(new URL("../app/portal/FacultyCourseManager.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const courseworkMigration=await readFile(new URL("../supabase/migrations/20260818141500_coursework_foundation.sql",import.meta.url),"utf8");

test("faculty grading is scoped to instructor-owned sections",()=>{
  assert.match(grading,/relationship=eq\.instructor/);
  assert.match(grading,/character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.match(grading,/assignment_submissions/);
  assert.match(grading,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.match(courseworkMigration,/instructors read submissions for own sections/);
  assert.match(courseworkMigration,/instructors update submissions for own sections/);
});

test("faculty can create assignments only through assigned instructor sections",()=>{
  assert.match(faculty,/relationship=eq\.instructor/);
  assert.match(faculty,/created_by_character_id:characterId/);
  assert.match(courseworkMigration,/instructors create assignments for own sections/);
  assert.match(courseworkMigration,/creator\.role = 'faculty'/);
});

test("grading enforces assignment point maximum before returning",()=>{
  assert.match(grading,/gradeValue>assignment\.points/);
  assert.match(grading,/status:"returned"/);
  assert.match(grading,/Return graded work/);
});

test("faculty dashboard renders both course management and grading",()=>{
  assert.match(dashboard,/FacultyCourseManager accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.match(dashboard,/FacultyGradingPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
});
