import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Owner portal renders the Bug Detector only inside Owner Control Center",async()=>{
 const owner=await read("app/portal/owner/OwnerPortalClient.tsx");
 const admin=await read("app/portal/admin/AdminPortalClient.tsx");
 assert.match(owner,/OwnerBugDetectorPanel/);
 assert.match(owner,/Bug Detector/);
 assert.doesNotMatch(admin,/OwnerBugDetectorPanel/);
 assert.doesNotMatch(admin,/owner_bug_detector_feed/);
});

test("runtime reporter can only submit bugs and cannot read Owner findings",async()=>{
 const reporter=await read("app/components/RuntimeBugReporter.tsx");
 assert.match(reporter,/report_client_bug/);
 assert.doesNotMatch(reporter,/owner_bug_detector_feed/);
 assert.doesNotMatch(reporter,/owner_update_bug_report/);
});

test("Owner detector UI uses Owner-only feed and lifecycle RPC",async()=>{
 const detector=await read("app/portal/owner/OwnerBugDetectorPanel.tsx");
 assert.match(detector,/owner_bug_detector_feed/);
 assert.match(detector,/owner_update_bug_report/);
 assert.match(detector,/owner_capture_bug_support_tickets/);
 assert.match(detector,/Detected/);
 assert.match(detector,/Investigating/);
 assert.match(detector,/Fixed/);
 assert.match(detector,/Ignore/);
 assert.match(detector,/actions\/runs\?per_page=1/);
});

test("Bug Detector migration enforces verified Owner reads and updates",async()=>{
 const migration=await read("supabase/migrations/20260819011901_owner_only_bug_detector_foundation.sql");
 assert.match(migration,/revoke all on public\.owner_bug_reports from anon,authenticated/i);
 assert.match(migration,/if not private\.is_owner_discord_user\(\) then raise exception 'Owner access required'/i);
 assert.match(migration,/owner_bug_detector_feed/);
 assert.match(migration,/owner_update_bug_report/);
 assert.match(migration,/report_client_bug/);
});
