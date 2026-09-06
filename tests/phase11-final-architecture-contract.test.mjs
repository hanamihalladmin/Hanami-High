import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const blueprint=await readFile(new URL("../docs/REBUILD_BLUEPRINT.md",import.meta.url),"utf8");
const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const contextBar=await readFile(new URL("../app/portal/PortalContextBar.tsx",import.meta.url),"utf8");
const bulletin=await readFile(new URL("../app/portal/StudentBulletinSocialFeed.tsx",import.meta.url),"utf8");
const bulletinMigration=await readFile(new URL("../supabase/migrations/20260906084533_phase11_student_bulletin_social_interactions.sql",import.meta.url),"utf8");
const adminWorkspace=await readFile(new URL("../app/portal/admin/AdminWorkspace.tsx",import.meta.url),"utf8");
const tokens=await readFile(new URL("../app/styles/rebuild/tokens.css",import.meta.url),"utf8");
const portalShell=await readFile(new URL("../app/styles/rebuild/portal-shell-phase3.css",import.meta.url),"utf8");
const studentFinal=await readFile(new URL("../app/styles/rebuild/student-final-reference-phase11.css",import.meta.url),"utf8");
const profileCss=await readFile(new URL("../app/styles/rebuild/profile-community-phase6.css",import.meta.url),"utf8");
const rewardsCss=await readFile(new URL("../app/styles/rebuild/rewards-phase7.css",import.meta.url),"utf8");
const ownerCss=await readFile(new URL("../app/styles/rebuild/owner-phase10.css",import.meta.url),"utf8");
const finalGeometry=await readFile(new URL("../app/final-portal-geometry.css",import.meta.url),"utf8");
const cozyGeometry=await readFile(new URL("../app/cozy-hanami-geometry-lock.css",import.meta.url),"utf8");
const breathingRoom=await readFile(new URL("../app/portal-breathing-room.css",import.meta.url),"utf8");
const siteThemes=await readFile(new URL("../app/site-themes.css",import.meta.url),"utf8");
const tokyoSlate=await readFile(new URL("../app/tokyo-slate-theme.css",import.meta.url),"utf8");
const portalCustomization=await readFile(new URL("../app/portal-customization-runtime.css",import.meta.url),"utf8");

const approvedShells=["PublicShell","PortalShell","OperationsShell","SocialShell","FocusShell"];

test("rebuild keeps exactly the five approved shell geometries",()=>{
  for(const shell of approvedShells)assert.match(blueprint,new RegExp(shell));
  assert.match(blueprint,/No feature should introduce a sixth geometry system/i);
});

test("canonical rebuild tokens are the single global token source",()=>{
  assert.match(layout,/\.\/styles\/rebuild\/tokens\.css/);
  assert.doesNotMatch(layout,/\.\/rebuild-tokens\.css/);
  for(const alias of ["--hh-rose:","--hh-line:","--hh-sidebar:","--hh-font-ui:"])assert.match(tokens,new RegExp(alias));
  assert.match(tokens,/--hh-ivory:\s*#fffaf2/i);
  assert.match(tokens,/--hh-cream:\s*#f3efe4/i);
});

test("theme layers cannot redefine canonical structural tokens",()=>{
  const structuralDefinition=/--hh-(?:nav-width|context-width|content-max|page-gutter|section-gap|card-gap|card-padding|topbar-height|page-header-min-height|breakpoint-[a-z-]+)\s*:/i;
  for(const theme of [siteThemes,tokyoSlate,portalCustomization,rewardsCss,studentFinal])assert.doesNotMatch(theme,structuralDefinition);
});

test("final Student reference layer stays scoped to the Student portal",()=>{
  assert.match(layout,/student-final-reference-phase11\.css/);
  assert.match(studentFinal,/Student global navigation/);
  assert.doesNotMatch(studentFinal,/Faculty global navigation|Administration global navigation|Owner global navigation/);
  assert.doesNotMatch(studentFinal,/--hh-(?:nav-width|page-gutter|breakpoint-[a-z-]+)\s*:/i);
});

test("portal customization remains presentation-only and does not own structural geometry",()=>{
  for(const forbidden of ["rail width","column count","page margins","structural breakpoints","raw CSS"])assert.match(blueprint,new RegExp(forbidden,"i"));
  assert.doesNotMatch(rewardsCss,/grid-template-columns:\s*repeat\(\d+,/i,"Phase 7 cosmetic runtime must not prescribe shell column geometry");
  assert.doesNotMatch(rewardsCss,/data-portal-view=.?account/i,"Removed Account-shell workaround must not return to the cosmetic layer");
  assert.match(rewardsCss,/pointer-events:\s*none/i);
});

test("retired Account wrapper selectors stay out of rebuild and containment layers",()=>{
  for(const css of [portalShell,profileCss,rewardsCss,finalGeometry,cozyGeometry,breathingRoom]){
    assert.doesNotMatch(css,/accountContent|accountLayout|accountNav|data-portal-view=.?account/i);
  }
});

test("legacy containment and spacing layers no longer own PortalShell rail geometry",()=>{
  for(const css of [finalGeometry,cozyGeometry,breathingRoom]){
    assert.doesNotMatch(css,/--(?:cozy|final-portal)-rail\s*:/i);
    assert.doesNotMatch(css,/grid-template-columns:\s*var\(--(?:cozy|final-portal)-rail\)/i);
    assert.doesNotMatch(css,/grid-column:\s*[12]\s*!important/i);
  }
  assert.match(portalShell,/--hh-portal-rail/);
  assert.match(portalShell,/grid-template-columns:var\(--hh-portal-rail\)/);
});

test("Student and Faculty account context resolves characters through the authenticated owner",()=>{
  assert.match(contextBar,/\/auth\/v1\/user/);
  assert.match(contextBar,/owner_user_id=eq\./);
  assert.match(contextBar,/is_active=eq\.true/);
  assert.match(contextBar,/role=eq\.\$\{role\}/);
});

test("Student bulletin social feed is scoped to Community Boards and school-wide posts",()=>{
  assert.match(contextBar,/role===\"student\"&&view===\"community\"&&subView===\"boards\"/);
  assert.match(contextBar,/StudentBulletinSocialFeed/);
  assert.match(bulletin,/visibility=eq\.school/);
  assert.match(bulletin,/See who liked this/);
  assert.match(bulletin,/Post comment/);
  assert.doesNotMatch(bulletin,/Faculty|Administration|Owner global navigation/);
});

test("bulletin likes and comments use character-owned RLS tables",()=>{
  assert.match(bulletinMigration,/student_request_board_likes/);
  assert.match(bulletinMigration,/primary key \(post_id, character_id\)/i);
  assert.match(bulletinMigration,/student_request_board_comments/);
  assert.match(bulletinMigration,/between 1 and 800/i);
  assert.match(bulletinMigration,/current_user_owns_character\(character_id\)/);
  assert.match(bulletinMigration,/school_staff_can_manage\(\)/);
  assert.match(bulletinMigration,/revoke all .* from anon/is);
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
