import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const blueprint=await readFile(new URL("../docs/REBUILD_BLUEPRINT.md",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const contextBar=await readFile(new URL("../app/portal/PortalContextBar.tsx",import.meta.url),"utf8");
const adminWorkspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const rewardsCss=await readFile(new URL("../app/styles/rebuild/rewards-phase7.css",import.meta.url),"utf8");
const ownerCss=await readFile(new URL("../app/styles/rebuild/owner-phase10.css",import.meta.url),"utf8");

const approvedShells=["PublicShell","PortalShell","OperationsShell","SocialShell","FocusShell"];

test("rebuild keeps exactly the five approved shell geometries",()=>{
  for(const shell of approvedShells)assert.match(blueprint,new RegExp(shell));
  assert.match(blueprint,/No feature should introduce a sixth geometry system/i);
});

test("portal customization remains presentation-only and does not own structural geometry",()=>{
  for(const forbidden of ["rail width","column count","page margins","structural breakpoints","raw CSS"])assert.match(blueprint,new RegExp(forbidden,"i"));
  assert.doesNotMatch(rewardsCss,/grid-template-columns:\s*repeat\(\d+,/i,"Phase 7 cosmetic runtime must not prescribe shell column geometry");
  assert.doesNotMatch(rewardsCss,/data-portal-view=.?account/i,"Removed Account-shell workaround must not return to the cosmetic layer");
  assert.match(rewardsCss,/pointer-events:\s*none/i);
});

test("Student and Faculty account context resolves characters through the authenticated owner",()=>{
  assert.match(contextBar,/\/auth\/v1\/user/);
  assert.match(contextBar,/owner_user_id=eq\./);
  assert.match(contextBar,/is_active=eq\.true/);
  assert.match(contextBar,/role=eq\.\$\{role\}/);
});

test("Admin and Owner retain separate canonical OperationsShell maps",()=>{
  assert.match(adminWorkspace,/ownerMode\?ownerNav:adminNav/);
  for(const label of ["Command Center","Users","Characters","Portals","School Data","Website","Moderation","Economy","Integrations","System","Settings"])assert.match(adminWorkspace,new RegExp(`\\"${label}\\"`));
  for(const label of ["Dashboard","People","Academics","Communications","Campus","Events","Reports"])assert.match(adminWorkspace,new RegExp(`\\"${label}\\"`));
  assert.match(ownerCss,/Owner global navigation/);
});

test("portal shell retains the canonical Student and Faculty primary destinations",()=>{
  for(const label of ["Account","Dashboard","Schedule","Courses","Calendar","Inbox","School","Community"])assert.match(dashboard,new RegExp(`\\"${label}\\"`));
});
