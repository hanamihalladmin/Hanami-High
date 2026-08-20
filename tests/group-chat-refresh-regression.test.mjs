import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const inbox=await readFile(new URL("../app/portal/InboxPanel.tsx",import.meta.url),"utf8");

test("group chat creation does not create a selectedId-driven inbox refresh loop",()=>{
  assert.match(inbox,/event\.preventDefault\(\)/);
  assert.match(inbox,/selectedIdRef=useRef<string\|null>\(null\)/);
  assert.match(inbox,/const currentId=selectedIdRef\.current/);
  assert.match(inbox,/\[accessToken,characterId,loadMessages,loadUnread,selectConversationState\]\)/);
  assert.doesNotMatch(inbox,/\[accessToken,characterId,loadMessages,loadUnread,selectedId\]\)/);
});

test("group chat create action is single-flight and updates in place",()=>{
  assert.match(inbox,/async function startGroup\(event:FormEvent<HTMLFormElement>\)\{event\.preventDefault\(\);if\(sending\)return;/);
  assert.match(inbox,/setMessage\("Creating group chat…"\)/);
  assert.match(inbox,/await loadConversations\(conversationId\)/);
  assert.match(inbox,/sending\?"Creating…":"Create group"/);
});
