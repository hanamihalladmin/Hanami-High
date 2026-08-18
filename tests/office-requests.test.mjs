import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const member=await readFile(new URL("../app/portal/OfficeRequestPanel.tsx",import.meta.url),"utf8");
const admin=await readFile(new URL("../app/portal/admin/AdminOfficeRequestManager.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const adminPortal=await readFile(new URL("../app/portal/admin/AdminPortalClient.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818165932_school_office_requests_foundation.sql",import.meta.url),"utf8");
const grants=await readFile(new URL("../supabase/migrations/20260818181600_tighten_school_office_request_grants.sql",import.meta.url),"utf8");

test("School Office requests are character-owned and website-native",()=>{
  assert.match(member,/SCHOOL OFFICE/);
  assert.match(member,/No external email is used/);
  assert.match(member,/character_id:characterId/);
  assert.match(member,/school_office_requests/);
  assert.doesNotMatch(member,/mailto:/i);
  assert.match(migration,/members read own office requests/);
  assert.match(migration,/members create own office requests/);
  assert.match(migration,/owner_user_id=\(select auth\.uid\(\)\)/);
});

test("members can only follow up when the Office requests more information",()=>{
  assert.match(member,/waiting_on_member/);
  assert.match(member,/Send follow-up/);
  assert.match(migration,/members update waiting office requests/);
  assert.match(migration,/status='waiting_on_member'/);
  assert.match(migration,/staff_note=''/);
  assert.match(migration,/assigned_to is null/);
});

test("Office request types and lifecycle are complete",()=>{
  for(const value of ["schedule_change","records","club_paperwork","technical_help","general"])assert.match(migration,new RegExp(value));
  for(const value of ["submitted","in_review","waiting_on_member","resolved","closed"])assert.match(migration,new RegExp(value));
  assert.match(admin,/In review/);
  assert.match(admin,/Need member reply/);
  assert.match(admin,/Resolve/);
  assert.match(admin,/Close/);
});

test("Office staff queue stays permission scoped",()=>{
  assert.match(migration,/private\.office_request_queue_internal/);
  assert.match(migration,/site_admin/);
  assert.match(migration,/content_editor/);
  assert.match(migration,/security invoker/);
  assert.match(admin,/rpc\/office_request_queue/);
  assert.match(adminPortal,/canEditContent/);
  assert.match(adminPortal,/AdminOfficeRequestManager/);
});

test("anonymous users have no direct School Office table grants",()=>{
  assert.match(grants,/revoke all on table public\.school_office_requests from anon/);
  assert.match(grants,/grant select, insert, update/);
  assert.match(grants,/revoke delete/);
});

test("both Student and Faculty dashboards expose the shared Office desk",()=>{
  assert.match(dashboard,/OfficeRequestPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.match(dashboard,/School Office Requests/);
  assert.match(dashboard,/School Office/);
});
