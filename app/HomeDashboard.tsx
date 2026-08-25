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

const tabs:[Tab,string][]=[
 ["home","Home"],
 ["academics","Academics"],
 ["campus","Campus Life"],
 ["events","Events"],
 ["search","Search"],
];

export default function HomeDashboard({currentDate}:Props){
 const [tab,setTab]=useState<Tab>("home");
 return <main id="home" className={styles.shell}>
  <div className={styles.utilityBar}>
   <span>HANAMI HIGH SCHOOL · 花見高等学校 · HANAMI CITY · EST. 2006</span>
   <nav aria-label="Utility links">
    <button type="button" onClick={()=>setTab("search")}>Search</button>
    <a href="./calendar/">Calendar</a>
    <a href="./apply/">Apply</a>
    <a href="./portal/">Portal Login</a>
   </nav>
  </div>

  <header className={styles.masthead}>
   <div className={styles.brandBlock}>
    <img className={styles.crest} src="./hanami-high-portal-icon.png?v=20260825b" alt="Hanami High crest"/>
    <div>
     <p>PUBLIC SCHOOL NETWORK · ACADEMIC YEAR 2006</p>
     <h1>Hanami High School</h1>
     <span>Learn, bloom, and walk forward together.</span>
    </div>
   </div>
   <div className={styles.schoolMeta}>
    <strong data-hanami-roleplay-clock>{currentDate.toUpperCase()}</strong>
    <span>HANAMI CITY · JAPAN STANDARD TIME</span>
    <LiveSchoolStatus/>
   </div>
  </header>

  <nav className={styles.primaryNav} aria-label="Main public navigation">
   {tabs.map(([id,label])=><button key={id} type="button" className={tab===id?styles.activeNav:""} onClick={()=>setTab(id)}>{label}</button>)}
   <a href="./about/">About</a>
   <a href="./newspaper/">News</a>
   <a href="./organizations/">Directory</a>
  </nav>

  <div className={styles.pageFrame}>
   <div className={styles.breadcrumbs}>Hanami High / Public Network / <b>{tab==="home"?"Home":tab==="campus"?"Campus Life":tab[0].toUpperCase()+tab.slice(1)}</b></div>
   <LiveAnnouncements/>

   {tab==="home"&&<div className={styles.homeGrid}>
    <section className={styles.featureFrame}>
     <div className={styles.frameLabel}><span>FEATURED AT HANAMI</span><span>VOL. 01 · 2006</span></div>
     <div className={styles.featureContent}>
      <div className={styles.featureCopy}>
       <p className={styles.eyebrow}>WELCOME TO THE HANAMI HIGH SCHOOL NETWORK</p>
       <h2>A school day is more than a schedule.</h2>
       <p>Explore academics, student life, clubs, school traditions, news, and the stories shaping Hanami from one school network designed for our community.</p>
       <div className={styles.actions}>
        <button type="button" onClick={()=>setTab("academics")}>Explore academics</button>
        <a href="./newspaper/">Read the Chronicle</a>
        <a href="./apply/">Apply to Hanami</a>
       </div>
      </div>
      <aside className={styles.todayPanel}>
       <div className={styles.panelTitle}><h3>Today at Hanami</h3><span>LIVE</span></div>
       <p className={styles.dateLine} data-hanami-roleplay-clock>{currentDate.toUpperCase()}</p>
       <LiveNextEvent/>
      </aside>
     </div>
    </section>

    <section className={styles.quickStrip} aria-label="Quick access">
     <button type="button" onClick={()=>setTab("search")}><span>01</span><b>Hanami Search</b><small>Search the school network</small></button>
     <a href="./portal/"><span>02</span><b>Student Portal</b><small>Classes, messages, grades</small></a>
     <a href="./calendar/"><span>03</span><b>Calendar</b><small>Events and school dates</small></a>
     <a href="./guide/"><span>04</span><b>Website Guide</b><small>Learn every feature</small></a>
    </section>

    <section className={styles.columnGrid}>
     <article className={styles.notebookPanel}>
      <div className={styles.panelTitle}><h3>Hanami Bulletin</h3><a href="./newspaper/">View all →</a></div>
      <p className={styles.property}><b>Type</b><span>School news + announcements</span></p>
      <p className={styles.property}><b>Status</b><span>Updated live</span></p>
      <div className={styles.divider}/>
      <p>Read the latest school notices, Chronicle stories, featured announcements, and updates from around campus.</p>
      <a className={styles.textLink} href="./newspaper/">Open Hanami Chronicle →</a>
     </article>

     <article className={styles.notebookPanel}>
      <div className={styles.panelTitle}><h3>Student Life</h3><button type="button" onClick={()=>setTab("campus")}>Browse →</button></div>
      <p className={styles.property}><b>Includes</b><span>Clubs, jobs, activities</span></p>
      <p className={styles.property}><b>Community</b><span>Students + faculty</span></p>
      <div className={styles.divider}/>
      <p>Find organizations, extracurricular activities, leadership roles, internships, and other campus opportunities.</p>
      <button className={styles.textButton} type="button" onClick={()=>setTab("campus")}>Explore campus life →</button>
     </article>

     <article className={styles.notebookPanel}>
      <div className={styles.panelTitle}><h3>Quick Access</h3><span>DIRECTORY</span></div>
      <div className={styles.linkList}>
       <a href="./portal/">Student / Faculty / Admin Portal <span>→</span></a>
       <a href="./academics/">Course Guide <span>→</span></a>
       <a href="./organizations/">Clubs & Organizations <span>→</span></a>
       <a href="./rules/">Rules & Guidelines <span>→</span></a>
       <a href="./changelog/">Website Updates <span>→</span></a>
      </div>
     </article>
    </section>
   </div>}

   {tab==="academics"&&<section className={styles.contentPage}>
    <div className={styles.pageHeading}><p>ACADEMIC DIRECTORY</p><h2>Academics</h2><span>Courses, pathways, departments, guidance, and academic resources.</span></div>
    <div className={styles.databaseGrid}>
     <article><b>01</b><h3>Arts & Humanities</h3><p>Literature, history, languages, visual art, and music.</p></article>
     <article><b>02</b><h3>Science & Technology</h3><p>Laboratory science, mathematics, computing, and design.</p></article>
     <article><b>03</b><h3>Guidance & Pathways</h3><p>Graduation planning, counseling, internships, and careers.</p></article>
    </div>
    <a className={styles.pageAction} href="./academics/">Open full course guide →</a>
   </section>}

   {tab==="campus"&&<section className={styles.contentPage}>
    <div className={styles.pageHeading}><p>STUDENT LIFE DIRECTORY</p><h2>Campus Life</h2><span>Organizations, opportunities, activities, and student community.</span></div>
    <div className={styles.databaseGrid}>
     <article><b>Clubs</b><h3>Organizations</h3><p>Sports, academic, arts, service, and special-interest groups.</p><a href="./organizations/">View clubs →</a></article>
     <article><b>Work</b><h3>Opportunities</h3><p>Jobs, volunteering, internships, and student leadership opportunities.</p><a href="./campus-life/#jobs">See opportunities →</a></article>
     <article><b>Community</b><h3>School Life</h3><p>Events, traditions, student activities, and campus culture.</p><a href="./campus-life/">Open campus life →</a></article>
    </div>
   </section>}

   {tab==="events"&&<section className={styles.contentPage}>
    <div className={styles.pageHeading}><p>SCHOOL CALENDAR</p><h2>Upcoming Events</h2><span>What is happening next around Hanami High.</span></div>
    <LiveUpcomingEvents/>
    <a className={styles.pageAction} href="./calendar/">Open full calendar →</a>
   </section>}

   {tab==="search"&&<section className={styles.searchPage}>
    <SiteSearch/>
   </section>}
  </div>

  <footer className={styles.footer}>
   <span>HANAMI HIGH SCHOOL · PUBLIC SCHOOL NETWORK · 2006</span>
   <nav><a href="./about/">About</a><a href="./rules/">Rules</a><a href="./guide/">Guide</a><a href="./portal/">Portal</a></nav>
  </footer>
 </main>;
}
