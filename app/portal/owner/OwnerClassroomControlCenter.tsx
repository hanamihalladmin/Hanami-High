"use client";

import {useState} from "react";
import OwnerHomeroomScheduleEditor from "./OwnerHomeroomScheduleEditor";
import AdminAcademicManager from "../admin/AdminAcademicManager";
import AdminHomeroomManager from "../admin/AdminHomeroomManager";
import AdminClassDayChangesPanel from "../admin/AdminClassDayChangesPanel";
import AdminScheduleBlockManager from "../admin/AdminScheduleBlockManager";
import AdminOperationsExpansionPanel from "../admin/AdminOperationsExpansionPanel";
import AdminCompetitionExamManager from "../admin/AdminCompetitionExamManager";
import AdminDeletionManager from "../admin/AdminDeletionManager";
import styles from "./OwnerClassroomControlCenter.module.css";

type Tab="weekly"|"homerooms"|"courses"|"changes"|"blocks"|"operations"|"exams"|"removal";

export default function OwnerClassroomControlCenter({accessToken,userId}:{accessToken:string;userId:string}){
 const [tab,setTab]=useState<Tab>("weekly");
 const tabs:[Tab,string,string][]=[
  ["weekly","Weekly Scheduler","Assign each homeroom its Monday–Friday class timetable."],
  ["homerooms","Homerooms","Manage homeroom definitions, advisers, rooms, and placement."],
  ["courses","Courses & Sections","Manage course records and the A/B/C sections used by homeroom schedules."],
  ["changes","Day Changes","Apply one-day schedule exceptions without rewriting the normal week."],
  ["blocks","School Blocks","Manage non-class blocks and school-wide schedule items."],
  ["operations","Academic Operations","Run broader academic maintenance and management tools."],
  ["exams","Exams","Manage examination scheduling and competition exam tools."],
  ["removal","Removal Tools","Remove obsolete academic records carefully."],
 ];
 const active=tabs.find(item=>item[0]===tab)!;
 return <section className={styles.shell} aria-labelledby="classroom-control-title">
  <header className={styles.header}><div><p className="eyebrow">OWNER • ACADEMIC OPERATIONS</p><h2 id="classroom-control-title">Classroom Control Center</h2><p>The Owner classroom workspace is organized around the weekly homeroom timetable. Build the week first, then manage the course, homeroom, exception, and exam records that support it.</p></div><span>OWNER ONLY</span></header>
  <nav className={styles.tabs} aria-label="Classroom control tools">{tabs.map(([id,label,description])=><button type="button" key={id} className={tab===id?styles.active:""} onClick={()=>setTab(id)}><strong>{label}</strong><small>{description}</small></button>)}</nav>
  <div className={styles.context}><strong>{active[1]}</strong><span>{active[2]}</span></div>
  <div className={styles.workspace}>
   {tab==="weekly"&&<OwnerHomeroomScheduleEditor accessToken={accessToken}/>} 
   {tab==="homerooms"&&<AdminHomeroomManager accessToken={accessToken}/>} 
   {tab==="courses"&&<AdminAcademicManager accessToken={accessToken}/>} 
   {tab==="changes"&&<AdminClassDayChangesPanel accessToken={accessToken}/>} 
   {tab==="blocks"&&<AdminScheduleBlockManager accessToken={accessToken}/>} 
   {tab==="operations"&&<AdminOperationsExpansionPanel accessToken={accessToken} userId={userId}/>} 
   {tab==="exams"&&<AdminCompetitionExamManager accessToken={accessToken} userId={userId}/>} 
   {tab==="removal"&&<AdminDeletionManager accessToken={accessToken}/>} 
  </div>
 </section>;
}
