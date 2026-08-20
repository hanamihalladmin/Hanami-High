"use client";

import type {ReactNode} from "react";
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
type Props={accessToken:string;userId:string;access:Access;ownerMode?:boolean;ownerOverview?:ReactNode;actions?:ReactNode};

export default function AdminWorkspace({accessToken,userId,access,ownerMode=false,ownerOverview,actions}:Props){
 const [view,setView]=useState<View>("home");const [tool,setTool]=useState<Tool>("overview");
 const canModerate=access.site_admin||access.moderator;const canEditContent=access.site_admin||access.content_editor;const hasAdminAccess=access.site_admin||access.content_editor||access.moderator;
 const nav:[View,string,string][]=[["home","⌂","Dashboard"],["classes","▣","Courses"],["people","●","People"],["content","◇","Content"],["support","?","Support"],["systems","⚙","Admin"]];
 const toolMap:Record<View,[Tool,string][]>= {home:[["overview","Overview"],["status","School Status"],["announcements","Announcements"]],classes:[["academics","Courses & Homerooms"],["deletion","Removal Tools"],["operations","Academic Operations"],["exams","Exams"]],people:[["directory","Directory"],["passes","Hall Passes"],["narrative","Narrative Review"],["moderation","Moderation"]],content:[["events","Events"],["opportunities","Opportunities"],["approvals","Approvals"],["roadmap","Roadmap"],["lore","Lore & Canon"]],support:[["requests","Office Requests"],["tickets","Support Tickets"]],systems:[["roleplay","Roleplay Systems"],["continuity","Continuity"],["roadmapOps","Roadmap Ops"],["transit","Transit"],["city","City Lifecycle"],["community","Community Ops"]]};
 function changeView(next:View){setView(next);setTool(toolMap[next][0][0]);}
 return <section className={styles.shell}>
  <aside className={styles.globalNav} aria-label={`${ownerMode?"Owner":"Administration"} global navigation`}><a className={styles.logoButton} href="../../" aria-label="Hanami High home"><img src="../../hanami-high-portal-icon.png" alt=""/></a><nav>{nav.map(([key,icon,label])=><button key={key} type="button" className={view===key?styles.active:""} onClick={()=>changeView(key)}><span aria-hidden="true">{icon}</span><b>{label}</b></button>)}</nav>{actions&&<div className={styles.globalActions}>{actions}</div>}</aside>
  <main className={styles.main}><header className={styles.header}><div><p>{ownerMode?"Owner":"Administration"} Portal</p><h1>{nav.find(item=>item[0]===view)?.[2]}</h1></div><span className={styles.badge}>{ownerMode?"OWNER":"ADMIN"}</span></header>
   <aside className={styles.secondaryNav} aria-label={`${view} tools`}><strong>{nav.find(item=>item[0]===view)?.[2]}</strong><nav>{toolMap[view].map(([key,label])=><button key={key} type="button" className={tool===key?styles.toolActive:""} onClick={()=>setTool(key)}>{label}</button>)}</nav></aside>
   <section className={styles.content}>
    {view==="home"&&tool==="overview"&&<><div className={styles.pageIntro}><h2>{ownerMode?"Owner Dashboard":"Administration Dashboard"}</h2><p>School management, status, and operational tools in one Canvas-style workspace.</p></div>{ownerMode&&ownerOverview}{access.site_admin&&<><AdminGovernancePanel accessToken={accessToken} ownerMode={ownerMode}/><AdminStaffAnalyticsPanel accessToken={accessToken}/></>}</>}
    {view==="home"&&tool==="status"&&<AdminSchoolStatusManager accessToken={accessToken} userId={userId} access={access}/>} {view==="home"&&tool==="announcements"&&<AdminAnnouncementManager accessToken={accessToken} userId={userId} access={access}/>} 
    {view==="classes"&&tool==="academics"&&access.site_admin&&<AdminAcademicManager accessToken={accessToken}/>} {view==="classes"&&tool==="deletion"&&access.site_admin&&<AdminDeletionManager accessToken={accessToken}/>} {view==="classes"&&tool==="operations"&&access.site_admin&&<AdminOperationsExpansionPanel accessToken={accessToken} userId={userId}/>} {view==="classes"&&tool==="exams"&&access.site_admin&&<AdminCompetitionExamManager accessToken={accessToken} userId={userId}/>} 
    {view==="people"&&tool==="directory"&&hasAdminAccess&&<AdminCharacterDirectory accessToken={accessToken}/>} {view==="people"&&tool==="passes"&&hasAdminAccess&&<AdminHallPassManager accessToken={accessToken}/>} {view==="people"&&tool==="narrative"&&hasAdminAccess&&<AdminNarrativeModerationPanel accessToken={accessToken}/>} {view==="people"&&tool==="moderation"&&canModerate&&<AdminModerationManager accessToken={accessToken} userId={userId} access={access}/>} 
    {view==="content"&&tool==="events"&&canEditContent&&<AdminEventManager accessToken={accessToken} userId={userId} access={access}/>} {view==="content"&&tool==="opportunities"&&canEditContent&&<AdminOpportunityManager accessToken={accessToken} userId={userId}/>} {view==="content"&&tool==="approvals"&&canEditContent&&<AdminContentApprovalPanel accessToken={accessToken}/>} {view==="content"&&tool==="roadmap"&&canEditContent&&<AdminRoadmapManager accessToken={accessToken} userId={userId}/>} {view==="content"&&tool==="lore"&&canEditContent&&<AdminLoreCanonEditor accessToken={accessToken}/>} 
    {view==="support"&&tool==="requests"&&canEditContent&&<AdminOfficeRequestManager accessToken={accessToken} userId={userId}/>} {view==="support"&&tool==="tickets"&&canModerate&&<AdminSupportTicketManager accessToken={accessToken} userId={userId}/>} 
    {view==="systems"&&tool==="roleplay"&&(access.site_admin||canModerate)&&<AdminRoleplaySystemsManager accessToken={accessToken} access={access}/>} {view==="systems"&&tool==="continuity"&&access.site_admin&&<AdminContinuityArchiveManager accessToken={accessToken} userId={userId}/>} {view==="systems"&&tool==="roadmapOps"&&canEditContent&&<AdminRoadmapOperationsPanel accessToken={accessToken} userId={userId} canModerate={canModerate}/>} {view==="systems"&&tool==="transit"&&canEditContent&&<AdminCityTransitManager accessToken={accessToken}/>} {view==="systems"&&tool==="city"&&canEditContent&&<AdminCityLifecyclePanel accessToken={accessToken}/>} {view==="systems"&&tool==="community"&&canEditContent&&<AdminCommunityOperationsPanel accessToken={accessToken} userId={userId}/>} 
   </section>
  </main>
 </section>;
}
