import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const studio=await readFile(new URL("../app/portal/ProfileStudioPanel.tsx",import.meta.url),"utf8");
const templates=await readFile(new URL("../app/portal/ProfileTemplateGallery.tsx",import.meta.url),"utf8");
const workspace=await readFile(new URL("../app/portal/ProfileDesignWorkspace.tsx",import.meta.url),"utf8");
const lookup=await readFile(new URL("../app/portal/ProfileLookupPanel.tsx",import.meta.url),"utf8");
const dashboard=await readFile(new URL("../app/portal/DashboardShell.tsx",import.meta.url),"utf8");
const migration=await readFile(new URL("../supabase/migrations/20260818154500_customizable_profile_canvas_foundation.sql",import.meta.url),"utf8");
const widgetMigration=await readFile(new URL("../supabase/migrations/20260818155000_expand_profile_widget_library.sql",import.meta.url),"utf8");
const mediaMigration=await readFile(new URL("../supabase/migrations/20260818155500_profile_media_storage.sql",import.meta.url),"utf8");
const dividerMigration=await readFile(new URL("../supabase/migrations/20260818180600_allow_thin_profile_dividers.sql",import.meta.url),"utf8");
const capacityMigration=await readFile(new URL("../supabase/migrations/20260818180700_limit_profile_widgets_to_canvas_capacity.sql",import.meta.url),"utf8");
const deleteMigration=await readFile(new URL("../supabase/migrations/20260818181300_confirm_profile_widget_deletion.sql",import.meta.url),"utf8");
const grantMigration=await readFile(new URL("../supabase/migrations/20260818181400_tighten_profile_studio_table_grants.sql",import.meta.url),"utf8");
const edgeFunction=await readFile(new URL("../supabase/functions/profile-media-sign/index.ts",import.meta.url),"utf8");
const fixture=await readFile(new URL("../supabase/migrations/20260818155000_test_faculty_portal_fixture.sql",import.meta.url),"utf8");
const ownerFixture=await readFile(new URL("../supabase/migrations/20260818181000_restrict_test_faculty_fixture_to_owner.sql",import.meta.url),"utf8");
const authorizationMigration=await readFile(new URL("../supabase/migrations/20260818180800_portal_authorization_and_privileged_login_foundation.sql",import.meta.url),"utf8");
const manager=await readFile(new URL("../app/portal/CharacterManager.tsx",import.meta.url),"utf8");

test("Profile Studio uses independent saved widgets instead of a fixed profile template",()=>{
  assert.match(studio,/character_profile_canvases/);
  assert.match(studio,/character_profile_widgets/);
  assert.match(studio,/CANVA-INSPIRED WIDGET CANVAS/);
  assert.match(studio,/startDrag/);
  assert.match(studio,/startResize/);
  assert.match(studio,/Rotation/);
  assert.match(studio,/Opacity/);
  assert.match(studio,/Layer/);
  assert.match(studio,/Lock position/);
});

test("Profile Studio supports Canva-style multi-select history and alignment",()=>{
  assert.match(studio,/Shift-click/);
  assert.match(studio,/selectedIds/);
  assert.match(studio,/Undo/);
  assert.match(studio,/Redo/);
  assert.match(studio,/Duplicate/);
  assert.match(studio,/To front/);
  assert.match(studio,/To back/);
  assert.match(studio,/Align left/);
  assert.match(studio,/Align bottom/);
});

test("profile canvas and widgets remain owner scoped",()=>{
  assert.match(migration,/members manage own profile canvas/);
  assert.match(migration,/members manage own profile widgets/);
  assert.match(migration,/owner_user_id=\(select auth\.uid\(\)\)/);
  assert.match(migration,/on delete cascade/);
  assert.match(grantMigration,/revoke all on table public\.character_profile_widgets from anon/);
  assert.match(grantMigration,/grant select, insert, update, delete/);
});

test("Profile Studio includes expanded personal-site widgets",()=>{
  for(const widget of ["quote","playlist","photo_strip","badge","marquee","guestbook"]){
    assert.match(studio,new RegExp(`\\"${widget}\\"`));
    assert.match(widgetMigration,new RegExp(`'${widget}'`));
  }
  assert.match(lookup,/photo_strip/);
  assert.match(lookup,/marqueeText/);
});

test("profile templates are optional editable starting points",()=>{
  assert.match(templates,/Scrapbook/);
  assert.match(templates,/Student ID Board/);
  assert.match(templates,/Magazine Profile/);
  assert.match(templates,/Minimal Desktop/);
  assert.match(templates,/OPTIONAL • FULLY EDITABLE/);
  assert.match(workspace,/hanami-profile-template-applied/);
  assert.match(workspace,/setRevision/);
  assert.match(dividerMigration,/height >= 4/);
});

test("profile capacity is limited by page area rather than an arbitrary widget count",()=>{
  assert.match(capacityMigration,/enforce_profile_canvas_capacity/);
  assert.match(capacityMigration,/canvas_width/);
  assert.match(capacityMigration,/canvas_height/);
  assert.match(studio,/This profile page is full/);
  assert.doesNotMatch(studio,/MAX_WIDGETS/);
});

test("locked widgets remain selectable and recoverable",()=>{
  assert.match(studio,/selectWidget\(event, widget\)/);
  assert.match(studio,/Locked widget selected/);
  assert.match(studio,/Lock position/);
  assert.match(workspace,/Unlock all widgets/);
});

test("image widgets do not steal Profile Studio drag gestures",()=>{
  assert.match(studio,/draggable=\{false\}/);
  assert.match(studio,/pointerEvents: "none"/);
  assert.match(studio,/onDragStart=/);
});

test("profile widget deletion is server confirmed and cannot silently reappear",()=>{
  assert.match(deleteMigration,/delete_owned_profile_widget/);
  assert.match(deleteMigration,/owner_user_id=auth\.uid\(\)/);
  assert.match(studio,/rpc\/delete_owned_profile_widget/);
  assert.match(studio,/confirmed as deleted/);
  assert.match(studio,/permanently removed from this profile/);
});

test("private profile media is owner uploaded and privacy signed",()=>{
  assert.match(mediaMigration,/profile-media/);
  assert.match(mediaMigration,/profile owners upload media/);
  assert.match(mediaMigration,/profile owners read media/);
  assert.match(mediaMigration,/profile owners delete media/);
  assert.match(mediaMigration,/can_view_character_profile/);
  assert.match(studio,/Upload from your computer/);
  assert.match(studio,/storage_path/);
  assert.match(studio,/5 MB/);
  assert.match(lookup,/profile-media-sign/);
  assert.match(edgeFunction,/Missing authorization/);
  assert.match(edgeFunction,/paths\.some\(path => !path\.startsWith/);
  assert.match(edgeFunction,/createSignedUrls\(paths, 300\)/);
  assert.match(edgeFunction,/can_view_character_profile/);
  assert.match(edgeFunction,/Profile media is not visible to this character/);
});

test("both role dashboards expose the shared Profile Design Workspace",()=>{
  assert.match(dashboard,/ProfileDesignWorkspace accessToken=\{accessToken\} characterId=\{character\.id\}/);
  assert.match(dashboard,/Profile & Privacy/);
  assert.match(dashboard,/Profile Templates/);
  assert.match(dashboard,/Profile Studio/);
});

test("TEST Faculty fixture is explicit test data, owner scoped, and Owner only",()=>{
  assert.match(fixture,/TEST-101/);
  assert.match(fixture,/is_test_data/);
  assert.match(fixture,/2006-2007/);
  assert.match(fixture,/c\.owner_user_id=auth\.uid\(\)/);
  assert.match(fixture,/c\.handle like 'testfaculty_%'/);
  assert.match(ownerFixture,/private\.is_owner_discord_user\(\)/);
  assert.match(authorizationMigration,/owner_discord_user_id','974361056451379210'/);
  assert.match(authorizationMigration,/create or replace function private\.is_owner_discord_user/);
  assert.match(manager,/current_owner_status/);
  assert.match(manager,/rpc\/attach_test_faculty_section/);
});
