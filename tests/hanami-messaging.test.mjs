import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const inbox=await readFile(new URL("../app/portal/InboxPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const foundation=await readFile(new URL("../supabase/migrations/20260818143500_hanami_messaging_foundation.sql",import.meta.url),"utf8");
const hardening=await readFile(new URL("../supabase/migrations/20260818144000_harden_messaging_rls_helpers.sql",import.meta.url),"utf8");
const direct=await readFile(new URL("../supabase/migrations/20260818144500_add_direct_message_conversation_function.sql",import.meta.url),"utf8");
const directory=await readFile(new URL("../supabase/migrations/20260818145000_add_conversation_participant_directory.sql",import.meta.url),"utf8");

test("Hanami Inbox is website-native and character scoped",()=>{
  assert.match(inbox,/HANAMI MESSAGES/);
  assert.match(inbox,/No external email app or email address is used/);
  assert.match(inbox,/sender_character_id:characterId/);
  assert.match(inbox,/character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.doesNotMatch(inbox,/mailto:/i);
});

test("direct messages start by exact Hanami handle through an RPC",()=>{
  assert.match(inbox,/rpc\/start_direct_conversation/);
  assert.match(inbox,/target_handle:clean/);
  assert.match(direct,/user_owns_character\(sender_character_id\)/);
  assert.match(direct,/where c\.handle = lower/);
  assert.match(direct,/existing_conversation_id/);
});

test("messaging RLS requires conversation participation and character ownership",()=>{
  assert.match(foundation,/enable row level security/);
  assert.match(hardening,/user_participates_in_conversation/);
  assert.match(hardening,/user_owns_character/);
  assert.match(hardening,/members send as own participating character/);
  assert.match(hardening,/revoke all on function public\.user_participates_in_conversation/);
});

test("participant identities are only exposed inside shared conversations",()=>{
  assert.match(directory,/conversation_participant_directory/);
  assert.match(directory,/user_participates_in_conversation\(target_conversation_id\)/);
  assert.match(directory,/revoke all on function public\.conversation_participant_directory/);
});

test("both role dashboards render the real inbox instead of a message placeholder",()=>{
  assert.match(dashboard,/InboxPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.doesNotMatch(dashboard,/\["MESSAGES","Hanami inbox"/);
});
