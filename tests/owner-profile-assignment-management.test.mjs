import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const viewer=fs.readFileSync("app/portal/owner/student-viewer/OwnerStudentPortalViewer.tsx","utf8");
const migration=fs.readFileSync("supabase/migrations/20260820121000_owner_profile_assignment_management.sql","utf8");

test("Owner student management exposes homeroom class and Faculty reassignment controls",()=>{
 assert.match(viewer,/Assign \/ reassign homeroom/);
 assert.match(viewer,/Assign class/);
 assert.match(viewer,/Assign Faculty to class/);
 assert.match(viewer,/Assign \/ reassign adviser/);
 assert.match(viewer,/owner_set_student_homeroom/);
 assert.match(viewer,/owner_set_section_membership/);
 assert.match(viewer,/owner_set_homeroom_adviser/);
});

test("Owner assignment RPCs require privileged Owner access and role-correct assignments",()=>{
 assert.match(migration,/private\.is_owner_discord_user\(\)/);
 assert.match(migration,/has_privileged_portal_session\('owner'\)/);
 assert.match(migration,/target_relationship='student' and target_role<>'student'/);
 assert.match(migration,/target_relationship='instructor' and target_role<>'faculty'/);
 assert.match(migration,/delete from public\.homeroom_memberships/);
});
