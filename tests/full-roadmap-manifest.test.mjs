import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const contains=(source,tokens)=>{for(const token of tokens)assert.match(source,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));};

test("full Hanami school-day and academic roadmap remains wired",async()=>{
 const dashboard=await read("app/portal/DashboardShell.tsx");
 const bulletin=await read("app/portal/DailySchoolBulletinPanel.tsx");
 const classroom=await read("app/portal/ClassroomOperationsPanel.tsx");
 const competitions=await read("app/portal/ClassCompetitionExamPanel.tsx");
 contains(dashboard,["DailySchoolBulletinPanel","ClassroomOperationsPanel","ClassCompetitionExamPanel"]);
 contains(bulletin,["bell","bulletin"]);
 contains(classroom,["office_hour_requests","classroom_seating_assignments","substitute_teacher_assignments","bell_schedule_overrides"]);
 contains(competitions,["class_competitions","class_competition_points","exam_week_config","exam_assignments"]);
});

test("full profile social privacy roadmap remains wired",async()=>{
 const social=await read("app/portal/ProfileSocialControlsPanel.tsx");
 const lookup=await read("app/portal/ProfileLookupPanel.tsx");
 const notifications=await read("app/portal/NotificationAccessibilityPanel.tsx");
 contains(social,["Top Friends","character_profile_badges","status_message","show_visit_counter"]);
 contains(lookup,["lookup_visible_profile_social","record_profile_visit","TOP FRIENDS","PROFILE VIEWS"]);
 contains(notifications,["Do Not Disturb"]);
 assert.doesNotMatch(notifications,/dark_mode/i);
});

test("full Profile Studio roadmap remains wired",async()=>{
 const studio=await read("app/portal/ProfileStudioRoadmapTools.tsx");
 const workspace=await read("app/portal/ProfileDesignWorkspace.tsx");
 const market=await read("app/portal/ProfileTemplateMarketplacePanel.tsx");
 contains(studio,["Sticker Creator","Seasonal Template Packs","Show rulers & guides","Snap to horizontal center","Snap to vertical center","Distribute evenly ↔","Distribute evenly ↕","Saving…","Saved just now","Failed to save"]);
 contains(workspace,["ProfileStudioRoadmapTools"]);
 contains(market,["submit_profile_template_for_review","Apply to my canvas","media is intentionally excluded"]);
});

test("full community and moderation roadmap remains wired",async()=>{
 const dashboard=await read("app/portal/DashboardShell.tsx");
 const rumors=await read("app/portal/RumorsBoardPanel.tsx");
 const approval=await read("app/portal/admin/AdminContentApprovalPanel.tsx");
 const operations=await read("app/portal/admin/AdminCommunityOperationsPanel.tsx");
 contains(dashboard,["RumorsBoardPanel","CommunityCenterPanel"]);
 contains(rumors,["school_rumors","content_approval_queue","Submit for review"]);
 contains(approval,["content_approval_queue"]);
 contains(operations,["organization","election"]);
});

test("full worldbuilding roadmap remains wired",async()=>{
 const layout=await read("app/layout.tsx");
 const theme=await read("app/components/SiteThemeRuntime.tsx");
 const retro=await read("app/retro-ui.css");
 const weather=await read("app/components/RoleplayWeatherEffects.tsx");
 const examRuntime=await read("app/components/ExamWeekRuntime.tsx");
 const city=await read("app/portal/city/HanamiCityClient.tsx");
 const lore=await read("app/portal/lore/LoreCanonExplorerClient.tsx");
 contains(layout,["SiteThemeRuntime","RoleplayWeatherEffects","ExamWeekRuntime","retro-ui.css"]);
 contains(theme,["current_school_theme"]);
 contains(retro,["Verdana","Trebuchet MS","Courier New"]);
 contains(weather,["sakura","rainy","typhoon","winter"]);
 contains(examRuntime,["current_exam_week_mode"]);
 contains(city,["city_transit_lines","city_transit_services","city_commute_routes","station_description","city_neighborhoods"]);
 contains(lore,["Lore","Canon"]);
});

test("full Roadmap Hub social-program roadmap remains wired",async()=>{
 const hub=await read("app/portal/RoadmapHubPanel.tsx");
 const social=await read("app/portal/RoadmapSocialProgramsPanel.tsx");
 const route=await read("app/portal/roadmap/RoadmapHubClient.tsx");
 contains(hub,["Onboarding","Feedback Voting","Volunteer Hours","Part-time Work Schedule","Mentorship Program"]);
 assert.doesNotMatch(hub,/Tester Release Channel/);
 contains(social,["Study Group","event_rsvps","study_group_matches"]);
 contains(route,["RoadmapHubPanel","RoadmapSocialProgramsPanel","ProfileTemplateMarketplacePanel","CharacterArchiveExportPanel"]);
});

test("full onboarding changelog and production release roadmap remains wired",async()=>{
 const tour=await read("app/portal/GuidedFirstLoginTour.tsx");
 const rolePortal=await read("app/portal/RolePortalClient.tsx");
 const changelog=await read("app/changelog/page.tsx");
 const runtime=await read("app/components/RuntimeOperationsBridge.tsx");
 contains(rolePortal,["GuidedFirstLoginTour"]);
 contains(tour,["student","faculty"]);
 contains(changelog,["Changelog"]);
 contains(runtime,["feature_flags","hanami-feature-flags"]);
 assert.doesNotMatch(runtime,/tester_release_channels|tester_release_memberships|hanamiTesterPreview/);
});

test("full staff Owner operations roadmap remains wired",async()=>{
 const admin=await read("app/portal/admin/AdminWorkspace.tsx");
 const owner=await read("app/portal/owner/OwnerPortalClient.tsx");
 contains(admin,["AdminStaffAnalyticsPanel","AdminNarrativeModerationPanel","AdminContentApprovalPanel","AdminRoadmapManager","AdminRoadmapOperationsPanel","AdminCompetitionExamManager","AdminContinuityArchiveManager","AdminCityTransitManager","AdminCityLifecyclePanel","AdminCommunityOperationsPanel","AdminLoreCanonEditor"]);
 contains(owner,["OwnerSystemHealthAnalyticsPanel","OwnerOperationsPanel","OwnerBugDetectorPanel","AdminWorkspace"]);
});

test("full messaging roadmap remains wired",async()=>{
 const inbox=await read("app/portal/InboxPanel.tsx");
 const center=await read("app/portal/MessageCenterPanel.tsx");
 contains(inbox,["start_direct_conversation","start_group_conversation","conversation_participant_directory","message-media-sign","mark_conversation_read"]);
 contains(center,["InboxPanel"]);
});

test("roadmap exclusions remain enforced",async()=>{
 const accessibility=await read("app/portal/NotificationAccessibilityPanel.tsx");
 const characterManager=await read("app/portal/CharacterManager.tsx");
 assert.doesNotMatch(accessibility,/dark_mode/i);
 assert.doesNotMatch(characterManager,/birthday|birth_date|date_of_birth/i);
});
