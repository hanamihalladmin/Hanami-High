import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const bridge=await readFile(new URL("../app/components/PublicSessionBridge.tsx",import.meta.url),"utf8");
const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");
const portal=await readFile(new URL("../app/portal/PortalAuthPanel.tsx",import.meta.url),"utf8");

test("public community pages share the persistent Hanami browser session",()=>{
  assert.match(layout,/PublicSessionBridge/);
  assert.match(bridge,/hanami\.portal\.session\.v1/);
  assert.match(bridge,/hanami\.portal\.character\.v1/);
  assert.match(bridge,/localStorage\.getItem/);
  assert.match(portal,/localStorage\.setItem\(SESSION_KEY/);
});

test("public browsing refreshes the stored session instead of forcing another Discord login",()=>{
  assert.match(bridge,/grant_type=refresh_token/);
  assert.match(bridge,/refreshToken/);
  assert.match(bridge,/expiresAt-Date\.now\(\)<5\*60\*1000/);
  assert.match(bridge,/localStorage\.setItem\(SESSION_KEY/);
});

test("public portal button returns an active character to the correct dashboard",()=>{
  assert.match(bridge,/Return to \$\{row\.role==="faculty"\?"Faculty":"Student"\} Portal/);
  assert.match(bridge,/row\.role==="faculty"\?"\/portal\/faculty\/":"\/portal\/student\/"/);
  assert.match(bridge,/characters\?select=id,role,display_name,is_active/);
});

test("signed-in public pages no longer have to present themselves as logged out",()=>{
  assert.match(bridge,/My Hanami \/ Portal/);
  assert.match(bridge,/dataset\.sessionActive/);
  assert.match(bridge,/querySelectorAll<HTMLAnchorElement>\("a\.portal-button"\)/);
});
