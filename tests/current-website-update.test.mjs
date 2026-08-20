import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("student schedule cards open a dedicated class workspace",async()=>{
  const schedule=await read("app/portal/SchedulePanel.tsx");
  const page=await read("app/portal/student/class/page.tsx");
  const client=await read("app/portal/student/class/StudentClassPageClient.tsx");
  assert.match(schedule,/\.\/class\/\?section=/);
  assert.match(schedule,/Open class/);
  assert.match(page,/StudentClassPageClient/);
  assert.match(client,/rpc\/student_class_detail/);
  assert.match(client,/Assignments & teacher feedback/);
  assert.match(client,/TEACHER COMMENT/);
  assert.match(client,/Attendance/);
});

test("student class detail remains enrollment validated and private",async()=>{
  const migration=await read("supabase/migrations/20260819142045_student_class_pages_and_written_late_policy.sql");
  assert.match(migration,/private\.student_class_detail_internal/);
  assert.match(migration,/private\.user_owns_character\(viewer_character_id\)/);
  assert.match(migration,/sm\.character_id=viewer_character_id/);
  assert.match(migration,/sm\.relationship='student'/);
  assert.match(migration,/public\.student_class_detail/);
  assert.match(migration,/security invoker/i);
});

test("faculty written late policies are supported",async()=>{
  const migration=await read("supabase/migrations/20260819142045_student_class_pages_and_written_late_policy.sql");
  const faculty=await read("app/portal/FacultyCourseManager.tsx");
  assert.match(migration,/drop constraint if exists course_assignments_late_policy_check/);
  assert.match(migration,/char_length\(late_policy\) <= 500/);
  assert.match(faculty,/late_policy:latePolicy\.trim\(\)\|\|null/);
  assert.match(faculty,/<span>Late policy<\/span>/);
});

test("opportunity editor distinguishes drafts from immediate publishing",async()=>{
  const admin=await read("app/portal/admin/AdminOpportunityManager.tsx");
  const student=await read("app/portal/StudentOpportunityPanel.tsx");
  const publicFeed=await read("app/components/live-campus-opportunities.tsx");
  const campus=await read("app/campus-life/page.tsx");
  assert.match(admin,/Save draft/);
  assert.match(admin,/Publish opportunity/);
  assert.match(admin,/initialStatus==="published"/);
  assert.match(admin,/opens_at:initialStatus==="published"\?now:null/);
  assert.match(student,/status=eq\.published/);
  assert.match(publicFeed,/status=eq\.published/);
  assert.match(campus,/LiveCampusOpportunities/);
});

test("system announcements are visible outside the notification drawer",async()=>{
  const banner=await read("app/portal/SystemAnnouncementBanner.tsx");
  const dashboard=await read("app/portal/DashboardShell.tsx");
  const nurse=await read("app/portal/FacultyNurseDashboard.tsx");
  assert.match(banner,/status=eq\.published/);
  assert.match(banner,/SYSTEM NOTICE/);
  assert.match(banner,/item\.audience==="all"\|\|item\.audience===role/);
  assert.match(dashboard,/SystemAnnouncementBanner accessToken=\{accessToken\} role=\{character\.role\}/);
  assert.match(nurse,/SystemAnnouncementBanner accessToken=\{accessToken\} role="faculty"/);
});

test("homepage surfaces a multi-event upcoming school feed",async()=>{
  const home=await read("app/page.tsx");
  const events=await read("app/components/live-upcoming-events.tsx");
  assert.match(home,/LiveUpcomingEvents/);
  assert.match(events,/UPCOMING SCHOOL EVENTS/);
  assert.match(events,/status=eq\.published/);
  assert.match(events,/limit=4/);
  assert.match(events,/View complete calendar/);
});
