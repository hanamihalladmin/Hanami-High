import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path){return fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8")}
const publicShell=read("app/components/PublicSchoolShell.tsx");
const feeds=read("app/feeds/page.tsx");
const status=read("app/status/page.tsx");
const gate=read("app/components/AdminOwnerOnly.tsx");
const clubs=read("app/club-sites/page.tsx");
const upcoming=read("app/components/live-upcoming-events.tsx");
const nextEvent=read("app/components/live-next-event.tsx");
const layout=read("app/layout.tsx");

test("public navigation hides internal feeds and status while Activities has a real destination",()=>{
 assert.doesNotMatch(publicShell,/href="\/feeds\//);
 assert.doesNotMatch(publicShell,/href="\/status\//);
 assert.match(publicShell,/{id:"activities",label:"Activities",href:"\/campus-life\/"}/);
});

test("RSS and Network Status require site administration or Owner access",()=>{
 assert.match(feeds,/<AdminOwnerOnly label="RSS-style school feeds">/);
 assert.match(status,/<AdminOwnerOnly label="Network Status">/);
 assert.match(gate,/allowed=Boolean\(a\?\.site_admin\)/);
 assert.doesNotMatch(gate,/a\.content_editor\|\|a\.moderator/);
 assert.match(gate,/current_owner_status/);
});

test("public club browsing exposes no officer tools",()=>{
 assert.doesNotMatch(clubs,/OFFICER TOOLS/i);
 assert.doesNotMatch(clubs,/authorized club officers/i);
 assert.match(clubs,/Administrative editing is kept inside private Administration and Owner workspaces/);
});

test("upcoming event widgets compare against Hanami's roleplay clock",()=>{
 for(const source of [upcoming,nextEvent]){
  assert.match(source,/import \{hanamiRoleplayNow\} from "\.\/roleplay-date"/);
  assert.match(source,/hanamiRoleplayNow\(\)\.toISOString\(\)/);
  assert.match(source,/timeZone:"Asia\/Tokyo"/);
 }
});

test("private redesign preserves the Owner maintenance gate",()=>{
 assert.match(layout,/import MaintenanceGate from "\.\/components\/MaintenanceGate"/);
 assert.match(layout,/<MaintenanceGate>/);
 assert.match(layout,/<\/MaintenanceGate>/);
});
