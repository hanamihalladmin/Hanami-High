import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const panel=await readFile(new URL("../app/portal/CourseworkPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818141500_coursework_foundation.sql",import.meta.url),"utf8");

test("student coursework is scoped to the active character enrollments",()=>{
  assert.match(panel,/section_memberships\?select=section_id/);
  assert.match(panel,/character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.match(panel,/relationship=eq\.student/);
  assert.match(panel,/course_assignments/);
  assert.match(panel,/student_character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.match(panel,/Authorization:`Bearer \$\{accessToken\}`/);
});

test("student dashboard uses real coursework instead of a coursework placeholder",()=>{
  assert.match(dashboard,/CourseworkPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.doesNotMatch(dashboard,/\["ASSIGNMENTS","Coursework"/);
});

test("coursework RLS separates students and instructors",()=>{
  assert.match(migration,/students read published assignments for own classes/);
  assert.match(migration,/instructors read assignments for own sections/);
  assert.match(migration,/students read own submissions/);
  assert.match(migration,/students create own submissions/);
  assert.match(migration,/instructors update submissions for own sections/);
  assert.match(migration,/revoke delete on public\.assignment_submissions from authenticated/);
});

test("coursework keeps test data visibly labeled",()=>{
  assert.match(panel,/TEST/);
  assert.match(panel,/is_test_data/);
});
