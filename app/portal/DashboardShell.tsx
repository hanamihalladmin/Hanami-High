"use client";

import styles from "./DashboardShell.module.css";
import SchedulePanel from "./SchedulePanel";
import CourseworkPanel from "./CourseworkPanel";
import FacultyCourseManager from "./FacultyCourseManager";
import FacultyGradingPanel from "./FacultyGradingPanel";

export type ActiveCharacter={id:string;slot:number;role:"student"|"faculty";display_name:string;handle:string;visibility:"private"|"friends_only"|"public";is_active:boolean};

type Props={character:ActiveCharacter|null;accessToken:string};

const studentCards=[
  ["CAMPUS","Activities","Clubs, student government, and school events tied to this character."],
  ["MESSAGES","Hanami inbox","Private website-native conversations with classmates, faculty, and offices."],
] as const;

const facultyCards=[
  ["STUDENTS","Advising","Advisory information and approved student support tools for this character."],
  ["MESSAGES","Hanami inbox","Private website-native conversations with students, faculty, and offices."],
] as const;

export default function DashboardShell({character,accessToken}:Props){
  if(!character)return <section className={styles.empty} aria-label="Dashboard unavailable"><p className="eyebrow">MY HANAMI DASHBOARD</p><h3>Create a character to open your school desk.</h3><p>Your dashboard stays locked until one of your two character slots is active.</p></section>;
  const isStudent=character.role==="student";
  const cards=isStudent?studentCards:facultyCards;
  return <section className={styles.dashboard} aria-labelledby="dashboard-title">
    <div className={styles.hero}>
      <div><p className="eyebrow">MY HANAMI • {isStudent?"STUDENT":"FACULTY"} DESK</p><h3 id="dashboard-title">Welcome back, {character.display_name}.</h3><p>@{character.handle} • {isStudent?"Student":"Faculty"} • Profile {character.visibility.replace("_"," ")}</p></div>
      <div className={styles.identity}><span>ACTIVE CHARACTER</span><strong>SLOT {character.slot}</strong></div>
    </div>
    <div className={styles.notice}><strong>LIVE DASHBOARD</strong><span>Schedules are live for both roles. Student coursework supports drafts/submission; faculty can create assignments and return graded work. Remaining cards stay clearly marked until connected.</span></div>
    <SchedulePanel accessToken={accessToken} characterId={character.id} role={character.role}/>
    {isStudent?<CourseworkPanel accessToken={accessToken} characterId={character.id}/>:<><FacultyCourseManager accessToken={accessToken} characterId={character.id}/><FacultyGradingPanel accessToken={accessToken} characterId={character.id}/></>} 
    <div className={styles.grid}>{cards.map(([label,title,copy])=><article key={title}><span>{label}</span><h4>{title}</h4><p>{copy}</p><button type="button" disabled>Module coming next</button></article>)}</div>
    <div className={styles.quickbar}><strong>{isStudent?"STUDENT QUICK LINKS":"FACULTY QUICK LINKS"}</strong><span>{isStudent?"Classes • Assignments • Calendar • Campus • Messages":"Classes • Rosters • Assignments • Calendar • Messages"}</span></div>
  </section>;
}
