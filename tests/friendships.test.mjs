import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const panel=await readFile(new URL("../app/portal/FriendsPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818160500_character_friendship_foundation.sql",import.meta.url),"utf8");

test("friend requests are exact-handle and active-character scoped",()=>{assert.match(panel,/rpc\/send_friend_request/);assert.match(panel,/sender_character_id:characterId/);assert.match(panel,/target_handle:clean/);assert.match(panel,/character_friendship_directory/);});
test("incoming requests require the owned addressee character",()=>{assert.match(migration,/addressee_character_id=c\.id/);assert.match(migration,/c\.owner_user_id=auth\.uid\(\)/);assert.match(migration,/f\.status='pending'/);assert.match(panel,/Accept/);assert.match(panel,/Decline/);});
test("friendship mutation stays behind controlled RPCs",()=>{assert.match(migration,/revoke insert,update,delete on public\.character_friendships from authenticated/);assert.match(migration,/security invoker/);assert.match(migration,/private\.send_friend_request_internal/);assert.match(migration,/private\.respond_friend_request_internal/);assert.match(migration,/private\.remove_friendship_internal/);});
test("Friends-only visibility requires an accepted character friendship",()=>{assert.match(migration,/status='accepted'/);assert.match(migration,/private\.characters_are_friends/);assert.match(migration,/target\.visibility='friends_only'/);assert.match(dashboard,/FriendsPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);});
