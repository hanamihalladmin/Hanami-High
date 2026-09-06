import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const shell=fs.readFileSync(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const shellCss=fs.readFileSync(new URL("../app/portal/DashboardShell.module.css",import.meta.url),"utf8");
const rail=fs.readFileSync(new URL("../app/portal/DiscordPortalContextRail.tsx",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../app/portal/DiscordPortalContextRail.module.css",import.meta.url),"utf8");

test("Student and Faculty portal shell includes the shared context rail",()=>{
 assert.match(shell,/import DiscordPortalContextRail from "\.\/DiscordPortalContextRail"/);
 assert.match(shell,/<DiscordPortalContextRail/);
 assert.match(shell,/role=\{character\.role\}/);
 assert.match(shell,/onNavigate=\{changeView\}/);
});

test("Inbox does not duplicate the outer context rail",()=>{
 assert.match(shell,/view!=="messages"\?styles\.withContextRail:""/);
 assert.match(rail,/if\(view==="messages"\)return null/);
});

test("context rail uses active character state and responsive collapse",()=>{
 assert.match(rail,/displayName/);
 assert.match(rail,/handle/);
 assert.match(rail,/avatarUrl/);
 assert.match(rail,/This rail reflects the active portal character/);
 assert.match(css,/@media\(max-width:1180px\)\{\.rail\{display:none\}\}/);
 assert.doesNotMatch(rail,/mailto:/i);
});

test("redesigned shell does not reserve the removed secondary-nav gutter",()=>{
 assert.match(shellCss,/\.main\{[^}]*padding-left:0/);
 assert.doesNotMatch(shellCss,/padding-left:238px/);
 assert.doesNotMatch(shellCss,/padding-left:218px/);
});

test("desktop context rail begins below the redesigned 82px portal header",()=>{
 assert.match(css,/\.rail\{[^}]*top:82px/);
});
