"use client";

import styles from "./DashboardShell.module.css";
import SchedulePanel from "./SchedulePanel";
import CourseworkPanel from "./CourseworkPanel";
import FacultyCourseManager from "./FacultyCourseManager";
import FacultyGradingPanel from "./FacultyGradingPanel";
import FacultyAdvisingPanel from "./FacultyAdvisingPanel";
import InboxPanel from "./InboxPanel";
import StudentActivitiesPanel from "./StudentActivitiesPanel";
import CharacterProfilePanel from "./CharacterProfilePanel";
import ProfileLookupPanel from "./ProfileLookupPanel";

export type ActiveCharacter={id:string;slot:number;role:"student"|"faculty";display_name:string;handle:string;visibility:"private"|"friends_only"|"public";is_active:boolean};

type Props={character:ActiveCharacter|null;accessToken:string};

export default function DashboardShell({character,accessToken}:Props){
  if(!character)return <section className={styles.empty} aria-label="Dashboard unavailable"><p className="eyebrow">MY HANAMI DASHBOARD</p><h3>Create a character to open your school desk.</h3><p>Your dashboard stays locked until one of your two character slots is active.</p></section>;
  const isStudent=character.role==="student";
  return <section className={styles.dashboard} aria-labelledby="dashboard-title">
    <div className={styles.hero}>
      <div><p className="eyebrow">MY HANAMI • {isStudent?"STUDENT":"FACULTY"} DESK</p><h3 id="dashboard-title">Welcome back, {character.display_name}.</h3><p>@{character.handle} • {isStudent?"Student":"Faculty"} • Profile {character.visibility.replace("_"," ")}</p></div>
      <div className={styles.identity}><span>ACTIVE CHARACTER</span><strong>SLOT {character.slot}</strong></div>
    </div>
    <div className={styles.notice}><strong>LIVE DASHBOARD</strong><span>{isStudent?"Student Schedule, Coursework, Campus Activities, Hanami Messages, Profile & Privacy, and Hanami Profiles are connected to live Supabase data.":"Faculty Schedule, Course Management, Grading, Student Advising, Hanami Messages, Profile & Privacy, and Hanami Profiles are connected to live Supabase data."}</span></div>
    <SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/>
    {isStudent?<><CourseworkPanel accessToken={accessToken} characterId={character.id}/><StudentActivitiesPanel accessToken={accessToken} characterId={character.id}/></>:<><FacultyCourseManager accessToken={accessToken} characterId={character.id}/><FacultyGradingPanel accessToken={accessToken} characterId={character.id}/><FacultyAdvisingPanel accessToken={accessToken} characterId={character.id}/></>}
    <InboxPanel accessToken={accessToken} characterId={character.id}/>
    <CharacterProfilePanel accessToken={accessToken} characterId={character.id} currentVisibility={character.visibility}/>
    <ProfileLookupPanel accessToken={accessToken} viewerCharacterId={character.id}/>
    <div className={styles.quickbar}><strong>{isStudent?"STUDENT QUICK LINKS":"FACULTY QUICK LINKS"}</strong><span>{isStudent?"Classes • Assignments • Calendar • Campus • Messages • Profile":"Classes • Rosters • Assignments • Calendar • Messages • Profile"}</span></div>
  </section>;
}
