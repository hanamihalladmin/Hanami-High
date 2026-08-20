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

export default function AdminWorkspace({accessToken,userId,access,ownerMode=false}:{accessToken:string;userId:string;access:Access;ownerMode?:boolean}){
 const [view,setView]=useState<View>("home");
 const canModerate=access.site_admin||access.moderator;
 const canEditContent=access.site_admin||access.content_editor;
 const hasAdminAccess=access.site_admin||access.content_editor||access.moderator;
 const nav:[View,string,string][]=[["home","⌂","Home"],["classes","▣","Classes"],["people","●","People"],["content","◇","Content"],["support","?","Support"],["systems","⚙","Systems"]];
 return <section className={styles.shell}>
  <aside className={styles.sidebar} aria-label="Administration navigation"><div className={styles.brand}><span className={styles.mark}>H</span><div><strong>Hanami High</strong><small>{ownerMode?"Owner Classroom":"Administration"}</small></div></div><nav className={styles.nav}>{nav.map(([key,icon,label])=><button key={key} type="button" className={view===key?styles.active:""} onClick={()=>setView(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav></aside>
  <main className={styles.main}><header className={styles.header}><div><p className="eyebrow">HANAMI CLASSROOM • ADMINISTRATION</p><h3>{nav.find(x=>x[0]===view)?.[2]}</h3></div><span className={styles.badge}>{ownerMode?"OWNER FULL ACCESS":"ADMIN TOOLS"}</span></header>
   {view==="home"&&<div className={styles.view}><div className={styles.intro}><p className="eyebrow">ADMIN STREAM</p><h2>School management at a glance</h2><p>Classes, people, announcements, support queues, and system operations are separated into Classroom-style work areas.</p></div>{access.site_admin&&<><AdminGovernancePanel accessToken={accessToken} ownerMode={ownerMode}/><AdminStaffAnalyticsPanel accessToken={accessToken}/></>}<AdminSchoolStatusManager accessToken={accessToken} userId={userId} access={access}/><AdminAnnouncementManager accessToken={accessToken} userId={userId} access={access}/></div>}
   {view==="classes"&&<div className={styles.view}><div className={styles.intro}><p className="eyebrow">CLASSES & HOMEROOMS</p><h2>Classroom Control Center</h2><p>Create, schedule, manage, and permanently remove class sections and homerooms from one place.</p></div>{access.site_admin&&<><AdminAcademicManager accessToken={accessToken}/><AdminDeletionManager accessToken={accessToken}/><AdminOperationsExpansionPanel accessToken={accessToken} userId={userId}/><AdminCompetitionExamManager accessToken={accessToken} userId={userId}/></>}</div>}
   {view==="people"&&<div className={styles.view}><div className={styles.intro}><p className="eyebrow">PEOPLE</p><h2>Students, faculty & moderation</h2></div>{hasAdminAccess&&<><AdminCharacterDirectory accessToken={accessToken}/><AdminHallPassManager accessToken={accessToken}/><AdminNarrativeModerationPanel accessToken={accessToken}/></>}{canModerate&&<AdminModerationManager accessToken={accessToken} userId={userId} access={access}/>}</div>}
   {view==="content"&&<div className={styles.view}><div className={styles.intro}><p className="eyebrow">CONTENT</p><h2>School publishing & events</h2></div>{canEditContent&&<><AdminEventManager accessToken={accessToken} userId={userId} access={access}/><AdminOpportunityManager accessToken={accessToken} userId={userId}/><AdminContentApprovalPanel accessToken={accessToken}/><AdminRoadmapManager accessToken={accessToken} userId={userId}/><AdminLoreCanonEditor accessToken={accessToken}/></>}</div>}
   {view==="support"&&<div className={styles.view}><div className={styles.intro}><p className="eyebrow">SUPPORT</p><h2>Requests, tickets & school services</h2></div>{canEditContent&&<AdminOfficeRequestManager accessToken={accessToken} userId={userId}/>} {canModerate&&<AdminSupportTicketManager accessToken={accessToken} userId={userId}/>}</div>}
   {view==="systems"&&<div className={styles.view}><div className={styles.intro}><p className="eyebrow">SYSTEMS</p><h2>Operations & roleplay systems</h2></div>{(access.site_admin||canModerate)&&<AdminRoleplaySystemsManager accessToken={accessToken} access={access}/>} {access.site_admin&&<AdminContinuityArchiveManager accessToken={accessToken} userId={userId}/>} {canEditContent&&<><AdminRoadmapOperationsPanel accessToken={accessToken} userId={userId} canModerate={canModerate}/><AdminCityTransitManager accessToken={accessToken}/><AdminCityLifecyclePanel accessToken={accessToken}/><AdminCommunityOperationsPanel accessToken={accessToken} userId={userId}/></>}</div>}
  </main>
 </section>;
}
