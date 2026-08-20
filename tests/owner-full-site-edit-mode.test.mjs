import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const access=fs.readFileSync("app/components/OwnerWebsiteAccess.tsx","utf8");
const editor=fs.readFileSync("app/components/PublicPageTextEditor.tsx","utf8");
const layout=fs.readFileSync("app/layout.tsx","utf8");
const ownerPortal=fs.readFileSync("app/portal/owner/OwnerPortalClient.tsx","utf8");
const migration=fs.readFileSync("supabase/migrations/20260821113000_owner_full_website_edit_login.sql","utf8");

test("Owner website editing launches only from the Owner portal",()=>{
 assert.match(access,/Edit Website/);
 assert.match(access,/OWNER WEBSITE EDITOR/);
 assert.match(access,/owner_web_edit_login/);
 assert.match(access,/hanami\.owner\.web-edit\.v1/);
 assert.match(access,/Open Website Editor/);
 assert.match(access,/@hanamihigh\.edu/);
 assert.match(ownerPortal,/OwnerWebsiteAccess/);
 assert.doesNotMatch(layout,/OwnerWebsiteAccess/);
});

test("public page editor accepts only the short-lived Owner website session",()=>{
 assert.match(editor,/owner_web_edit_session_valid/);
 assert.match(editor,/owner_web_save_public_page_text/);
 assert.match(editor,/OWNER PAGE EDITOR/);
 assert.match(editor,/normal website in Owner Edit Mode/);
 assert.match(editor,/Exit edit mode/);
 assert.match(editor,/scanItems\(\)/);
 assert.match(editor,/editable text block/);
 assert.match(editor,/roleDeskPath/);
 assert.doesNotMatch(editor,/current_owner_status/);
});

test("Owner website tokens are hashed, expiring, and isolated from portal impersonation",()=>{
 assert.match(migration,/private\.owner_web_edit_sessions/);
 assert.match(migration,/extensions\.gen_random_bytes\(32\)/);
 assert.match(migration,/extensions\.digest\(raw_token,'sha256'\)/);
 assert.match(migration,/interval '8 hours'/);
 assert.match(migration,/next_failed>=5/);
 assert.match(migration,/interval '15 minutes'/);
 assert.doesNotMatch(access,/characters\?/);
 assert.doesNotMatch(access,/is_active=eq\.true/);
});
