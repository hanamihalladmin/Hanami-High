import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const academics=await readFile(new URL("../app/academics/page.tsx",import.meta.url),"utf8");
const catalog=await readFile(new URL("../app/components/course-catalog.tsx",import.meta.url),"utf8");
const roleplayDate=await readFile(new URL("../app/components/roleplay-date.ts",import.meta.url),"utf8");

test("Academics contains all approved public requirements",()=>{
  for(const expected of ["ACADEMIC DEPARTMENTS","COURSE CATALOG","GRADUATION REQUIREMENTS","ACADEMIC CALENDAR","HONORS & ADVANCED STUDY","GUIDANCE COUNSELING"]) assert.match(`${academics}\n${catalog}`,new RegExp(expected));
});

test("course catalog supports live search and department filtering",()=>{
  assert.match(catalog,/type="search"/); assert.match(catalog,/Department/); assert.match(catalog,/aria-live="polite"/); assert.match(catalog,/rest\/v1\/academic_courses/); assert.match(catalog,/No courses have been published yet/);
});

test("launch course catalog contains no development or test-data presentation",()=>{
  assert.doesNotMatch(catalog,/DEVELOPMENT DATA/); assert.doesNotMatch(catalog,/TEST DATA/); assert.doesNotMatch(catalog,/is_test_data/);
});

test("academics uses the Tokyo 2006–07 roleplay calendar and 32-credit graduation",()=>{
  assert.match(academics,/hanamiRoleplayDate/); assert.match(academics,/HANAMI_SCHOOL_YEAR/); assert.match(roleplayDate,/2006–07/); assert.match(roleplayDate,/Asia\/Tokyo/); assert.match(academics,/32 CREDITS TOTAL/);
});

test("Academics uses real portal and complete calendar routes",()=>{
  assert.doesNotMatch(academics,/#portal-access/);
  assert.match(academics,/href="\.\.\/portal\/student\/"/);
  assert.match(academics,/href="\.\.\/calendar\/">View complete calendar/);
});
