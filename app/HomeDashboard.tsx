"use client";

import {useState} from "react";
import SiteSearch from "./components/site-search";
import LiveAnnouncements from "./components/live-announcements";
import LiveNextEvent from "./components/live-next-event";
import LiveUpcomingEvents from "./components/live-upcoming-events";
import LiveSchoolStatus from "./components/live-school-status";
import styles from "./Home.module.css";

type Tab="home"|"academics"|"campus"|"events"|"search";
type Props={currentDate:string};
const tabs:[Tab,string,string][]=[["home","⌂","Home"],["academics","▣","Academics"],["campus","✦","Campus Life"],["events","□","Events"],["search","⌕","Search"]];

export default function HomeDashboard({currentDate}:Props){
 const [tab,setTab]=useState<Tab>("home");
 return <main id="home" className={styles.shell}>
  <aside className={styles.rail} aria-label="Public website navigation">
   <button className={styles.logo} type="button" onClick={()=>setTab("home")}><img className={styles.logoImage} src="./hanami-high-portal-icon.png" alt="Hanami High"/><small>HANAMI HIGH</small></button>
   <nav>{tabs.map(([id,icon,label])=><button key={id} type="button" className={tab===id?styles.activeRail:""} onClick={()=>setTab(id)}><span className={styles.railIcon}>{icon}</span><b>{label}</b></button>)}</nav>
   <div className={styles.railLinks}><a href="./newspaper/"><span>▤</span><b>Newspaper</b></a><a href="./about/"><span>◎</span><b>About</b></a><a href="./rules/"><span>◆</span><b>Rules</b></a><a href="./apply/"><span>＋</span><b>Apply</b></a><a href="./changelog/"><span>↻</span><b>Updates</b></a><a href="./features/"><span>✦</span><b>Features</b></a></div>
   <div className={styles.railBottom}><a href="./portal/"><span className={styles.railIcon}>↪</span><b>Portal Login</b></a></div>
  </aside>
  <section className={styles.main}>
   <header className={styles.topbar}><div><p>PUBLIC SCHOOL NETWORK • EST. 2006</p><h1>HANAMI HIGH SCHOOL</h1></div><div className={styles.dateCard}><strong data-hanami-roleplay-clock>{currentDate.toUpperCase()}</strong><span>HANAMI CITY • JAPAN STANDARD TIME</span><LiveSchoolStatus/></div></header>
   <div className={styles.content}><LiveAnnouncements/>
    {tab==="home"&&<div className={styles.tabView}><section className={styles.hero}><div className={styles.heroMain}><p className={styles.eyebrow}>HANAMI HIGH • SCHOOL HOME</p><h2>A school day is more than a schedule.</h2><p>Explore academics, student life, clubs, school traditions, and the stories shaping Hanami from one compact school dashboard.</p><div className={styles.actions}><button type="button" onClick={()=>setTab("academics")}>Explore academics</button><a href="./newspaper/">Read the Chronicle</a><a href="./apply/">Apply to Hanami</a><a href="./portal/">Open portal</a><a href="./changelog/">See website updates</a></div></div><aside className={`${styles.card} ${styles.todayCard}`}><div className={styles.cardHeader}><h3>TODAY AT HANAMI</h3><span>LIVE</span></div><p><b data-hanami-roleplay-clock>{currentDate.toUpperCase()}</b></p><LiveNextEvent/></aside></section><section className={styles.quickRow}><button type="button" onClick={()=>setTab("academics")}><b>Academics</b><span>Courses and pathways →</span></button><button type="button" onClick={()=>setTab("campus")}><b>Campus Life</b><span>Clubs and opportunities →</span></button><a href="./newspaper/"><b>The Hanami Chronicle</b><span>Headlines, editorials, sports & school life →</span></a><a href="./portal/"><b>Portal</b><span>Student, Faculty, Admin & Owner →</span></a></section></div>}
    {tab==="academics"&&<section className={styles.focusCard}><div className={styles.cardHeader}><h3>ACADEMIC HIGHLIGHTS</h3><a href="./academics/">OPEN COURSE GUIDE →</a></div><div className={styles.academicGrid}><article><b>01</b><h4>Arts & Humanities</h4><p>Literature, history, languages, visual art, and music.</p></article><article><b>02</b><h4>Science & Technology</h4><p>Laboratory science, mathematics, computing, and design.</p></article><article><b>03</b><h4>Guidance & Pathways</h4><p>Graduation planning, counseling, internships, and careers.</p></article></div></section>}
    {tab==="campus"&&<section className={styles.focusCard}><div className={styles.cardHeader}><h3>CAMPUS LIFE</h3><a href="./campus-life/">OPEN CAMPUS LIFE →</a></div><div className={styles.liveWrap}><div><h3>Clubs & organizations</h3><p>Sports, academic, arts, service, and special-interest groups.</p><div className={styles.actions}><a href="./organizations/">View clubs</a></div></div><div><h3>Campus opportunities</h3><p>Jobs, volunteering, internships, and student leadership opportunities.</p><div className={styles.actions}><a href="./campus-life/#jobs">See opportunities</a></div></div></div></section>}
    {tab==="events"&&<section className={styles.focusCard}><div className={styles.cardHeader}><h3>UPCOMING EVENTS</h3><a href="./calendar/">FULL CALENDAR →</a></div><LiveUpcomingEvents/></section>}
    {tab==="search"&&<section className={styles.focusCard}><div className={styles.cardHeader}><h3>SEARCH HANAMI</h3><span>DIRECTORY</span></div><SiteSearch/></section>}
   </div>
  </section>
 </main>;
}
