import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/20260824144800_sync_shared_school_day_blocks.sql","utf8");
const scheduler=fs.readFileSync("app/portal/owner/OwnerHomeroomScheduleEditor.tsx","utf8");

const shared=[
 ["Arrival","08:30","08:35"],
 ["Shoe Change","08:35","08:40"],
 ["Asa-no-kai","08:40","08:50"],
 ["Lunch","12:40","13:25"],
 ["Soji","15:15","15:35"],
 ["Kaeri-no-kai","15:35","15:50"],
 ["Bukatsu","16:00","18:30"],
];

test("school-wide schedule blocks stay synchronized across A, B, and C",()=>{
 assert.match(migration,/upper\(h\.code\) in \('A','B','C'\)/i);
 assert.match(migration,/values \(1::smallint\),\(2::smallint\),\(3::smallint\),\(4::smallint\),\(5::smallint\)/i);
 for(const [label,start,end] of shared){
  assert.match(migration,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
  assert.match(migration,new RegExp(start.replace(":","\\:")));
  assert.match(migration,new RegExp(end.replace(":","\\:")));
 }
});

test("shared blocks cannot be displaced by overlapping class rows",()=>{
 assert.match(migration,/b\.starts_at < s\.ends_at/);
 assert.match(migration,/b\.ends_at > s\.starts_at/);
 assert.match(migration,/owner_homeroom_daily_schedule/);
});

test("weekly scheduler keeps Period naming for academic rows",()=>{
 assert.match(scheduler,/label:`Period \$\{byTime\.size\+1\}`/);
 assert.match(scheduler,/label:`Period \$\{current\.length\+1\}`/);
 assert.doesNotMatch(scheduler,/label:`Schedule \$\{/);
});
