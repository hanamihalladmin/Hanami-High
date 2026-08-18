import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const campus=await readFile(new URL("../app/campus-life/page.tsx",import.meta.url),"utf8");
const directory=await readFile(new URL("../app/components/campus-directory.tsx",import.meta.url),"utf8");
test("Campus Life includes every approved public requirement",()=>{for(const expected of ["CLUBS, ATHLETICS & ORGANIZATIONS","STUDENT GOVERNMENT","CAMPUS EVENTS CALENDAR","CAMPUS GALLERY","HEALTH, COUNSELING & LIBRARY","JOBS & VOLUNTEER OPPORTUNITIES"])assert.match(`${campus}\n${directory}`,new RegExp(expected));});
test("campus directory is searchable and filterable",()=>{assert.match(directory,/type="search"/);assert.match(directory,/Activity type/);assert.match(directory,/aria-live="polite"/);});
test("campus development records are clearly labeled",()=>{assert.match(directory,/DEVELOPMENT DATA/);assert.match(campus,/TEST EVENTS/);assert.match(campus,/TEST LISTINGS/);});
test("Campus Life returns signed-in students to real portal routes",()=>{assert.doesNotMatch(campus,/#portal-access/);assert.match(campus,/href="\.\.\/portal\/"/);assert.match(campus,/href="\.\.\/portal\/student\/"/);assert.match(campus,/Open interest in Student Portal/);assert.match(campus,/href="\.\.\/calendar\/"/);});
