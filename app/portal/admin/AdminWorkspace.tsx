"use client";

import type {ReactNode} from "react";
import {useEffect,useState} from "react";
import styles from "./AdminWorkspace.module.css";
import AdminSchoolStatusManager from "./AdminSchoolStatusManager";
import AdminAnnouncementManager from "./AdminAnnouncementManager";
import AdminEventManager from "./AdminEventManager";
import AdminOfficeRequestManager from "./AdminOfficeRequestManager";
import AdminOpportunityManager from "./AdminOpportunityManager";
import AdminModerationManager from "./AdminModerationManager";
import AdminCharacterDirectory from "./AdminCharacterDirectory";
import AdminStudentOverviewPanel from "./AdminStudentOverviewPanel";
import AdminAcademicManager from "./AdminAcademicManager";
import AdminScheduleBlockManager from "./AdminScheduleBlockManager";
import AdminGovernancePanel from "./AdminGovernancePanel";
import AdminOperationsExpansionPanel from "./AdminOperationsExpansionPanel";
import AdminSupportTicketManager from "./AdminSupportTicketManager";
import AdminRoleplaySystemsManager from "./AdminRoleplaySystemsManager";
import AdminHallPassManager from "./AdminHallPassManager";
import AdminNarrativeModerationPanel from "./AdminNarrativeModerationPanel";
import AdminStaffAnalyticsPanel from "./AdminStaffAnalyticsPanel";
import AdminContentApprovalPanel from "./AdminContentApprovalPanel";
import AdminRoadmapManager from "./AdminRoadmapManager";
import AdminRoadmapOperationsPanel from "./AdminRoadmapOperationsPanel";
import AdminCompetitionExamManager from "./AdminCompetitionExamManager";
import AdminContinuityArchiveManager from "./AdminContinuityArchiveManager";
import AdminCityTransitManager from "./AdminCityTransitManager";
import AdminCityLifecyclePanel from "./AdminCityLifecyclePanel";
import AdminCommunityOperationsPanel from "./AdminCommunityOperationsPanel";
import AdminLoreCanonEditor from "./AdminLoreCanonEditor";
import AdminDeletionManager from "./AdminDeletionManager";
import AdminStudentIdManager from "./AdminStudentIdManager";
import AdminHomeroomManager from "./AdminHomeroomManager";
import AdminCommandCenter from "./AdminCommandCenter";
import AdminApplicationReviewPanel from "./AdminApplicationReviewPanel";
import AdminCampusOperationsPanel from "./AdminCampusOperationsPanel";
import AdminDraftWorkspace from "./AdminDraftWorkspace";
import AdminClassDayChangesPanel from "./AdminClassDayChangesPanel";
import AdminEconomyManager from "./AdminEconomyManager";
import AdminPublishingHub from "./AdminPublishingHub";
import AdminClubPublishingPanel from "./AdminClubPublishingPanel";
import AdminReportsOverview from "./AdminReportsOverview";
import OwnerClassroomControlCenter from "../owner/OwnerClassroomControlCenter";

type Access={site_admin:boolean;content_editor:boolean;moderator:boolean};
type View="home"|"classes"|"people"|"content"|"support"|"systems"|"academics"|"communications"|"campus"|"events"|"moderation"|"website"|"reports"|"settings";
type Tool="overview"|"status"|"announcements"|"academics"|"homerooms"|"classroomControl"|"dayChanges"|"schedule"|"deletion"|"operations"|"exams"|"directory"|"studentOverview"|"ids"|"passes"|"narrative"|"moderation"|"publishing"|"events"|"clubs"|"campusOps"|"drafts"|"opportunities"|"applications"|"approvals"|"roadmap"|"lore"|"requests"|"tickets"|"roleplay"|"economy"|"continuity"|"roadmapOps"|"transit"|"city"|"community"|"governance"|"analytics"|"reportsOverview";
type Props={accessToken:string;userId:string;access:Access;ownerMode?:boolean;ownerOverview?:ReactNode;actions?:ReactNode};
type NavItem=[View,string,string];
type ToolItem=[Tool,string];

const ownerNav:NavItem[]=[["home","⌂","Dashboard"],["classes","▣","Classrooms"],["people","●","People"],["content","◇","Content"],["support","?","Support"],["systems","⚙","System"]];
const ownerToolMap:Record<string,ToolItem[]>={
 home:[["overview","Overview"],["status","School Status"],["announcements","Announcements"]],
 classes:[["classroomControl","Classroom Control Center"]],
 people:[["directory","Directory"],["studentOverview","Student Overview"],["ids","School IDs"],["passes","Hall Passes"],["narrative","Narrative Review"],["moderation","Moderation"]],
 content:[["publishing","School Publishing"],["events","Events"],["clubs","Club Publishing"],["campusOps","Campus Operations"],["drafts","Draft Workspace"],["opportunities","Opportunities"],["applications","Applications & PA"],["approvals","Approvals"],["roadmap","Roadmap"],["lore","Lore & Canon"]],
 support:[["requests","Office Requests"],["tickets","Support Tickets"]],
 systems:[["economy","Economy & Exchange"],["roleplay","Roleplay Systems"],["continuity","Continuity"],["roadmapOps","Roadmap Ops"],["transit","Transit"],["city","City Lifecycle"],["community","Community Ops"]]
};

const adminNav:NavItem[]=[["home","⌂","Dashboard"],["people","●","People"],["academics","▣","Academics"],["communications","✉","Communications"],["campus","◇","Campus"],["events","□","Events"],["moderation","!","Moderation"],["website","◎","Website"],["reports","▤","Reports"],["settings","⚙","Settings"]];
const adminToolMap:Record<string,ToolItem[]>={
 home:[["overview","Overview"],["status","School Status"]],
 people:[["directory","Directory"],["studentOverview","Student Overview"],["ids","School IDs"],["passes","Hall Passes"],["applications","Applications & PA"],["deletion","Removal Tools"]],
 academics:[["academics","Courses & Sections"],["homerooms","Homerooms"],["dayChanges","Day Changes"],["schedule","Schedule Blocks"],["operations","Academic Operations"],["exams","Exams"]],
 communications:[["announcements","Announcements"],["drafts","Draft Workspace"],["requests","Office Requests"],["tickets","Support Tickets"]],
 campus:[["clubs","Club Publishing"],["opportunities","Opportunities"],["campusOps","Campus Operations"],["community","Community Ops"],["transit","Transit"],["city","City Lifecycle"]],
 events:[["events","Events"]],
 moderation:[["moderation","Moderation"],["narrative","Narrative Review"],["approvals","Content Approvals"]],
 website:[["publishing","School Publishing"],["roadmap","Website Roadmap"],["lore","Lore & Canon"]],
 reports:[["reportsOverview","Reports Overview"],["analytics","Staff Analytics"],["continuity","Continuity Archive"],["roadmapOps","Roadmap Operations"]],
 settings:[["governance","Governance"],["economy","Economy & Exchange"],["roleplay","Roleplay Systems"]]
};

export default function AdminWorkspace({accessToken,userId,access,ownerMode=false,ownerOverview,actions}:Props){
 const [view,setView]=useState<View>("home");const [tool,setTool]=useState<Tool>("overview");const [secondaryOpen,setSecondaryOpen]=useState(true);
 const canModerate=access.site_admin||access.moderator;const canEditContent=access.site_admin||access.content_editor;const hasAdminAccess=access.site_admin||access.content_editor||access.moderator;
 function canUseTool(candidate:Tool){
  if(ownerMode)return true;
  if(["overview","status","directory","studentOverview","ids","passes","narrative"].includes(candidate))return hasAdminAccess;
  if(candidate==="reportsOverview")return access.site_admin||canEditContent;
  if(["academics","homerooms","dayChanges","schedule","deletion","operations","exams","applications","campusOps","continuity","governance","analytics"].includes(candidate))return access.site_admin;
  if(["announcements","publishing","events","clubs","drafts","opportunities","approvals","roadmap","lore","requests","economy","roadmapOps","transit","city","community"].includes(candidate))return canEditContent;
  if(["moderation","tickets"].includes(candidate))return canModerate;
  if(candidate==="roleplay")return access.site_admin||canModerate;
  return false;
 }
 const toolMap=ownerMode?ownerToolMap:adminToolMap;
 const toolsForView=(candidate:View)=>(toolMap[candidate]??[]).filter(([id])=>canUseTool(id));
 const nav=(ownerMode?ownerNav:adminNav).filter(([id])=>toolsForView(id).length>0);
 const visibleTools=toolsForView(view);
 function changeView(next:View){const tools=toolsForView(next);if(!tools.length)return;setView(next);setTool(tools[0][0]);}
 useEffect(()=>{function route(event:Event){const detail=(event as CustomEvent<{view?:string;tool?:string}>).detail;if(!detail?.tool)return;const requestedView=detail.view as View|undefined;const requestedTool=detail.tool as Tool;if(!canUseTool(requestedTool))return;let nextView=requestedView&&toolsForView(requestedView).some(([id])=>id===requestedTool)?requestedView:undefined;if(!nextView){const match=nav.find(([candidate])=>toolsForView(candidate).some(([id])=>id===requestedTool));nextView=match?.[0];}if(!nextView)return;setView(nextView);setTool(requestedTool);window.scrollTo({top:0,behavior:"smooth"});}window.addEventListener("hanami-admin-command",route);return()=>window.removeEventListener("hanami-admin-command",route);});
 return <section className={styles.shell}>
  <aside className={styles.globalNav} aria-label={`${ownerMode?"Owner":"Administration"} global navigation`}><a className={styles.logoButton} href="../../" aria-label="Hanami High home"/><nav>{nav.map(([key,icon,label])=><button key={key} type="button" className={view===key?styles.active:""} onClick={()=>changeView(key)}><span aria-hidden="true">{icon}</span><b>{label}</b></button>)}</nav>{actions&&<div className={styles.globalActions}>{actions}</div>}</aside>
  <main className={`${styles.main} ${secondaryOpen?"":styles.secondaryCollapsed}`}><header className={styles.header}><div><p>{ownerMode?"Owner":"Administration"} Portal</p><h1>{nav.find(item=>item[0]===view)?.[2]??"Administration"}</h1></div><div className={styles.headerActions}><button type="button" className={styles.secondaryToggle} aria-expanded={secondaryOpen} onClick={()=>setSecondaryOpen(v=>!v)}>{secondaryOpen?"Hide tools":"Show tools"}</button><span className={styles.badge}>{ownerMode?"OWNER":"ADMIN"}</span></div></header>
   <aside className={`${styles.secondaryNav} ${secondaryOpen?"":styles.secondaryNavCollapsed}`} aria-label={`${view} tools`}><strong>{secondaryOpen?nav.find(item=>item[0]===view)?.[2]:"Tools"}</strong>{secondaryOpen?<nav>{visibleTools.map(([key,label])=><button key={key} type="button" className={tool===key?styles.toolActive:""} onClick={()=>setTool(key)}>{label}</button>)}</nav>:<button type="button" className={styles.reopenTools} aria-label="Show tool navigation" onClick={()=>setSecondaryOpen(true)}>›</button>}</aside>
   <section className={styles.content}>
    {tool==="overview"&&<><div className={styles.pageIntro}><h2>{ownerMode?"Owner Dashboard":"Administration Dashboard"}</h2><p>{ownerMode?"Owner controls and school operations in one workspace.":"People, academics, communications, campus, events, moderation, website operations, reports, and settings in one administration workspace."}</p></div><AdminCommandCenter accessToken={accessToken} access={access}/>{ownerMode&&ownerOverview}</>}
    {tool==="status"&&<AdminSchoolStatusManager accessToken={accessToken} userId={userId} access={access}/>} {tool==="announcements"&&<AdminAnnouncementManager accessToken={accessToken} userId={userId} access={access}/>} 
    {tool==="classroomControl"&&ownerMode&&<OwnerClassroomControlCenter accessToken={accessToken} userId={userId}/>} {tool==="academics"&&!ownerMode&&access.site_admin&&<AdminAcademicManager accessToken={accessToken}/>} {tool==="homerooms"&&!ownerMode&&access.site_admin&&<AdminHomeroomManager accessToken={accessToken}/>} {tool==="dayChanges"&&!ownerMode&&access.site_admin&&<AdminClassDayChangesPanel accessToken={accessToken}/>} {tool==="schedule"&&!ownerMode&&access.site_admin&&<AdminScheduleBlockManager accessToken={accessToken}/>} {tool==="deletion"&&!ownerMode&&access.site_admin&&<AdminDeletionManager accessToken={accessToken}/>} {tool==="operations"&&!ownerMode&&access.site_admin&&<AdminOperationsExpansionPanel accessToken={accessToken} userId={userId}/>} {tool==="exams"&&!ownerMode&&access.site_admin&&<AdminCompetitionExamManager accessToken={accessToken} userId={userId}/>} 
    {tool==="directory"&&hasAdminAccess&&<AdminCharacterDirectory accessToken={accessToken}/>} {tool==="studentOverview"&&hasAdminAccess&&<AdminStudentOverviewPanel accessToken={accessToken}/>} {tool==="ids"&&hasAdminAccess&&<AdminStudentIdManager accessToken={accessToken}/>} {tool==="passes"&&hasAdminAccess&&<AdminHallPassManager accessToken={accessToken}/>} {tool==="narrative"&&hasAdminAccess&&<AdminNarrativeModerationPanel accessToken={accessToken}/>} {tool==="moderation"&&canModerate&&<AdminModerationManager accessToken={accessToken} userId={userId} access={access}/>} 
    {tool==="publishing"&&canEditContent&&<AdminPublishingHub accessToken={accessToken}/>} {tool==="events"&&canEditContent&&<AdminEventManager accessToken={accessToken} userId={userId} access={access}/>} {tool==="clubs"&&canEditContent&&<AdminClubPublishingPanel accessToken={accessToken}/>} {tool==="campusOps"&&access.site_admin&&<AdminCampusOperationsPanel accessToken={accessToken}/>} {tool==="drafts"&&canEditContent&&<AdminDraftWorkspace accessToken={accessToken}/>} {tool==="opportunities"&&canEditContent&&<AdminOpportunityManager accessToken={accessToken} userId={userId}/>} {tool==="applications"&&access.site_admin&&<AdminApplicationReviewPanel accessToken={accessToken} userId={userId}/>} {tool==="approvals"&&canEditContent&&<AdminContentApprovalPanel accessToken={accessToken}/>} {tool==="roadmap"&&canEditContent&&<AdminRoadmapManager accessToken={accessToken} userId={userId}/>} {tool==="lore"&&canEditContent&&<AdminLoreCanonEditor accessToken={accessToken}/>} 
    {tool==="requests"&&canEditContent&&<AdminOfficeRequestManager accessToken={accessToken} userId={userId}/>} {tool==="tickets"&&canModerate&&<AdminSupportTicketManager accessToken={accessToken} userId={userId}/>} 
    {tool==="economy"&&canEditContent&&<AdminEconomyManager accessToken={accessToken} ownerMode={ownerMode}/>} {tool==="roleplay"&&(access.site_admin||canModerate)&&<AdminRoleplaySystemsManager accessToken={accessToken} access={access}/>} {tool==="continuity"&&access.site_admin&&<AdminContinuityArchiveManager accessToken={accessToken} userId={userId}/>} {tool==="roadmapOps"&&canEditContent&&<AdminRoadmapOperationsPanel accessToken={accessToken} userId={userId} canModerate={canModerate}/>} {tool==="transit"&&canEditContent&&<AdminCityTransitManager accessToken={accessToken}/>} {tool==="city"&&canEditContent&&<AdminCityLifecyclePanel accessToken={accessToken}/>} {tool==="community"&&canEditContent&&<AdminCommunityOperationsPanel accessToken={accessToken} userId={userId}/>} 
    {tool==="reportsOverview"&&!ownerMode&&<AdminReportsOverview siteAdmin={access.site_admin} canEditContent={canEditContent}/>} {tool==="governance"&&access.site_admin&&<AdminGovernancePanel accessToken={accessToken} ownerMode={ownerMode}/>} {tool==="analytics"&&access.site_admin&&<AdminStaffAnalyticsPanel accessToken={accessToken}/>} 
   </section>
  </main>
 </section>;
}
