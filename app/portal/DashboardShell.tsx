"use client";

import {useCallback,useEffect,useState} from "react";
import styles from "./DashboardShell.module.css";
import SchedulePanel from "./SchedulePanel";
import CourseworkPanel from "./CourseworkPanel";
import StudentAcademicRecordPanel from "./StudentAcademicRecordPanel";
import StudentActionSupportPanel from "./StudentActionSupportPanel";
import StudentLifeSystemsPanel from "./StudentLifeSystemsPanel";
import DailySchoolBulletinPanel from "./DailySchoolBulletinPanel";
import ClassroomOperationsPanel from "./ClassroomOperationsPanel";
import ClassCompetitionExamPanel from "./ClassCompetitionExamPanel";
import SearchEverythingPanel from "./SearchEverythingPanel";
import FacultyCourseManager from "./FacultyCourseManager";
import FacultyGradingPanel from "./FacultyGradingPanel";
import FacultyAdvisingPanel from "./FacultyAdvisingPanel";
import FacultyAttendanceReportPanel from "./FacultyAttendanceReportPanel";
import FacultyNurseDashboard from "./FacultyNurseDashboard";
import FacultyLoungePanel from "./FacultyLoungePanel";
import MessageCenterPanel from "./MessageCenterPanel";
import MessageNotificationBadge from "./MessageNotificationBadge";
import StudentActivitiesPanel from "./StudentActivitiesPanel";
import StudentOpportunityPanel from "./StudentOpportunityPanel";
import CharacterProfilePanel from "./CharacterProfilePanel";
import ProfileLookupPanel from "./ProfileLookupPanel";
import ProfileDesignWorkspace from "./ProfileDesignWorkspace";
import PortalAppearancePanel from "./PortalAppearancePanel";
import FriendsPanel from "./FriendsPanel";
import SchoolStatusPanel from "./SchoolStatusPanel";
import SchoolNoticesPanel from "./SchoolNoticesPanel";
import SchoolCalendarPanel from "./SchoolCalendarPanel";
import OfficeRequestPanel from "./OfficeRequestPanel";
import SupportTicketPanel from "./SupportTicketPanel";
import NotificationAccessibilityPanel from "./NotificationAccessibilityPanel";
import CommunityCenterPanel from "./CommunityCenterPanel";
import RumorsBoardPanel from "./RumorsBoardPanel";
import SchoolResourcesPanel from "./SchoolResourcesPanel";
import SystemAnnouncementBanner from "./SystemAnnouncementBanner";
import CanvasTodoRail from "./CanvasTodoRail";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
export type ActiveCharacter={id:string;slot:number;role:"student"|"faculty";display_name:string;handle:string;visibility:"private"|"friends_only"|"public";is_active:boolean};
type Props={character:ActiveCharacter|null;accessToken:string;onLogout:()=>void};
type View="home"|"classes"|"calendar"|"messages"|"school"|"community"|"profile";
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function DashboardShell({character,accessToken,onLogout}:Props){
 const [nurseEligible,setNurseEligible]=useState(false);const [nurseMode,setNurseMode]=useState(false);const [view,setView]=useState<View>("home");const [avatarUrl,setAvatarUrl]=useState("");
 const loadAvatar=useCallback(async()=>{if(!character){setAvatarUrl("");return;}try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?select=profile_image_path&character_id=eq.${encodeURIComponent(character.id)}&limit=1`,{headers:headers(accessToken)});if(!response.ok)return;const row=(await response.json() as {profile_image_path:string|null}[])[0];if(!row?.profile_image_path){setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return "";});return;}const media=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(row.profile_image_path)}`,{headers:headers(accessToken)});if(!media.ok)return;const next=URL.createObjectURL(await media.blob());setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return next;});}catch{}},[accessToken,character]);
 useEffect(()=>{void loadAvatar();function refresh(event:Event){const target=(event as CustomEvent<{characterId?:string}>).detail?.characterId;if(!target||target===character?.id)void loadAvatar();}window.addEventListener("hanami-character-identity-changed",refresh);return()=>{window.removeEventListener("hanami-character-identity-changed",refresh);setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return "";});};},[character?.id,loadAvatar]);
 useEffect(()=>{let cancelled=false;if(!character||character.role!=="faculty"){setNurseEligible(false);setNurseMode(false);return;}fetch(`${SUPABASE_URL}/rest/v1/rpc/current_faculty_has_special_role`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:character.id,requested_role:"nurse"})}).then(async response=>response.ok?Boolean(await response.json()):false).then(value=>{if(!cancelled)setNurseEligible(value);}).catch(()=>{if(!cancelled)setNurseEligible(false);});return()=>{cancelled=true;};},[accessToken,character]);
 if(!character)return <section className={styles.empty}><h3>Create a character to open your school desk.</h3></section>;
 const isStudent=character.role==="student";
 if(!isStudent&&nurseEligible&&nurseMode)return <FacultyNurseDashboard accessToken={accessToken} characterId={character.id} displayName={character.display_name} onReturn={()=>setNurseMode(false)}/>;
 const nav:[View,string,string][]=[["profile","●","Account"],["home","⌂","Dashboard"],["classes","▣","Courses"],["calendar","□","Calendar"],["messages","✉","Inbox"],["school","◆","School"],["community","◎","Community"]];
 const pageTitle=view==="home"?"Dashboard":nav.find(item=>item[0]===view)?.[2]??"Dashboard";
 function openProfile(handle:string){setView("profile");window.setTimeout(()=>window.dispatchEvent(new CustomEvent("hanami-open-profile",{detail:{handle}})),50);}
 return <section className={styles.canvasShell} aria-labelledby="dashboard-title">
   <aside className={styles.globalNav} aria-label={`${isStudent?"Student":"Faculty"} global navigation`}><a className={styles.logoButton} href="../../" aria-label="Hanami High home"><img src="../../hanami-high-portal-icon.png" alt=""/></a><nav className={styles.primaryNav}>{nav.map(([key,icon,label])=><button key={key} type="button" className={view===key?styles.navActive:""} onClick={()=>setView(key)} title={label}><span className={styles.navIcon} aria-hidden="true">{key==="profile"?(avatarUrl?<img src={avatarUrl} alt=""/>:character.display_name.slice(0,1).toUpperCase()):icon}</span><b>{label}</b>{key==="messages"&&<MessageNotificationBadge accessToken={accessToken} characterId={character.id}/>}</button>)}</nav><div className={styles.navBottom}>{!isStudent&&nurseEligible&&<button type="button" onClick={()=>setNurseMode(true)}><span aria-hidden="true">✚</span><b>Nurse</b></button>}<a href="../"><span aria-hidden="true">↔</span><b>Switch</b></a><button type="button" onClick={onLogout}><span aria-hidden="true">⇥</span><b>Logout</b></button></div></aside>
   <main className={styles.main}><header className={styles.topbar}><div><p>{isStudent?"Student":"Faculty"} Portal</p><h1 id="dashboard-title">{pageTitle}</h1></div><button className={styles.identity} type="button" onClick={()=>openProfile(character.handle)} title="Open custom profile"><span className={styles.identityAvatar}>{avatarUrl?<img src={avatarUrl} alt=""/>:character.display_name.slice(0,1).toUpperCase()}</span><span><strong>{character.display_name}</strong><small>@{character.handle}</small></span></button></header><SystemAnnouncementBanner accessToken={accessToken} role={character.role}/>
    {view==="home"&&<div className={styles.dashboardView}><section className={styles.dashboardMain}><SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/><SchoolNoticesPanel accessToken={accessToken}/><div className={styles.secondaryWidgets}><DailySchoolBulletinPanel accessToken={accessToken} characterId={character.id}/><SchoolStatusPanel accessToken={accessToken}/></div></section><CanvasTodoRail accessToken={accessToken} characterId={character.id} role={character.role}/></div>}
    {view==="classes"&&<div className={styles.contentView}><div className={styles.pageIntro}><h2>{isStudent?"All Courses":"Teaching Courses"}</h2><p>Select a course to open its dedicated workspace.</p></div><SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/><div className={styles.featureStack}><ClassroomOperationsPanel accessToken={accessToken} characterId={character.id} role={character.role}/><ClassCompetitionExamPanel accessToken={accessToken} characterId={character.id} role={character.role}/>{isStudent?<CourseworkPanel accessToken={accessToken} characterId={character.id}/>:<><FacultyCourseManager accessToken={accessToken} characterId={character.id}/><FacultyGradingPanel accessToken={accessToken} characterId={character.id}/></>}</div></div>}
    {view==="calendar"&&<div className={styles.contentView}><div className={styles.pageIntro}><h2>Calendar</h2><p>School events and your course timetable.</p></div><SchoolCalendarPanel accessToken={accessToken} characterId={character.id}/><SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/></div>}
    {view==="messages"&&<div className={styles.contentView}><div className={styles.pageIntro}><h2>Inbox</h2><p>All Hanami school communication stays inside the portal.</p></div><MessageCenterPanel accessToken={accessToken} characterId={character.id}/></div>}
    {view==="school"&&<div className={styles.contentView}><div className={styles.pageIntro}><h2>{isStudent?"Academics & Support":"Teaching & School Operations"}</h2></div><StudentLifeSystemsPanel accessToken={accessToken} characterId={character.id} role={character.role}/>{isStudent?<><StudentAcademicRecordPanel accessToken={accessToken} characterId={character.id}/><StudentActionSupportPanel accessToken={accessToken} characterId={character.id}/></>:<><FacultyLoungePanel accessToken={accessToken} characterId={character.id}/><FacultyAttendanceReportPanel accessToken={accessToken} characterId={character.id}/><FacultyAdvisingPanel accessToken={accessToken} characterId={character.id}/></>}<OfficeRequestPanel accessToken={accessToken} characterId={character.id}/><SchoolResourcesPanel accessToken={accessToken} characterId={character.id}/><SupportTicketPanel accessToken={accessToken} characterId={character.id}/></div>}
    {view==="community"&&<div className={styles.contentView}><div className={styles.pageIntro}><h2>Community</h2><p>Campus life, activities, friends, and community spaces.</p></div>{isStudent&&<><StudentActivitiesPanel accessToken={accessToken} characterId={character.id}/><StudentOpportunityPanel accessToken={accessToken} characterId={character.id}/></>}<CommunityCenterPanel accessToken={accessToken} characterId={character.id} role={character.role}/><RumorsBoardPanel accessToken={accessToken} characterId={character.id}/><FriendsPanel accessToken={accessToken} characterId={character.id}/></div>}
    {view==="profile"&&<div className={styles.accountLayout}><aside className={styles.accountNav}><div className={styles.accountHero}><span className={styles.largeAvatar}>{avatarUrl?<img src={avatarUrl} alt=""/>:character.display_name.slice(0,1).toUpperCase()}</span><strong>{character.display_name}</strong><small>@{character.handle}</small></div><button type="button" onClick={()=>openProfile(character.handle)}>View public profile</button><a href="../">Switch character</a><button type="button" onClick={onLogout}>Logout</button></aside><section className={styles.accountContent}><div className={styles.pageIntro}><h2>Account</h2><p>Manage portal appearance and your character profile.</p></div><PortalAppearancePanel accessToken={accessToken} characterId={character.id} displayName={character.display_name} role={character.role}/><CharacterProfilePanel accessToken={accessToken} characterId={character.id} currentVisibility={character.visibility}/><ProfileDesignWorkspace accessToken={accessToken} characterId={character.id}/><ProfileLookupPanel accessToken={accessToken} viewerCharacterId={character.id}/><NotificationAccessibilityPanel accessToken={accessToken}/><SearchEverythingPanel accessToken={accessToken} characterId={character.id}/></section></div>}
   </main>
  </section>;
}
