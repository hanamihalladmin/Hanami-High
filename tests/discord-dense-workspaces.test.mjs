import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const shell=fs.readFileSync(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../app/portal/DashboardShellDenseWorkspaceFixes.css",import.meta.url),"utf8");

test("Discord portal loads dense workspace safeguards",()=>{
 assert.match(shell,/DashboardShellDenseWorkspaceFixes\.css/);
});

test("wide academic tables scroll inside the workspace instead of widening the portal",()=>{
 assert.match(css,/@media\(max-width:980px\)/);
 assert.match(css,/table\{display:block;max-width:100%;overflow-x:auto/);
 assert.match(css,/-webkit-overflow-scrolling:touch/);
});

test("Profile Studio and form controls remain contained",()=>{
 assert.match(css,/\[class\*="canvasFrame"\]/);
 assert.match(css,/input,[\s\S]*select,[\s\S]*textarea\{min-width:0;max-width:100%/);
 assert.match(css,/@media\(max-width:760px\)/);
});
