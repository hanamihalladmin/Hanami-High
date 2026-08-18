import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const manager=await readFile(new URL("../app/portal/CharacterManager.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818130000_portal_foundation.sql",import.meta.url),"utf8");
const deletion=await readFile(new URL("../supabase/migrations/20260818153500_allow_permanent_character_deletion.sql",import.meta.url),"utf8");
const finalDeletion=await readFile(new URL("../supabase/migrations/20260818161000_finish_permanent_character_deletion_support.sql",import.meta.url),"utf8");
const fixture=await readFile(new URL("../supabase/migrations/20260818155000_test_faculty_portal_fixture.sql",import.meta.url),"utf8");

test("character manager loads only authenticated account data",()=>{assert.match(manager,/auth\/v1\/user/);assert.match(manager,/rest\/v1\/characters\?select=/);assert.match(manager,/Authorization:`Bearer \$\{accessToken\}`/);assert.doesNotMatch(manager,/service_role/i);});
test("character creation uses the next open slot and starts private",()=>{assert.match(manager,/character\.slot===1\)\?2:1/);assert.match(manager,/visibility:"private"/);assert.match(manager,/characters\.length>=2/);assert.match(manager,/student/);assert.match(manager,/faculty/);});
test("character switching updates and remembers the active character",()=>{assert.match(manager,/is_active=eq\.true/);assert.match(manager,/is_active:false/);assert.match(manager,/is_active:true/);assert.match(manager,/hanami\.portal\.character\.v1/);assert.match(manager,/localStorage\.setItem\(CHARACTER_SESSION_KEY,character\.id\)/);assert.match(manager,/will stay active until logout/);});
test("character selection restores across refreshes",()=>{assert.match(manager,/localStorage\.getItem\(CHARACTER_SESSION_KEY\)/);assert.match(manager,/character\.id===rememberedId&&character\.is_active/);assert.match(manager,/is still your active Hanami character/);});
test("test faculty character uses the signed-in account and receives TEST-101",()=>{assert.match(manager,/Create Test Faculty/);assert.match(manager,/\[TEST\] Faculty Preview/);assert.match(manager,/role:"faculty"/);assert.match(manager,/owner_user_id:userId/);assert.match(manager,/rpc\/attach_test_faculty_section/);assert.match(manager,/TEST-101/);assert.match(fixture,/is_test_data/);assert.match(fixture,/2006-2007/);});
test("character deletion requires explicit permanent confirmation",()=>{assert.match(manager,/PERMANENT CHARACTER DELETION/);assert.match(manager,/Type DELETE to confirm/);assert.match(manager,/deletePhrase!=="DELETE"/);assert.match(manager,/method:"DELETE"/);assert.match(manager,/This action cannot be undone/);});
test("shared message and coursework history no longer blocks character deletion",()=>{assert.match(deletion,/on delete set null/);assert.match(deletion,/conversation_messages_sender_character_id_fkey/);assert.match(deletion,/conversations_created_by_character_id_fkey/);assert.match(finalDeletion,/course_assignments_created_by_character_id_fkey/);assert.match(finalDeletion,/on delete set null/);});
test("database remains the final authority for the two-slot rule",()=>{assert.match(migration,/slot in \(1, 2\)/);assert.match(migration,/unique \(owner_user_id, slot\)/);assert.match(migration,/members create own characters/);assert.match(migration,/auth\.uid\(\).*owner_user_id/s);});
