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

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
export type ActiveCharacter={id:string;slot:number;role:"student"|"faculty";display_name:string;handle:string;visibility:"private"|"friends_only"|"public";is_active:boolean};
type Props={character:ActiveCharacter|null;accessToken:string};
type View="home"|"classes"|"calendar"|"messages"|"school"|"community"|"profile";
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function DashboardShell({character,accessToken}:Props){
 const [nurseEligible,setNurseEligible]=useState(false);const [nurseMode,setNurseMode]=useState(false);const [view,setView]=useState<View>("home");const [avatarUrl,setAvatarUrl]=useState("");
 const loadAvatar=useCallback(async()=>{if(!character){setAvatarUrl("");return;}try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?select=profile_image_path&character_id=eq.${encodeURIComponent(character.id)}&limit=1`,{headers:headers(accessToken)});if(!response.ok)return;const row=(await response.json() as {profile_image_path:string|null}[])[0];if(!row?.profile_image_path){setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return "";});return;}const media=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(row.profile_image_path)}`,{headers:headers(accessToken)});if(!media.ok)return;const next=URL.createObjectURL(await media.blob());setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return next;});}catch{}},[accessToken,character]);
 useEffect(()=>{void loadAvatar();function refresh(event:Event){const target=(event as CustomEvent<{characterId?:string}>).detail?.characterId;if(!target||target===character?.id)void loadAvatar();}window.addEventListener("hanami-character-identity-changed",refresh);return()=>{window.removeEventListener("hanami-character-identity-changed",refresh);setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return "";});};},[character?.id,loadAvatar]);
 useEffect(()=>{let cancelled=false;if(!character||character.role!=="faculty"){setNurseEligible(false);setNurseMode(false);return;}fetch(`${SUPABASE_URL}/rest/v1/rpc/current_faculty_has_special_role`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:character.id,requested_role:"nurse"})}).then(async response=>response.ok?Boolean(await response.json()):false).then(value=>{if(!cancelled)setNurseEligible(value);}).catch(()=>{if(!cancelled)setNurseEligible(false);});return()=>{cancelled=true;};},[accessToken,character]);
 if(!character)return <section className={styles.empty}><h3>Create a character to open your school desk.</h3></section>;
 const isStudent=character.role==="student";
 if(!isStudent&&nurseEligible&&nurseMode)return <FacultyNurseDashboard accessToken={accessToken} characterId={character.id} displayName={character.display_name} onReturn={()=>setNurseMode(false)}/>;
 const nav:[View,string,string][]=[["home","⌂","Dashboard"],["classes","▣","Courses"],["calendar","□","Calendar"],["messages","✉","Inbox"],["school","◆","School"],["community","◎","Community"],["profile","●","Account"]];
 function openProfile(handle:string){setView("profile");window.setTimeout(()=>window.dispatchEvent(new CustomEvent("hanami-open-profile",{detail:{handle}})),50);}
 return <section className={styles.classroomShell} aria-labelledby="dashboard-title">
   <aside className={styles.sidebar} aria-label={`${isStudent?"Student":"Faculty"} portal navigation`}>
    <div className={styles.brand}><span className={styles.brandMark}>H</span><div><strong>Hanami High</strong><small>{isStudent?"Student":"Faculty"}</small></div></div>
    <nav>{nav.map(([key,icon,label])=><button key={key} type="button" className={view===key?styles.navActive:""} onClick={()=>setView(key)} title={label}><span aria-hidden="true">{icon}</span><b>{label}</b>{key==="messages"&&<MessageNotificationBadge accessToken={accessToken} characterId={character.id}/>}</button>)}</nav>
    {!isStudent&&nurseEligible&&<button className={styles.nurseButton} type="button" onClick={()=>setNurseMode(true)}>Nurse</button>}
   </aside>
   <main className={styles.main}>
    <header className={styles.topbar}><div><p className="eyebrow">HANAMI HIGH • {isStudent?"STUDENT":"FACULTY"}</p><h3 id="dashboard-title">{view==="home"?"Dashboard":nav.find(x=>x[0]===view)?.[2]}</h3></div><button className={styles.identity} type="button" onClick={()=>openProfile(character.handle)} title="Open custom profile"><span className={styles.identityAvatar}>{avatarUrl?<img src={avatarUrl} alt=""/>:character.display_name.slice(0,1).toUpperCase()}</span><span className={styles.identityText}><strong>{character.display_name}</strong><small>@{character.handle}</small></span></button></header>
    <SystemAnnouncementBanner accessToken={accessToken} role={character.role}/>

    {view==="home"&&<div className={styles.view}>
      <section className={styles.classBanner}><div><span>{isStudent?"STUDENT DASHBOARD":"FACULTY DASHBOARD"}</span><h2>{isStudent?"Your courses and school activity":"Your courses and teaching activity"}</h2><p>Open courses, review announcements, and move between school tools from one LMS workspace.</p></div><button type="button" onClick={()=>setView("classes")}>View courses</button></section>
      <div className={styles.homeGrid}><div className={styles.primaryColumn}><DailySchoolBulletinPanel accessToken={accessToken} characterId={character.id}/><SchoolNoticesPanel accessToken={accessToken}/></div><aside className={styles.sideColumn}><SchoolStatusPanel accessToken={accessToken}/><SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/></aside></div>
    </div>}

    {view==="classes"&&<div className={styles.view}><div className={styles.sectionTitle}><div><p className="eyebrow">COURSES</p><h2>{isStudent?"All courses":"Teaching courses"}</h2><p>Open a course to view its stream, classwork, people, grades, and course information.</p></div></div><SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/><ClassroomOperationsPanel accessToken={accessToken} characterId={character.id} role={character.role}/><ClassCompetitionExamPanel accessToken={accessToken} characterId={character.id} role={character.role}/>{isStudent?<CourseworkPanel accessToken={accessToken} characterId={character.id}/>:<><FacultyCourseManager accessToken={accessToken} characterId={character.id}/><FacultyGradingPanel accessToken={accessToken} characterId={character.id}/></>}</div>}

    {view==="calendar"&&<div className={styles.view}><div className={styles.sectionTitle}><p className="eyebrow">CALENDAR</p><h2>Calendar</h2></div><SchoolCalendarPanel accessToken={accessToken} characterId={character.id}/><SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/></div>}

    {view==="messages"&&<div className={styles.view}><div className={styles.sectionTitle}><p className="eyebrow">INBOX</p><h2>Messages</h2><p>School communication stays inside Hanami.</p></div><MessageCenterPanel accessToken={accessToken} characterId={character.id}/></div>}

    {view==="school"&&<div className={styles.view}><div className={styles.sectionTitle}><p className="eyebrow">SCHOOL</p><h2>{isStudent?"Academics & support":"Teaching & school operations"}</h2></div><StudentLifeSystemsPanel accessToken={accessToken} characterId={character.id} role={character.role}/>{isStudent?<><StudentAcademicRecordPanel accessToken={accessToken} characterId={character.id}/><StudentActionSupportPanel accessToken={accessToken} characterId={character.id}/></>:<><FacultyLoungePanel accessToken={accessToken} characterId={character.id}/><FacultyAttendanceReportPanel accessToken={accessToken} characterId={character.id}/><FacultyAdvisingPanel accessToken={accessToken} characterId={character.id}/></>}<OfficeRequestPanel accessToken={accessToken} characterId={character.id}/><SchoolResourcesPanel accessToken={accessToken} characterId={character.id}/><SupportTicketPanel accessToken={accessToken} characterId={character.id}/></div>}

    {view==="community"&&<div className={styles.view}><div className={styles.sectionTitle}><p className="eyebrow">COMMUNITY</p><h2>Campus life</h2></div>{isStudent&&<><StudentActivitiesPanel accessToken={accessToken} characterId={character.id}/><StudentOpportunityPanel accessToken={accessToken} characterId={character.id}/></>}<CommunityCenterPanel accessToken={accessToken} characterId={character.id} role={character.role}/><RumorsBoardPanel accessToken={accessToken} characterId={character.id}/><FriendsPanel accessToken={accessToken} characterId={character.id}/></div>}

    {view==="profile"&&<div className={styles.view}><div className={styles.sectionTitle}><p className="eyebrow">ACCOUNT</p><h2>{character.display_name}</h2><p>Manage your portal appearance and your character&apos;s custom profile.</p></div><PortalAppearancePanel accessToken={accessToken} characterId={character.id} displayName={character.display_name} role={character.role}/><CharacterProfilePanel accessToken={accessToken} characterId={character.id} currentVisibility={character.visibility}/><ProfileDesignWorkspace accessToken={accessToken} characterId={character.id}/><ProfileLookupPanel accessToken={accessToken} viewerCharacterId={character.id}/><NotificationAccessibilityPanel accessToken={accessToken}/><SearchEverythingPanel accessToken={accessToken} characterId={character.id}/></div>}
   </main>
  </section>;
}
