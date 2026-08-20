import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schedule=fs.readFileSync("app/portal/SchedulePanel.tsx","utf8");
const faculty=fs.readFileSync("app/portal/FacultyCourseManager.tsx","utf8");
const admin=fs.readFileSync("app/portal/admin/AdminAcademicManager.tsx","utf8");
const shared=fs.readFileSync("app/classroom-hub.css","utf8");
const scheduleCss=fs.readFileSync("app/portal/SchedulePanel.module.css","utf8");

test("Student courses use customizable Canvas-style cards",()=>{
 assert.match(schedule,/COURSES/);
 assert.match(schedule,/classroomGrid/);
 assert.match(schedule,/classBanner/);
 assert.match(schedule,/Open course/);
 assert.match(schedule,/teacherLabel/);
 assert.match(schedule,/character_portal_preferences/);
 assert.match(schedule,/class_banner_colors/);
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

test("Course card layout is responsive and adaptive",()=>{
 assert.match(shared,/classroom-card-banner/);
 assert.match(scheduleCss,/grid-template-columns:repeat\(auto-fit,minmax\(235px,1fr\)\)/);
 assert.match(scheduleCss,/@media\(max-width:620px\)/);
 assert.match(scheduleCss,/classroomGrid\{grid-template-columns:1fr/);
});
