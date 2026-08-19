"use client";

import {useEffect,useState} from "react";
import styles from "./DashboardShell.module.css";
import SchedulePanel from "./SchedulePanel";
import CourseworkPanel from "./CourseworkPanel";
import StudentAcademicRecordPanel from "./StudentAcademicRecordPanel";
import StudentActionSupportPanel from "./StudentActionSupportPanel";
import FacultyCourseManager from "./FacultyCourseManager";
import FacultyGradingPanel from "./FacultyGradingPanel";
import FacultyAdvisingPanel from "./FacultyAdvisingPanel";
import FacultyAttendanceReportPanel from "./FacultyAttendanceReportPanel";
import FacultyNurseDashboard from "./FacultyNurseDashboard";
import InboxPanel from "./InboxPanel";
import StudentActivitiesPanel from "./StudentActivitiesPanel";
import StudentOpportunityPanel from "./StudentOpportunityPanel";
import CharacterProfilePanel from "./CharacterProfilePanel";
import ProfileLookupPanel from "./ProfileLookupPanel";
import ProfileDesignWorkspace from "./ProfileDesignWorkspace";
import FriendsPanel from "./FriendsPanel";
import SchoolStatusPanel from "./SchoolStatusPanel";
import SchoolNoticesPanel from "./SchoolNoticesPanel";
import SchoolCalendarPanel from "./SchoolCalendarPanel";
import OfficeRequestPanel from "./OfficeRequestPanel";
import SupportTicketPanel from "./SupportTicketPanel";
import NotificationAccessibilityPanel from "./NotificationAccessibilityPanel";
import CommunityCenterPanel from "./CommunityCenterPanel";
import SchoolResourcesPanel from "./SchoolResourcesPanel";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
export type ActiveCharacter={id:string;slot:number;role:"student"|"faculty";display_name:string;handle:string;visibility:"private"|"friends_only"|"public";is_active:boolean};
type Props={character:ActiveCharacter|null;accessToken:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function DashboardShell({character,accessToken}:Props){
  const [nurseEligible,setNurseEligible]=useState(false);const [nurseMode,setNurseMode]=useState(false);
  useEffect(()=>{let cancelled=false;if(!character||character.role!=="faculty"){setNurseEligible(false);setNurseMode(false);return;}fetch(`${SUPABASE_URL}/rest/v1/rpc/current_faculty_has_special_role`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:character.id,requested_role:"nurse"})}).then(async response=>response.ok?Boolean(await response.json()):false).then(value=>{if(!cancelled)setNurseEligible(value);}).catch(()=>{if(!cancelled)setNurseEligible(false);});return()=>{cancelled=true;};},[accessToken,character]);
  if(!character)return <section className={styles.empty} aria-label="Dashboard unavailable"><p className="eyebrow">MY HANAMI DASHBOARD</p><h3>Create a character to open your school desk.</h3><p>Your dashboard stays locked until one of your two character slots is active.</p></section>;
  const isStudent=character.role==="student";
  if(!isStudent&&nurseEligible&&nurseMode)return <FacultyNurseDashboard accessToken={accessToken} characterId={character.id} displayName={character.display_name} onReturn={()=>setNurseMode(false)}/>;
  return <section className={styles.dashboard} aria-labelledby="dashboard-title">
    <div className={styles.hero}><div><p className="eyebrow">MY HANAMI • {isStudent?"STUDENT":"FACULTY"} DESK</p><h3 id="dashboard-title">Welcome back, {character.display_name}.</h3><p>@{character.handle} • {isStudent?"Student":"Faculty"} • Profile {character.visibility.replace("_"," ")}</p></div><div className={styles.identity}><span>ACTIVE CHARACTER</span><strong>SLOT {character.slot}</strong>{!isStudent&&nurseEligible&&<button type="button" onClick={()=>setNurseMode(true)} style={{marginTop:8,minHeight:32,padding:"6px 9px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>Switch to Nurse Dashboard</button>}</div></div>
    <div className={styles.notice}><strong>LIVE DASHBOARD</strong><span>{isStudent?"School status, notices, calendar, academics, Student Action & Support, notifications, community publishing, school resources, support, messaging, friends, and Profile Studio are connected to live Supabase data.":`School status, notices, calendar, course management, grading, advising, notifications, community publishing, school resources, support, messaging, friends, and Profile Studio are connected to live Supabase data.${nurseEligible?" Nurse Dashboard access is active for this Faculty character.":""}`}</span></div>
    <NotificationAccessibilityPanel accessToken={accessToken}/>
    <SchoolStatusPanel accessToken={accessToken}/>
    <SchoolNoticesPanel accessToken={accessToken}/>
    <SchoolCalendarPanel accessToken={accessToken} characterId={character.id}/>
    <SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/>
    {isStudent?<><CourseworkPanel accessToken={accessToken} characterId={character.id}/><StudentAcademicRecordPanel accessToken={accessToken} characterId={character.id}/><StudentActionSupportPanel accessToken={accessToken} characterId={character.id}/><StudentActivitiesPanel accessToken={accessToken} characterId={character.id}/><StudentOpportunityPanel accessToken={accessToken} characterId={character.id}/></>:<><FacultyCourseManager accessToken={accessToken} characterId={character.id}/><FacultyGradingPanel accessToken={accessToken} characterId={character.id}/><FacultyAttendanceReportPanel accessToken={accessToken} characterId={character.id}/><FacultyAdvisingPanel accessToken={accessToken} characterId={character.id}/></>}
    <CommunityCenterPanel accessToken={accessToken} characterId={character.id} role={character.role}/>
    <SchoolResourcesPanel accessToken={accessToken} characterId={character.id}/>
    <OfficeRequestPanel accessToken={accessToken} characterId={character.id}/>
    <SupportTicketPanel accessToken={accessToken} characterId={character.id}/>
    <InboxPanel accessToken={accessToken} characterId={character.id}/>
    <FriendsPanel accessToken={accessToken} characterId={character.id}/>
    <CharacterProfilePanel accessToken={accessToken} characterId={character.id} currentVisibility={character.visibility}/>
    <ProfileDesignWorkspace accessToken={accessToken} characterId={character.id}/>
    <ProfileLookupPanel accessToken={accessToken} viewerCharacterId={character.id}/>
    <div className={styles.quickbar}><strong>{isStudent?"STUDENT QUICK LINKS":"FACULTY QUICK LINKS"}</strong><span>{isStudent?"Notifications • Accessibility • Classes • Assignments • Academic Record • Homeroom • To-Do • Counseling • Health • Organizations • Elections • Forums • Bulletin Boards • Study Groups • Newspaper • Galleries • Forms • Documents • Handbook • Traditions • IT Help • Appeals • Bug Reports • Messages • Friends • Profile Studio":`Notifications • Accessibility • Classes • Rosters • Assignments • Attendance • Report Cards${nurseEligible?" • Nurse Dashboard":""} • Forums • Bulletin Boards • Newspaper • Galleries • Forms • Documents • Handbook • Traditions • IT Help • Appeals • Bug Reports • Messages • Friends • Profile Studio`}</span></div>
  </section>;
}
