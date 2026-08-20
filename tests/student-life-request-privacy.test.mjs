import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const panel=await read("app/portal/StudentLifeSystemsPanel.tsx");
const migration=await read("supabase/migrations/20260820032000_active_student_scoped_life_requests.sql");

test("Student hall passes and attendance excuses are scoped to the active Student character",()=>{
  assert.match(panel,/student_hall_pass_feed/);
  assert.match(panel,/student_attendance_excuse_feed/);
  assert.match(panel,/passes\.filter\(p=>p\.student_character_id===characterId\)/);
  assert.match(panel,/excuses\.filter\(e=>e\.student_character_id===characterId\)/);
});

test("Student life feeds validate owned Student character even for privileged accounts",()=>{
  assert.match(migration,/hp\.student_character_id=viewer_character_id/);
  assert.match(migration,/ae\.student_character_id=viewer_character_id/);
  assert.match(migration,/c\.owner_user_id=auth\.uid\(\)/);
  assert.match(migration,/c\.role='student'/);
  assert.match(migration,/security invoker/);
  assert.match(migration,/grant execute on function public\.student_hall_pass_feed\(uuid\) to authenticated/);
  assert.match(migration,/grant execute on function public\.student_attendance_excuse_feed\(uuid\) to authenticated/);
});
