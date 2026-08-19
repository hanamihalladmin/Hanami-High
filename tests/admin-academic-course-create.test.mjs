import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const panel=await readFile(new URL("../app/portal/admin/AdminAcademicManager.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260819024132_admin_create_academic_course_rpc.sql",import.meta.url),"utf8");

test("Admin Academic course creation uses privileged RPC",()=>{
  assert.match(panel,/\/rest\/v1\/rpc\/admin_create_academic_course/);
  assert.doesNotMatch(panel,/fetch\(`\$\{SUPABASE_URL\}\/rest\/v1\/academic_courses`,\{method:\"POST\"/);
  assert.match(migration,/Site Admin access required/);
  assert.match(migration,/private\.account_has_permission\(auth\.uid\(\),'site_admin'\)/);
});

test("course creation reports specific server failures",()=>{
  assert.match(panel,/That course code already exists/);
  assert.match(panel,/One or more course values are invalid/);
  assert.match(panel,/Site Admin authorization could not be verified/);
  assert.doesNotMatch(panel,/The course could not be created\. Check the code format/);
});
