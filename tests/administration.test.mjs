import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const adminClient=await readFile(new URL("../app/portal/admin/AdminPortalClient.tsx",import.meta.url),"utf8");
const manager=await readFile(new URL("../app/portal/admin/AdminAnnouncementManager.tsx",import.meta.url),"utf8");
const adminPage=await readFile(new URL("../app/portal/admin/page.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818163000_administration_and_live_announcements_foundation.sql",import.meta.url),"utf8");

test("Administration is account permission based rather than character role based",()=>{
  assert.match(adminClient,/current_account_admin_access/);
  assert.match(adminClient,/Faculty characters do not grant admin access/);
  assert.doesNotMatch(adminClient,/character\.role/);
  assert.match(migration,/account_permissions/);
  assert.match(migration,/site_admin/);
  assert.match(migration,/content_editor/);
  assert.match(migration,/moderator/);
});

test("ordinary authenticated users cannot self grant Administration permissions",()=>{
  assert.match(migration,/revoke all on public\.account_permissions from anon, authenticated/);
  assert.doesNotMatch(migration,/create policy .*account_permissions.*insert/is);
  assert.match(migration,/private\.account_has_permission/);
});

test("announcement management is protected by permission-aware RLS",()=>{
  assert.match(migration,/public reads published announcements/);
  assert.match(migration,/content editors create announcements/);
  assert.match(migration,/content editors update announcements/);
  assert.match(migration,/site admins delete announcements/);
  assert.match(manager,/status:"draft"/);
  assert.match(manager,/Publish/);
  assert.match(manager,/Archive/);
  assert.match(manager,/Delete permanently/);
});

test("Administration has its own website section",()=>{
  assert.match(adminPage,/ADMINISTRATION NETWORK/);
  assert.match(adminPage,/AdminPortalClient/);
  assert.match(adminPage,/Character roles cannot unlock admin tools/);
});
