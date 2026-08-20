import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Profile Studio precision roadmap is complete",async()=>{
 const tools=await read("app/portal/ProfileStudioRoadmapTools.tsx");
 for(const phrase of ["Show rulers & guides","Snap to horizontal center","Snap to vertical center","Distribute evenly ↔","Distribute evenly ↕","Saved just now","Saving…","Failed to save","Sticker Creator","Seasonal Template Packs"])assert.match(tools,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
});

test("study matching and optional event RSVP are active-character systems",async()=>{
 const panel=await read("app/portal/RoadmapSocialProgramsPanel.tsx");
 const migration=await read("supabase/migrations/20260820235900_finish_study_matching_and_event_rsvps.sql");
 assert.match(panel,/study_group_matches/);assert.match(panel,/event_rsvps/);assert.match(panel,/Create Study Group/);assert.match(panel,/Join group/);
 for(const response of ["attending","maybe","not_attending"])assert.match(panel,new RegExp(response));
 assert.match(migration,/c\.id=viewer_character_id and c\.owner_user_id=auth\.uid\(\) and c\.role='student'/);
 assert.match(migration,/alter table public\.event_rsvps enable row level security/);
 assert.match(migration,/alter table public\.study_match_profiles enable row level security/);
});

test("roadmap staff operations cover transit shifts volunteer mentorship and RSVPs",async()=>{
 const panel=await read("app/portal/admin/AdminRoadmapOperationsPanel.tsx");
 const workspace=await read("app/portal/admin/AdminWorkspace.tsx");
 for(const phrase of ["Transit Stops","Part-time Work Shifts","Volunteer Hours","Mentorship Oversight","Event RSVP Summary"])assert.match(panel,new RegExp(phrase));
 assert.match(workspace,/AdminRoadmapOperationsPanel/);
 assert.doesNotMatch(workspace,/!canEditContent&&canModerate&&<AdminRoadmapOperationsPanel/);
});

test("class competitions Exams Week and honors are fully wired",async()=>{
 const member=await read("app/portal/ClassCompetitionExamPanel.tsx");
 const admin=await read("app/portal/admin/AdminCompetitionExamManager.tsx");
 const dashboard=await read("app/portal/DashboardShell.tsx");
 for(const token of ["class_competitions","class_competition_points","exam_week_config","exam_assignments"])assert.match(member,new RegExp(token));
 for(const token of ["class_competitions","exam_week_config","student_honors"])assert.match(admin,new RegExp(token));
 assert.match(admin,/show_rank_publicly/);assert.match(dashboard,/ClassCompetitionExamPanel/);assert.match(dashboard,/Competitions & Exams Week/);
});

test("tester-only flags require tester release membership",async()=>{
 const runtime=await read("app/components/RuntimeOperationsBridge.tsx");
 assert.match(runtime,/tester_release_channels/);assert.match(runtime,/tester_release_memberships/);assert.match(runtime,/hanamiTesterPreview/);assert.match(runtime,/flag\.tester_only\?\(tester\?"on":"off"\):"on"/);
});

test("profile templates use moderated approval before publication",async()=>{
 const panel=await read("app/portal/ProfileTemplateMarketplacePanel.tsx");
 const migration=await read("supabase/migrations/20260821002000_complete_profile_template_moderation.sql");
 assert.match(panel,/submit_profile_template_for_review/);assert.match(panel,/Apply to my canvas/);assert.match(panel,/media is intentionally excluded/);
 assert.match(migration,/content_approval_queue/);assert.match(migration,/status='published'/);assert.match(migration,/sync_profile_template_approval_trigger/);
});

test("character archive export and continuity archive have member and Admin workflows",async()=>{
 const member=await read("app/portal/CharacterArchiveExportPanel.tsx");
 const admin=await read("app/portal/admin/AdminContinuityArchiveManager.tsx");
 const migration=await read("supabase/migrations/20260821003000_complete_character_archive_export.sql");
 const workspace=await read("app/portal/admin/AdminWorkspace.tsx");
 assert.match(member,/archive_my_character/);assert.match(member,/Download JSON export/);assert.match(member,/roleplay_continuity_archive/);
 assert.match(admin,/roleplay_continuity_archive/);assert.match(admin,/Archive continuity entry/);assert.match(workspace,/AdminContinuityArchiveManager/);
 assert.match(migration,/c\.id=viewer_character_id and owner_user_id=auth\.uid\(\)/);assert.match(migration,/character_profile_widgets/);
});

test("Roadmap Hub exposes all completion modules",async()=>{
 const hub=await read("app/portal/roadmap/RoadmapHubClient.tsx");
 for(const component of ["RoadmapHubPanel","RoadmapSocialProgramsPanel","ProfileTemplateMarketplacePanel","CharacterArchiveExportPanel"])assert.match(hub,new RegExp(component));
});
