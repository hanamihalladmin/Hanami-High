import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const inbox=await readFile(new URL("../app/portal/InboxPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const foundation=await readFile(new URL("../supabase/migrations/20260818143500_hanami_messaging_foundation.sql",import.meta.url),"utf8");
const privateHardening=await readFile(new URL("../supabase/migrations/20260818145500_move_messaging_privileged_helpers_private.sql",import.meta.url),"utf8");
const directFix=await readFile(new URL("../supabase/migrations/20260818181100_fix_direct_message_conversation_creation.sql",import.meta.url),"utf8");
const groupMigration=await readFile(new URL("../supabase/migrations/20260818151000_add_group_conversation_function.sql",import.meta.url),"utf8");
const signer=await readFile(new URL("../supabase/functions/message-media-sign/index.ts",import.meta.url),"utf8");

test("Hanami Inbox is website-native and character scoped",()=>{
  assert.match(inbox,/HANAMI MESSAGES/);
  assert.match(inbox,/No external email is used/);
  assert.match(inbox,/sender_character_id:characterId/);
  assert.match(inbox,/character_id=eq\.\$\{encodeURIComponent\(characterId\)\}/);
  assert.doesNotMatch(inbox,/mailto:/i);
});

test("direct messages start by exact Hanami handle through a hardened controlled RPC",()=>{
  assert.match(inbox,/rpc\/start_direct_conversation/);assert.match(inbox,/target_handle:clean/);assert.match(directFix,/private\.start_direct_conversation_internal/);assert.match(directFix,/private\.user_owns_character\(sender_character_id\)/);assert.match(directFix,/private\.resolve_character_id_by_handle\(target_handle\)/);assert.match(directFix,/insert into public\.conversations/);assert.match(directFix,/insert into public\.conversation_participants/);assert.match(directFix,/create or replace function public\.start_direct_conversation/);assert.match(directFix,/security invoker/);
});

test("group chats use exact handles, cap invites, and support membership management",()=>{
  assert.match(inbox,/rpc\/start_group_conversation/);assert.match(inbox,/target_handles:handles/);assert.match(inbox,/handles\.length<1\|\|handles\.length>7/);assert.match(groupMigration,/cardinality\(target_handles\) < 1 or cardinality\(target_handles\) > 7/);assert.match(groupMigration,/private\.resolve_character_id_by_handle/);assert.match(groupMigration,/security invoker/);
  for(const rpc of ["add_group_participant","remove_group_participant","rename_group_conversation","leave_group_conversation"])assert.match(inbox,new RegExp(rpc));
});

test("messaging RLS requires conversation participation and character ownership",()=>{
  assert.match(foundation,/enable row level security/);assert.match(privateHardening,/private\.user_participates_in_conversation/);assert.match(privateHardening,/private\.user_owns_character/);assert.match(privateHardening,/members send as own participating character/);assert.match(privateHardening,/create schema if not exists private/);
});

test("completed messaging supports unread state and private attachments",()=>{
  assert.match(inbox,/conversation_unread_counts/);assert.match(inbox,/mark_conversation_read/);assert.match(inbox,/message_attachments/);assert.match(inbox,/message-media/);assert.match(inbox,/8\*1024\*1024/);assert.match(inbox,/message-media-sign/);
  assert.match(signer,/Authentication required/);assert.match(signer,/conversation_participants/);assert.match(signer,/message_attachments/);assert.match(signer,/expiresIn:300/);
});

test("privileged messaging helpers are kept out of the public API schema",()=>{
  assert.match(privateHardening,/create or replace function private\.conversation_participant_directory_internal/);assert.match(privateHardening,/create or replace function public\.conversation_participant_directory/);assert.match(privateHardening,/security invoker/);assert.match(privateHardening,/drop function if exists public\.user_participates_in_conversation/);
});

test("both role dashboards render the real inbox instead of a message placeholder",()=>{
  assert.match(dashboard,/InboxPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);assert.doesNotMatch(dashboard,/\["MESSAGES","Hanami inbox"/);
});
