import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const migration=await readFile(new URL("../supabase/migrations/20260819174800_replace_profile_area_capacity_with_40_widget_limit.sql",import.meta.url),"utf8");

test("Profile Studio allows freeform overlap and caps each character at 40 widgets",()=>{
  assert.match(migration,/existing_count >= 40/);
  assert.match(migration,/at most 40 widgets/);
  assert.match(migration,/drop trigger if exists enforce_profile_canvas_capacity/);
  assert.match(migration,/drop function if exists private\.enforce_profile_canvas_capacity/);
  assert.match(migration,/before insert or update of character_id/);
  assert.doesNotMatch(migration,/sum\(width::bigint\*height::bigint\)/);
});
