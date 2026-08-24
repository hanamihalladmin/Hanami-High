import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/20260824213000_homeroom_scoped_coursework_and_schedule_enrollment.sql","utf8");
const faculty=fs.readFileSync("app/portal/FacultyCourseManager.tsx","utf8");

test("students are enrolled from their homeroom schedule",()=>{
 assert.match(migration,/sync_homeroom_schedule_enrollments/);
 assert.match(migration,/owner_homeroom_daily_schedule/);
 assert.match(migration,/block_type='class_period'/);
 assert.match(migration,/enrollment_source='homeroom_schedule'/);
});

test("student assignment visibility is homeroom scoped",()=>{
 assert.match(migration,/course_assignment_homerooms/);
 assert.match(migration,/students read published assignments for scheduled homeroom courses/);
 assert.match(migration,/hm\.homeroom_id=cah\.homeroom_id/);
});

test("faculty can target classwork to one or more homerooms",()=>{
 assert.match(faculty,/Assign to homeroom\(s\)/);
 assert.match(faculty,/targetHomerooms/);
 assert.match(faculty,/course_assignment_homerooms/);
 assert.match(faculty,/Choose at least one homeroom for this assignment/);
});
