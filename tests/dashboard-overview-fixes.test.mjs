import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
test("student dashboard shows today's JST schedule and enrolled classes",async()=>{const shell=await read("app/portal/DashboardShell.tsx");const overview=await read("app/portal/StudentDashboardOverview.tsx");assert.match(shell,/StudentDashboardOverview/);assert.match(overview,/Asia\/Tokyo/);assert.match(overview,/schedule/);assert.match(overview,/Enrolled classes/);assert.match(overview,/relationship=eq\.student/);});
test("wallpaper opacity is not covered by a permanent white veil",async()=>{const css=await read("app/portal/DashboardShellOverrides.css");assert.match(css,/main::after\{display:none!important\}/);assert.match(css,/--hanami-wallpaper-opacity/);});
test("account and inbox use transparent portal surfaces",async()=>{const shell=await read("app/portal/DashboardShell.tsx");const css=await read("app/portal/DashboardShellOverrides.css");assert.match(shell,/data-portal-view="account"/);assert.match(shell,/data-portal-view="messages"/);assert.match(css,/data-portal-view="account"/);assert.match(css,/data-portal-view="messages"/);});
