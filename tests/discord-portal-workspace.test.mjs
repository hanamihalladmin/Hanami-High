import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const shell=await readFile(new URL("../app/portal/PortalWorkspaceShell.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../app/portal/PortalWorkspaceShell.module.css",import.meta.url),"utf8");

test("Discord-style Hanami workspace keeps four portal regions",()=>{
  for(const token of ["serverRail","channelRail","workspace","infoRail","userCard"])assert.match(shell,new RegExp(token));
  assert.match(css,/grid-template-columns:72px 238px minmax\(0,1fr\) 248px/);
  assert.match(css,/\.workspace\{display:grid;grid-template-rows:48px minmax\(0,1fr\)/);
});

test("mobile workspace preserves school rail and channel navigation",()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/grid-template-columns:58px minmax\(0,1fr\)/);
  assert.match(css,/\.channelRail\{position:fixed/);
});
