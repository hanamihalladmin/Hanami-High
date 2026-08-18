import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const authPanel=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818130000_portal_foundation.sql",import.meta.url),"utf8");

test("portal starts Discord OAuth and returns to the current portal path",()=>{
  assert.match(authPanel,/auth\/v1\/authorize/);
  assert.match(authPanel,/set\("provider","discord"\)/);
  assert.match(authPanel,/set\("redirect_to",redirectTo\)/);
});

test("portal restores and refreshes a browser session",()=>{
  assert.match(authPanel,/hanami\.portal\.session\.v1/);
  assert.match(authPanel,/access_token/);
  assert.match(authPanel,/refresh_token/);
  assert.match(authPanel,/grant_type=refresh_token/);
});

test("signed-in profile is loaded through bearer auth and RLS",()=>{
  assert.match(authPanel,/rest\/v1\/account_profiles\?select=display_name,discord_username/);
  assert.match(authPanel,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.match(migration,/members read own account profile/);
  assert.match(migration,/auth\.uid\(\).*user_id/s);
});

test("portal does not expose privileged keys or render an email field",()=>{
  assert.doesNotMatch(authPanel,/service_role/i);
  assert.doesNotMatch(authPanel,/secret[_-]?key/i);
  assert.doesNotMatch(authPanel,/select=[^\n"]*email/i);
  assert.match(authPanel,/never displays your Discord email address/);
});

test("sign out is explicitly scoped to this browser device",()=>{
  assert.match(authPanel,/Sign out on this device/);
  assert.match(authPanel,/localStorage\.removeItem\(SESSION_KEY\)/);
});
