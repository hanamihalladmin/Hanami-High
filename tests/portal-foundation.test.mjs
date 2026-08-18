import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const portal=await readFile(new URL("../app/portal/page.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818130000_portal_foundation.sql",import.meta.url),"utf8");
test("portal gateway explains authentication, privacy, and two-character rule",()=>{assert.match(portal,/Continue with Discord/);assert.match(portal,/Maximum two characters/);assert.match(portal,/Private until you publish/);assert.match(portal,/Website messages only/);});
test("database enforces two character slots and allowed roles",()=>{assert.match(migration,/slot in \(1, 2\)/);assert.match(migration,/unique \(owner_user_id, slot\)/);assert.match(migration,/character_role as enum \('student', 'faculty'\)/);});
test("portal foundation enables RLS and owner-scoped policies",()=>{assert.match(migration,/enable row level security/g);assert.match(migration,/auth\.uid\(\)/);assert.match(migration,/to authenticated/);});
