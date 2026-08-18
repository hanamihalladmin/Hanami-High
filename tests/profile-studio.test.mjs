import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const studio=await readFile(new URL("../app/portal/ProfileStudioPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818154500_customizable_profile_canvas_foundation.sql",import.meta.url),"utf8");
const fixture=await readFile(new URL("../supabase/migrations/20260818155000_test_faculty_portal_fixture.sql",import.meta.url),"utf8");
const manager=await readFile(new URL("../app/portal/CharacterManager.tsx",import.meta.url),"utf8");

test("Profile Studio uses independent saved widgets instead of fixed templates",()=>{assert.match(studio,/character_profile_canvases/);assert.match(studio,/character_profile_widgets/);assert.match(studio,/CANVA-INSPIRED WIDGET CANVAS/);assert.match(studio,/text","image","card","link","divider","sticker/);assert.match(studio,/startDrag/);assert.match(studio,/Rotation/);assert.match(studio,/Opacity/);assert.match(studio,/Layer/);assert.match(studio,/Lock position/);});
test("profile canvas and widgets remain owner scoped",()=>{assert.match(migration,/members manage own profile canvas/);assert.match(migration,/members manage own profile widgets/);assert.match(migration,/owner_user_id=\(select auth\.uid\(\)\)/);assert.match(migration,/on delete cascade/);});
test("both role dashboards expose Profile Studio",()=>{assert.match(dashboard,/ProfileStudioPanel accessToken=\{accessToken\} characterId=\{character\.id\}/);assert.match(dashboard,/Profile Studio/);});
test("TEST Faculty fixture is explicit test data and owned-character scoped",()=>{assert.match(fixture,/TEST-101/);assert.match(fixture,/is_test_data/);assert.match(fixture,/2006-2007/);assert.match(fixture,/c\.owner_user_id=auth\.uid\(\)/);assert.match(fixture,/c\.handle like 'testfaculty_%'/);assert.match(manager,/rpc\/attach_test_faculty_section/);});
