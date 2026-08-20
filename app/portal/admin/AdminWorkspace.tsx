"use client";

import {useState} from "react";
import styles from "./AdminWorkspace.module.css";
import AdminSchoolStatusManager from "./AdminSchoolStatusManager";
import AdminAnnouncementManager from "./AdminAnnouncementManager";
import AdminEventManager from "./AdminEventManager";
import AdminOfficeRequestManager from "./AdminOfficeRequestManager";
import AdminOpportunityManager from "./AdminOpportunityManager";
import AdminModerationManager from "./AdminModerationManager";
import AdminCharacterDirectory from "./AdminCharacterDirectory";
import AdminAcademicManager from "./AdminAcademicManager";
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

type Access={site_admin:boolean;content_editor:boolean;moderator:boolean};
type View="home"|"classes"|"people"|"content"|"support"|"systems";
type Tool="overview"|"status"|"announcements"|"academics"|"deletion"|"operations"|"exams"|"directory"|"passes"|"narrative"|"moderation"|"events"|"opportunities"|"approvals"|"roadmap"|"lore"|"requests"|"tickets"|"roleplay"|"continuity"|"roadmapOps"|"transit"|"city"|"community";

export default function AdminWorkspace({accessToken,userId,access,ownerMode=false}:{accessToken:string;userId:string;access:Access;ownerMode?:boolean}){
 const [view,setView]=useState<View>("home");const [tool,setTool]=useState<Tool>("overview");
 const canModerate=access.site_admin||access.moderator;
 const canEditContent=access.site_admin||access.content_editor;
 const hasAdminAccess=access.site_admin||access.content_editor||access.moderator;
 const nav:[View,string,string][]=[["home","⌂","Dashboard"],["classes","▣","Courses"],["people","●","People"],["content","◇","Content"],["support","?","Support"],["systems","⚙","Admin"]];
 const toolMap:Record<View,[Tool,string][]>={
  home:[["overview","Overview"],["status","School status"],["announcements","Announcements"]],
  classes:[["academics","Courses & homerooms"],["deletion","Removal tools"],["operations","Academic operations"],["exams","Exams"]],
  people:[["directory","Directory"],["passes","Hall passes"],["narrative","Narrative review"],["moderation","Moderation"]],
  content:[["events","Events"],["opportunities","Opportunities"],["approvals","Approvals"],["roadmap","Roadmap"],["lore","Lore & canon"]],
  support:[["requests","Office requests"],["tickets","Support tickets"]],
  systems:[["roleplay","Roleplay systems"],["continuity","Continuity"],["roadmapOps","Roadmap ops"],["transit","Transit"],["city","City lifecycle"],["community","Community ops"]]
 };
 function changeView(next:View){setView(next);setTool(toolMap[next][0][0]);}
 return <section className={styles.shell}>
  <aside className={styles.sidebar} aria-label="Administration navigation"><div className={styles.brand}><span className={styles.mark}>H</span><div><strong>Hanami High</strong><small>{ownerMode?"Owner Console":"Administration"}</small></div></div><nav className={styles.nav}>{nav.map(([key,icon,label])=><button key={key} type="button" className={view===key?styles.active:""} onClick={()=>changeView(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav></aside>
  <main className={styles.main}><header className={styles.header}><div><p className="eyebrow">HANAMI CLASSROOM • {ownerMode?"OWNER":"ADMIN"}</p><h3>{nav.find(x=>x[0]===view)?.[2]}</h3></div><span className={styles.badge}>{ownerMode?"OWNER FULL ACCESS":"ADMIN TOOLS"}</span></header>
   <div className={styles.workspaceBar}><nav aria-label={`${view} tools`}>{toolMap[view].map(([key,label])=><button key={key} type="button" className={tool===key?styles.toolActive:""} onClick={()=>setTool(key)}>{label}</button>)}</nav></div>
   <div className={styles.view}>
    {view==="home"&&tool==="overview"&&<><div className={styles.intro}><p className="eyebrow">ADMIN DASHBOARD</p><h2>School management at a glance</h2><p>Use the left navigation for major areas and the tool bar above to open one focused management workspace at a time.</p></div>{access.site_admin&&<><AdminGovernancePanel accessToken={accessToken} ownerMode={ownerMode}/><AdminStaffAnalyticsPanel accessToken={accessToken}/></>}</>}
    {view==="home"&&tool==="status"&&<AdminSchoolStatusManager accessToken={accessToken} userId={userId} access={access}/>} {view==="home"&&tool==="announcements"&&<AdminAnnouncementManager accessToken={accessToken} userId={userId} access={access}/>} 
    {view==="classes"&&tool==="academics"&&access.site_admin&&<AdminAcademicManager accessToken={accessToken}/>} {view==="classes"&&tool==="deletion"&&access.site_admin&&<AdminDeletionManager accessToken={accessToken}/>} {view==="classes"&&tool==="operations"&&access.site_admin&&<AdminOperationsExpansionPanel accessToken={accessToken} userId={userId}/>} {view==="classes"&&tool==="exams"&&access.site_admin&&<AdminCompetitionExamManager accessToken={accessToken} userId={userId}/>} 
    {view==="people"&&tool==="directory"&&hasAdminAccess&&<AdminCharacterDirectory accessToken={accessToken}/>} {view==="people"&&tool==="passes"&&hasAdminAccess&&<AdminHallPassManager accessToken={accessToken}/>} {view==="people"&&tool==="narrative"&&hasAdminAccess&&<AdminNarrativeModerationPanel accessToken={accessToken}/>} {view==="people"&&tool==="moderation"&&canModerate&&<AdminModerationManager accessToken={accessToken} userId={userId} access={access}/>} 
    {view==="content"&&tool==="events"&&canEditContent&&<AdminEventManager accessToken={accessToken} userId={userId} access={access}/>} {view==="content"&&tool==="opportunities"&&canEditContent&&<AdminOpportunityManager accessToken={accessToken} userId={userId}/>} {view==="content"&&tool==="approvals"&&canEditContent&&<AdminContentApprovalPanel accessToken={accessToken}/>} {view==="content"&&tool==="roadmap"&&canEditContent&&<AdminRoadmapManager accessToken={accessToken} userId={userId}/>} {view==="content"&&tool==="lore"&&canEditContent&&<AdminLoreCanonEditor accessToken={accessToken}/>} 
    {view==="support"&&tool==="requests"&&canEditContent&&<AdminOfficeRequestManager accessToken={accessToken} userId={userId}/>} {view==="support"&&tool==="tickets"&&canModerate&&<AdminSupportTicketManager accessToken={accessToken} userId={userId}/>} 
    {view==="systems"&&tool==="roleplay"&&(access.site_admin||canModerate)&&<AdminRoleplaySystemsManager accessToken={accessToken} access={access}/>} {view==="systems"&&tool==="continuity"&&access.site_admin&&<AdminContinuityArchiveManager accessToken={accessToken} userId={userId}/>} {view==="systems"&&tool==="roadmapOps"&&canEditContent&&<AdminRoadmapOperationsPanel accessToken={accessToken} userId={userId} canModerate={canModerate}/>} {view==="systems"&&tool==="transit"&&canEditContent&&<AdminCityTransitManager accessToken={accessToken}/>} {view==="systems"&&tool==="city"&&canEditContent&&<AdminCityLifecyclePanel accessToken={accessToken}/>} {view==="systems"&&tool==="community"&&canEditContent&&<AdminCommunityOperationsPanel accessToken={accessToken} userId={userId}/>} 
   </div>
  </main>
 </section>;
}
