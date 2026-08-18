import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const academics=await readFile(new URL("../app/academics/page.tsx",import.meta.url),"utf8");
const catalog=await readFile(new URL("../app/components/course-catalog.tsx",import.meta.url),"utf8");

test("Academics contains all approved public requirements",()=>{
  for(const expected of ["ACADEMIC DEPARTMENTS","COURSE CATALOG","GRADUATION REQUIREMENTS","ACADEMIC CALENDAR","HONORS & ADVANCED STUDY","GUIDANCE COUNSELING"]) assert.match(`${academics}\n${catalog}`,new RegExp(expected));
});

test("course catalog supports search and useful filters",()=>{
  assert.match(catalog,/type="search"/); assert.match(catalog,/Department/); assert.match(catalog,/Level/); assert.match(catalog,/aria-live="polite"/);
});

test("development course records are clearly identified as test data",()=>{
  assert.match(catalog,/DEVELOPMENT DATA/); assert.match(catalog,/not official roleplay enrollments or academic records/);
});

test("academics uses Tokyo dates and documents 32-credit graduation",()=>{
  assert.match(academics,/timeZone:"Asia\/Tokyo"/); assert.match(academics,/32 CREDITS TOTAL/);
});
