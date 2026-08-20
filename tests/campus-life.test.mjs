import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const campus=await readFile(new URL("../app/campus-life/page.tsx",import.meta.url),"utf8");
const directory=await readFile(new URL("../app/components/campus-directory.tsx",import.meta.url),"utf8");
const opportunities=await readFile(new URL("../app/components/live-campus-opportunities.tsx",import.meta.url),"utf8");
const roleplayDate=await readFile(new URL("../app/components/roleplay-date.ts",import.meta.url),"utf8");

test("Campus Life includes every approved public requirement",()=>{for(const expected of ["CLUBS, ATHLETICS & ORGANIZATIONS","STUDENT GOVERNMENT","CAMPUS EVENTS CALENDAR","CAMPUS GALLERY","HEALTH, COUNSELING & LIBRARY","CAMPUS OPPORTUNITIES"])assert.match(`${campus}\n${directory}`,new RegExp(expected));});
test("campus directory is searchable, filterable, and live",()=>{assert.match(directory,/type="search"/);assert.match(directory,/Activity type/);assert.match(directory,/aria-live="polite"/);assert.match(directory,/rest\/v1\/campus_activities/);assert.doesNotMatch(directory,/DEVELOPMENT DATA|TEST DIRECTORY|is_test_data/);});
test("campus uses live published opportunities with the Student Portal application flow",()=>{assert.match(campus,/LiveCampusOpportunities/);assert.match(opportunities,/Apply in Student Portal/);assert.match(opportunities,/status=eq\.published/);assert.match(campus,/Only published opportunities appear here/);assert.doesNotMatch(campus,/TEST LISTINGS/);});
test("Campus Life uses the Tokyo 2006 roleplay clock",()=>{assert.match(campus,/hanamiRoleplayDate/);assert.match(roleplayDate,/HANAMI_ROLEPLAY_YEAR=2006/);assert.match(roleplayDate,/Asia\/Tokyo/);});
test("Campus Life returns signed-in students to real portal routes",()=>{assert.doesNotMatch(campus,/#portal-access/);assert.match(campus,/href="\.\.\/portal\/student\/"/);assert.match(campus,/href="\.\.\/calendar\/"/);});
