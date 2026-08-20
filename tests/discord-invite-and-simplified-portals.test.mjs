import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const apply=fs.readFileSync("app/apply/page.tsx","utf8");
const toggle=fs.readFileSync("app/components/PortalViewModeToggle.tsx","utf8");
const layout=fs.readFileSync("app/layout.tsx","utf8");
const css=fs.readFileSync("app/portal-view-modes.css","utf8");

test("website applications hand off to the configured Hanami Discord",()=>{
 assert.match(apply,/discord\.gg\/n5GFYst5Uv/);
 assert.match(apply,/GuestEnrollmentForm discordInvite=\{DISCORD_INVITE\}/);
 assert.match(apply,/EST\. 1836/);
});

test("Student Faculty Admin and Owner all support Original and Simplified portal modes",()=>{
 for(const role of ["student","faculty","admin","owner"]) assert.match(toggle,new RegExp(role));
 assert.match(toggle,/Original/);
 assert.match(toggle,/Simplified/);
 assert.match(toggle,/localStorage\.setItem/);
 assert.match(toggle,/data.*portalMode|dataset\.portalMode/);
 assert.match(layout,/PortalViewModeToggle/);
});

test("Simplified mode remains functional while reducing dashboard chrome",()=>{
 assert.match(css,/data-portal-mode="simplified"/);
 assert.match(css,/quickbar/);
 assert.match(css,/dashboard/);
 assert.match(css,/details>summary/);
 assert.doesNotMatch(css,/display:none!important[^\n]*(form|button|input|select|textarea)/);
});
