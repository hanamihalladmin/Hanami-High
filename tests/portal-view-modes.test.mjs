import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const toggle=fs.readFileSync("app/components/PortalViewModeToggle.tsx","utf8");
const css=fs.readFileSync("app/portal-view-modes.css","utf8");
const layout=fs.readFileSync("app/layout.tsx","utf8");

test("all role portals expose Original and Simplified modes",()=>{
 for(const role of ["student","faculty","admin","owner"]) assert.match(toggle,new RegExp(role));
 assert.match(toggle,/Original/);
 assert.match(toggle,/Simplified/);
 assert.match(toggle,/hanami\.portal\.view-mode\.v1/);
 assert.match(toggle,/localStorage\.setItem/);
 assert.match(layout,/PortalViewModeToggle/);
});

test("simplified mode preserves functionality while simplifying presentation",()=>{
 assert.match(css,/data-portal-mode="simplified"/);
 assert.match(css,/box-shadow:none/);
 assert.match(css,/background-image:none/);
 assert.match(css,/font-family:Arial/);
 assert.doesNotMatch(css,/pointer-events:none/);
 assert.doesNotMatch(css,/display:none!important.*button/);
});
