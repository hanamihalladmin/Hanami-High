import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const inbox=await readFile(new URL("../app/portal/InboxPanel.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../app/portal/InboxPanel.module.css",import.meta.url),"utf8");

test("Hanami Inbox keeps the Discord-style three-region conversation structure",()=>{
  for(const token of ["styles.threads","styles.conversation","styles.memberRail"])assert.match(inbox,new RegExp(token.replace(".","\\.")));
  assert.match(inbox,/conversation_participant_directory/);
  assert.match(inbox,/Messages, read state, files, and group membership stay inside Hanami High/);
  assert.match(css,/\.workspace\{display:grid/);
  assert.match(css,/\.memberRail\{/);
  assert.match(css,/grid-template-columns:220px minmax\(0,1fr\) 220px/);
});

test("Inbox remains responsive without exposing external email",()=>{
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.doesNotMatch(inbox,/mailto:/i);
  assert.match(inbox,/No external email is used/);
});
