import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schedule=fs.readFileSync("app/portal/SchedulePanel.tsx","utf8");
const faculty=fs.readFileSync("app/portal/FacultyCourseManager.tsx","utf8");
const admin=fs.readFileSync("app/portal/admin/AdminAcademicManager.tsx","utf8");
const shared=fs.readFileSync("app/classroom-hub.css","utf8");
const scheduleCss=fs.readFileSync("app/portal/SchedulePanel.module.css","utf8");

test("Student classes use Classroom-style cards",()=>{
 assert.match(schedule,/HANAMI CLASSROOM/);
 assert.match(schedule,/classroomGrid/);
 assert.match(schedule,/classBanner/);
 assert.match(schedule,/Open class/);
 assert.match(schedule,/teacherLabel/);
 assert.doesNotMatch(schedule,/is_test_data/);
});

test("Faculty classes expose Classroom tabs and cards",()=>{
 for(const label of ["stream","classwork","gradebook","people","attendance"])assert.match(faculty,new RegExp(label));
 assert.match(faculty,/classroom-card/);
 assert.match(faculty,/HANAMI CLASSROOM • FACULTY/);
});

test("Owner and Admin use a schoolwide Classroom card hub",()=>{
 assert.match(admin,/HANAMI CLASSROOM • SCHOOLWIDE/);
 assert.match(admin,/classroom-card/);
 assert.match(admin,/Manage class/);
 assert.match(admin,/Manage roster & faculty/);
});

test("Classroom layout is responsive and card-based",()=>{
 assert.match(shared,/classroom-card-banner/);
 assert.match(scheduleCss,/grid-template-columns:repeat\(3/);
 assert.match(scheduleCss,/@media\(max-width:980px\)/);
 assert.match(scheduleCss,/@media\(max-width:620px\)/);
});
