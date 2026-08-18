import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const manager=await readFile(new URL("../app/portal/CharacterManager.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818130000_portal_foundation.sql",import.meta.url),"utf8");

test("character manager loads only authenticated account data",()=>{
  assert.match(manager,/auth\/v1\/user/);
  assert.match(manager,/rest\/v1\/characters\?select=/);
  assert.match(manager,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.doesNotMatch(manager,/service_role/i);
});

test("character creation uses the next open slot and starts private",()=>{
  assert.match(manager,/character\.slot===1\)\?2:1/);
  assert.match(manager,/visibility:"private"/);
  assert.match(manager,/characters\.length>=2/);
  assert.match(manager,/student/);
  assert.match(manager,/faculty/);
});

test("character switching updates and remembers the active character",()=>{
  assert.match(manager,/is_active=eq\.true/);
  assert.match(manager,/is_active:false/);
  assert.match(manager,/is_active:true/);
  assert.match(manager,/hanami\.portal\.character\.v1/);
  assert.match(manager,/localStorage\.setItem\(CHARACTER_SESSION_KEY,character\.id\)/);
  assert.match(manager,/will stay active until logout/);
});

test("character selection restores across refreshes",()=>{
  assert.match(manager,/localStorage\.getItem\(CHARACTER_SESSION_KEY\)/);
  assert.match(manager,/character\.id===rememberedId&&character\.is_active/);
  assert.match(manager,/is still your active Hanami character/);
});

test("database remains the final authority for the two-slot rule",()=>{
  assert.match(migration,/slot in \(1, 2\)/);
  assert.match(migration,/unique \(owner_user_id, slot\)/);
  assert.match(migration,/members create own characters/);
  assert.match(migration,/auth\.uid\(\).*owner_user_id/s);
});
