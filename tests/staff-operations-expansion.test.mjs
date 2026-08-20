import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const owner=await readFile(new URL("../app/portal/owner/OwnerPortalClient.tsx",import.meta.url),"utf8");
const health=await readFile(new URL("../app/portal/owner/OwnerSystemHealthAnalyticsPanel.tsx",import.meta.url),"utf8");
const admin=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const narrative=await readFile(new URL("../app/portal/admin/AdminNarrativeModerationPanel.tsx",import.meta.url),"utf8");
const lounge=await readFile(new URL("../app/portal/FacultyLoungePanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const accessibility=await readFile(new URL("../app/portal/NotificationAccessibilityPanel.tsx",import.meta.url),"utf8");
const reporter=await readFile(new URL("../app/components/RuntimeBugReporter.tsx",import.meta.url),"utf8");

test("Owner receives system health and aggregate staff analytics",()=>{
 assert.match(owner,/OwnerSystemHealthAnalyticsPanel/);
 assert.match(health,/staff_analytics_summary/);
 assert.match(health,/client_health_events/);
 assert.match(health,/DEPLOYMENT VERSION/);
 assert.match(reporter,/upload_failure/);
 assert.match(reporter,/request_failure/);
});

test("Admin workspace includes storyline incident and evidence operations",()=>{
 assert.match(admin,/AdminNarrativeModerationPanel/);
 assert.match(admin,/AdminStaffAnalyticsPanel/);
 assert.match(narrative,/storyline_arcs/);
 assert.match(narrative,/moderation_incident_timeline/);
 assert.match(narrative,/moderation-evidence/);
});

test("Faculty dashboard includes a private lounge workflow",()=>{
 assert.match(dashboard,/FacultyLoungePanel/);
 assert.match(lounge,/faculty_lounge_posts/);
 assert.match(lounge,/faculty_schedule_swap_requests/);
 assert.match(lounge,/faculty_lesson_plans/);
 assert.match(lounge,/faculty_substitute_requests/);
});

test("dark mode controls are absent from Hanami accessibility settings",()=>{
 assert.doesNotMatch(accessibility,/dark_mode/);
 assert.doesNotMatch(accessibility,/Dark display mode/);
});
