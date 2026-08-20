import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const layout=fs.readFileSync("app/layout.tsx","utf8");
const retro=fs.readFileSync("app/retro-ui.css","utf8");

test("Original Simplified portal mode controls are fully removed",()=>{
 assert.equal(fs.existsSync("app/components/PortalViewModeToggle.tsx"),false);
 assert.equal(fs.existsSync("app/portal-view-modes.css"),false);
 assert.doesNotMatch(layout,/PortalViewModeToggle|portal-view-modes\.css/);
});

test("portal presentation uses one permanent retro typography treatment",()=>{
 assert.match(layout,/retro-ui\.css/);
 assert.match(retro,/Verdana,Tahoma,Arial,sans-serif/);
 assert.match(retro,/Trebuchet MS/);
 assert.match(retro,/Courier New/);
 assert.doesNotMatch(retro,/data-portal-mode="simplified"/);
});
