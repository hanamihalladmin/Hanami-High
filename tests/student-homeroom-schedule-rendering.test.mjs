import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schedule=fs.readFileSync("app/portal/StudentDashboardSchedule.tsx","utf8");

test("student schedule renders class periods from the published homeroom schedule",()=>{
 assert.match(schedule,/block\.block_type===\"class_period\"/);
 assert.match(schedule,/blockRoom!==roomLetter/);
 assert.match(schedule,/sectionsByCode\.get\(block\.title\.toUpperCase\(\)\)/);
 assert.match(schedule,/kind:\"class\"/);
});

test("student schedule ignores duplicated per-homeroom copies of shared school blocks",()=>{
 assert.match(schedule,/block\.notes===\"owner_homeroom_daily_schedule\"/);
 assert.match(schedule,/if\(!isSchoolwide\(block\)\)continue/);
});
