import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const migration=await readFile(new URL("../supabase/migrations/20260819023431_restore_rls_permission_helper_execute.sql",import.meta.url),"utf8");

test("authenticated RLS evaluation can execute the private permission helper",()=>{
  assert.match(migration,/grant execute on function private\.account_has_permission\(uuid, public\.hanami_account_permission\) to authenticated;/);
  assert.doesNotMatch(migration,/to anon/);
});
