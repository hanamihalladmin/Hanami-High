import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const workspace=await readFile(new URL("../app/portal/ProfileDesignWorkspace.tsx",import.meta.url),"utf8");
const studioTools=await readFile(new URL("../app/portal/ProfileStudioRoadmapTools.tsx",import.meta.url),"utf8");
const tour=await readFile(new URL("../app/portal/GuidedFirstLoginTour.tsx",import.meta.url),"utf8");
const rolePortal=await readFile(new URL("../app/portal/RolePortalClient.tsx",import.meta.url),"utf8");
const themeRuntime=await readFile(new URL("../app/components/SiteThemeRuntime.tsx",import.meta.url),"utf8");
const themeCss=await readFile(new URL("../app/site-themes.css",import.meta.url),"utf8");
const retroCss=await readFile(new URL("../app/retro-ui.css",import.meta.url),"utf8");
const changelog=await readFile(new URL("../app/changelog/page.tsx",import.meta.url),"utf8");
const globalNotice=await readFile(new URL("../app/components/GlobalRulesNotice.tsx",import.meta.url),"utf8");
const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");
const themeMigration=await readFile(new URL("../supabase/migrations/20260819225500_public_current_school_theme_rpc.sql",import.meta.url),"utf8");

test("Profile Studio roadmap tools are wired into the live workspace",()=>{
 assert.match(workspace,/ProfileStudioRoadmapTools/);
 assert.match(studioTools,/Sticker Creator/);
 assert.match(studioTools,/imageToStickerPng/);
 assert.match(studioTools,/profile-media/);
 assert.match(studioTools,/widget_type:"sticker"/);
 for(const pack of ["Sakura","Summer Matsuri","Halloween","Winter","Graduation","Culture Festival","Sports Day"])assert.match(studioTools,new RegExp(pack));
});

test("Student and Faculty portals include replayable first-login tours",()=>{
 assert.match(rolePortal,/GuidedFirstLoginTour/);
 assert.match(rolePortal,/characterId=\{character\.id\} role=\{role\}/);
 assert.match(tour,/studentSteps/);
 assert.match(tour,/facultySteps/);
 assert.match(tour,/Replay .* tour/);
 assert.match(tour,/hanami\.first-login-tour/);
});

test("scheduled seasonal themes and permanent 2006-era typography are active without dark mode",()=>{
 assert.match(layout,/SiteThemeRuntime/);
 assert.match(layout,/site-themes\.css/);
 assert.match(layout,/retro-ui\.css/);
 assert.match(themeRuntime,/current_school_theme/);
 assert.doesNotMatch(themeRuntime,/Use 2006 web mode/);
 assert.doesNotMatch(themeCss,/data-hanami-web-mode="2006"/);
 assert.match(retroCss,/Verdana,Tahoma,Arial,sans-serif/);
 assert.match(retroCss,/Trebuchet MS/);
 assert.match(retroCss,/Courier New/);
 assert.match(themeCss,/data-hanami-school-theme="sakura"/);
 assert.doesNotMatch(themeCss,/dark mode|hanamiTheme="dark"|data-hanami-theme="dark"/i);
 assert.match(themeMigration,/Asia\/Tokyo/);
 assert.match(themeMigration,/grant execute .* anon,authenticated/);
});

test("public version and changelog are discoverable site-wide",()=>{
 assert.match(changelog,/Website changelog/);
 assert.match(changelog,/changelog_entries/);
 assert.match(changelog,/v0\.1\.0/);
 assert.match(globalNotice,/\/changelog\//);
 assert.match(globalNotice,/v0\.1\.0/);
});
