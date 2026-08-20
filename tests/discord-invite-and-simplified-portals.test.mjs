import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const apply=fs.readFileSync("app/apply/page.tsx","utf8");
const layout=fs.readFileSync("app/layout.tsx","utf8");
const retro=fs.readFileSync("app/retro-ui.css","utf8");

test("website applications hand off to the configured Hanami Discord",()=>{
 assert.match(apply,/discord\.gg\/n5GFYst5Uv/);
 assert.match(apply,/GuestEnrollmentForm discordInvite=\{DISCORD_INVITE\}/);
 assert.match(apply,/EST\. 1836/);
});

test("portal display mode switchers are removed site-wide",()=>{
 assert.doesNotMatch(layout,/PortalViewModeToggle/);
 assert.doesNotMatch(layout,/portal-view-modes\.css/);
 assert.equal(fs.existsSync("app/components/PortalViewModeToggle.tsx"),false);
 assert.equal(fs.existsSync("app/portal-view-modes.css"),false);
});

test("permanent early-2000s typography replaces Simplified and 2006 mode switches",()=>{
 assert.match(retro,/Verdana,Tahoma,Arial,sans-serif/);
 assert.match(retro,/Trebuchet MS/);
 assert.match(retro,/Courier New/);
 assert.match(retro,/logoButton/);
 assert.match(retro,/background:#fff/);
});
