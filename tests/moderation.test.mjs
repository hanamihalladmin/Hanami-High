import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const reportPanel=await readFile(new URL("../app/portal/ProfileReportPanel.tsx",import.meta.url),"utf8");
const lookup=await readFile(new URL("../app/portal/ProfileLookupPanel.tsx",import.meta.url),"utf8");
const moderation=await readFile(new URL("../app/portal/admin/AdminModerationManager.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818164500_character_reporting_and_moderation_foundation.sql",import.meta.url),"utf8");

test("visible profiles expose a character-scoped report action",()=>{
  assert.match(lookup,/ProfileReportPanel/);
  assert.match(reportPanel,/reporter_character_id:viewerCharacterId/);
  assert.match(reportPanel,/target_character_id:targetCharacterId/);
  assert.match(reportPanel,/viewerCharacterId===targetCharacterId/);
  assert.match(reportPanel,/Report profile/);
});

test("report creation is owner scoped and cannot be self reported",()=>{
  assert.match(migration,/characters create own reports/);
  assert.match(migration,/reporter\.owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration,/reporter_character_id <> target_character_id/);
  assert.match(migration,/status = 'open'/);
  assert.match(migration,/revoke delete on public\.character_reports from authenticated/);
});

test("moderation queue is permission gated",()=>{
  assert.match(migration,/moderator permission required/);
  assert.match(migration,/private\.account_has_permission\(auth\.uid\(\), 'moderator'\)/);
  assert.match(moderation,/moderation_report_queue/);
  assert.match(moderation,/reviewed_by:userId/);
  assert.match(moderation,/Resolve/);
  assert.match(moderation,/Dismiss/);
});
