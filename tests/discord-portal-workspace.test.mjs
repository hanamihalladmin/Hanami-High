import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const shell=await readFile(new URL("../app/portal/PortalWorkspaceShell.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../app/portal/PortalWorkspaceShell.module.css",import.meta.url),"utf8");
const live=await readFile(new URL("../app/portal/DashboardShell.module.css",import.meta.url),"utf8");
const context=await readFile(new URL("../app/portal/PortalContextBar.module.css",import.meta.url),"utf8");

test("Discord-style Hanami workspace keeps four portal regions",()=>{
  for(const token of ["serverRail","channelRail","workspace","infoRail","userCard"])assert.match(shell,new RegExp(token));
  assert.match(css,/grid-template-columns:72px 238px minmax\(0,1fr\) 248px/);
  assert.match(css,/\.workspace\{display:grid;grid-template-rows:48px minmax\(0,1fr\)/);
});

test("live Student and Faculty portal uses school rail plus channel rail",()=>{
  assert.match(live,/grid-template-columns:72px minmax\(0,1fr\)/);
  assert.match(live,/\.main\{[^}]*padding-left:238px/);
  assert.match(live,/\.globalNav\{[^}]*background:#17283c/);
  assert.match(context,/left:72px;width:238px/);
  assert.match(context,/\.tabs button:before\{content:"#"/);
});

test("mobile workspace preserves school rail and channel navigation",()=>{
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/grid-template-columns:58px minmax\(0,1fr\)/);
  assert.match(css,/\.channelRail\{position:fixed/);
  assert.match(live,/@media\(max-width:820px\)/);
  assert.match(context,/top:auto;bottom:0;left:58px/);
});
