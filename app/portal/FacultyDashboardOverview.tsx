"use client";

import styles from "./FacultyDashboardOverview.module.css";

type Props={displayName:string};

function open(view:string,subView:string){window.dispatchEvent(new CustomEvent("hanami-portal-command",{detail:{view,subView}}));}

export default function FacultyDashboardOverview({displayName}:Props){
 const firstName=displayName.trim().split(/\s+/)[0]||"Faculty";
 return <section className={styles.wrap} aria-labelledby="faculty-workspace-title">
  <div className={styles.hero}>
   <div><p className={styles.eyebrow}>TODAY AT HANAMI</p><h2 id="faculty-workspace-title">Welcome back, {firstName}.</h2><p>Your teaching workspace keeps the actions that affect students closest to the top: classes, grading, attendance, schedule, and school mail.</p></div>
   <button type="button" onClick={()=>open("classes","overview")}>Open teaching classes →</button>
  </div>
  <div className={styles.actionGrid} aria-label="Faculty quick actions">
   <button type="button" onClick={()=>open("classes","grading")}><span>01</span><strong>Gradebook</strong><small>Review submissions, scores, and feedback.</small></button>
   <button type="button" onClick={()=>open("school","attendance")}><span>02</span><strong>Attendance</strong><small>Record and review class attendance.</small></button>
   <button type="button" onClick={()=>open("schedule","week")}><span>03</span><strong>Schedule</strong><small>See your assigned teaching sections and meeting times.</small></button>
   <button type="button" onClick={()=>open("messages","inbox")}><span>04</span><strong>Inbox</strong><small>Open internal Hanami school messages.</small></button>
  </div>
 </section>;
}
