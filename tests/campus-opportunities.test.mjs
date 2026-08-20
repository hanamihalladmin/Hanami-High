import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const student=await readFile(new URL("../app/portal/StudentOpportunityPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const admin=await readFile(new URL("../app/portal/admin/AdminOpportunityManager.tsx",import.meta.url),"utf8");
const adminClient=await readFile(new URL("../app/portal/admin/AdminPortalClient.tsx",import.meta.url),"utf8");
const adminWorkspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818190031_campus_opportunities_foundation.sql",import.meta.url),"utf8");
const queueMigration=await readFile(new URL("../supabase/migrations/20260818190216_campus_opportunity_application_queue.sql",import.meta.url),"utf8");

test("Campus Opportunities are published content with character-owned Student applications",()=>{
  assert.match(migration,/public reads published campus opportunities/);
  assert.match(migration,/students submit own campus applications/);
  assert.match(migration,/c\.role='student'/);
  assert.match(migration,/unique\(opportunity_id, character_id\)/);
  assert.match(migration,/students withdraw pending campus applications/);
});

test("Student portal exposes the website-native Campus Opportunities application desk",()=>{
  assert.match(student,/campus_opportunities/);
  assert.match(student,/campus_opportunity_applications/);
  assert.match(student,/Apply inside Hanami/);
  assert.match(student,/Withdraw application/);
  assert.match(student,/timeZone:"Asia\/Tokyo"/);
  assert.match(dashboard,/StudentOpportunityPanel/);
  assert.match(dashboard,/Campus Opportunities/);
});

test("Administration manages opportunities and reviews applications",()=>{
  assert.match(admin,/Save draft/);
  assert.match(admin,/Publish opportunity/);
  assert.match(admin,/initialStatus==="published"/);
  assert.match(admin,/Close/);
  assert.match(admin,/administration_campus_application_queue/);
  assert.match(admin,/Under review/);
  assert.match(admin,/Accept/);
  assert.match(admin,/Decline/);
  assert.match(adminClient,/AdminWorkspace/);
  assert.match(adminWorkspace,/AdminOpportunityManager/);
});

test("Applicant identity is exposed only through a permission-gated queue",()=>{
  assert.match(queueMigration,/private\.administration_campus_application_queue_internal/);
  assert.match(queueMigration,/content editor permission required/);
  assert.match(queueMigration,/security invoker/);
  assert.match(queueMigration,/join public\.characters c on c\.id=a\.character_id/);
});

test("ordinary Faculty role does not get school-wide opportunity review access",()=>{
  assert.match(migration,/private\.account_has_permission\(\(select auth\.uid\(\)\), 'content_editor'\)/);
  assert.doesNotMatch(migration,/c\.role='faculty'.*review/s);
});
