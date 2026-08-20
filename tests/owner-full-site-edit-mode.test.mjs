import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const access=fs.readFileSync("app/components/OwnerWebsiteAccess.tsx","utf8");
const editor=fs.readFileSync("app/components/PublicPageTextEditor.tsx","utf8");
const layout=fs.readFileSync("app/layout.tsx","utf8");
const migration=fs.readFileSync("supabase/migrations/20260821113000_owner_full_website_edit_login.sql","utf8");

test("Owner can unlock full-site editing before normal portal sign-in",()=>{
 assert.match(access,/Owner Edit Login/);
 assert.match(access,/owner_web_edit_login/);
 assert.match(access,/hanami\.owner\.web-edit\.v1/);
 assert.match(access,/Enter Owner Edit Mode/);
 assert.match(layout,/OwnerWebsiteAccess/);
});

test("public page editor accepts the short-lived Owner website session",()=>{
 assert.match(editor,/owner_web_edit_session_valid/);
 assert.match(editor,/owner_web_save_public_page_text/);
 assert.match(editor,/OWNER PAGE EDITOR/);
 assert.match(editor,/normal website in Owner Edit Mode/);
});

test("Owner website tokens are hashed, expiring, and isolated from portal impersonation",()=>{
 assert.match(migration,/private\.owner_web_edit_sessions/);
 assert.match(migration,/extensions\.gen_random_bytes\(32\)/);
 assert.match(migration,/extensions\.digest\(raw_token,'sha256'\)/);
 assert.match(migration,/interval '8 hours'/);
 assert.match(migration,/failed_count>=5/);
 assert.match(migration,/interval '15 minutes'/);
 assert.doesNotMatch(access,/characters\?/);
 assert.doesNotMatch(access,/is_active=eq\.true/);
});
