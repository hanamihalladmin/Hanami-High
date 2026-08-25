"use client";

import SiteSearch from "./components/site-search";
import LiveAnnouncements from "./components/live-announcements";
import LiveNextEvent from "./components/live-next-event";
import LiveUpcomingEvents from "./components/live-upcoming-events";
import LiveSchoolStatus from "./components/live-school-status";
import PublicSchoolShell from "./components/PublicSchoolShell";
import VisitorNetworkStatus from "./components/VisitorNetworkStatus";
import styles from "./PublicRebuild.module.css";

type Props={currentDate:string};

export default function HomeDashboard({currentDate}:Props){
 return <PublicSchoolShell active="home" sectionTitle="PUBLIC NETWORK" breadcrumb="Home" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.stack}>
   <LiveAnnouncements/>

   <section className={styles.welcome} aria-labelledby="home-welcome-title">
    <small>WELCOME TO THE HANAMI HIGH SCHOOL NETWORK · {currentDate.toUpperCase()}</small>
    <h2 id="home-welcome-title">A school day is more than a schedule.</h2>
    <p>Explore academics, student life, school traditions, news, events, and community resources from one intentionally old-school Hanami network.</p>
    <div className={styles.welcomeActions}>
     <a href="./academics/">Explore Academics</a>
     <a href="./newspaper/">Read the Chronicle</a>
     <a href="./apply/">Apply to Hanami</a>
    </div>
   </section>

   <VisitorNetworkStatus className={styles.networkStatus}/>

   <div className={styles.homeIntro}>
    <aside className={styles.quick}>
     <h3>QUICK LINKS</h3>
     <nav>
      <a href="#search">Hanami Search</a>
      <a href="./portal/">Student / Staff Portals</a>
      <a href="./calendar/">School Calendar</a>
      <a href="./organizations/">Clubs & Directory</a>
      <a href="./rules/">Rules & Guidelines</a>
      <a href="./guide/">Website Guide</a>
     </nav>
    </aside>

    <section className={styles.box}>
     <div className={styles.boxHead}><h3>Today at Hanami</h3><span>LIVE SCHOOL STATUS</span></div>
     <div className={styles.boxBody}>
      <p><strong data-hanami-roleplay-clock>{currentDate.toUpperCase()}</strong> · Hanami City · Japan Standard Time</p>
      <LiveSchoolStatus/>
      <LiveNextEvent/>
     </div>
    </section>
   </div>

   <div className={styles.threeCol}>
    <section className={styles.box}><div className={styles.boxHead}><h3>Academic Highlights</h3><a href="./academics/">View academics →</a></div><div className={styles.boxBody}><p>Browse departments, course offerings, graduation requirements, school-year dates, honors pathways, and guidance resources.</p></div></section>
    <section className={styles.box}><div className={styles.boxHead}><h3>Student Life</h3><a href="./campus-life/">Explore →</a></div><div className={styles.boxBody}><p>Find clubs, school activities, student opportunities, events, campus culture, and community resources.</p></div></section>
    <section className={styles.box}><div className={styles.boxHead}><h3>Hanami Chronicle</h3><a href="./newspaper/">Open news →</a></div><div className={styles.boxBody}><p>School notices, feature stories, announcements, and updates from around campus in one public archive.</p></div></section>
   </div>

   <section className={styles.box}><div className={styles.boxHead}><h3>Upcoming School Events</h3><a href="./calendar/">Full calendar →</a></div><div className={styles.boxBody}><LiveUpcomingEvents/></div></section>

   <section className={styles.searchBox} id="search">
    <h3 className={styles.searchBoxTitle}>Hanami Search</h3>
    <SiteSearch/>
    <div className={styles.sitemap}>
     <h4>COMPACT SCHOOL NETWORK SITEMAP</h4>
     <nav aria-label="Compact site map">
      <a href="./about/">About</a><a href="./academics/">Academics</a><a href="./campus-life/">Student Life</a><a href="./calendar/">Calendar</a><a href="./apply/">Admissions</a><a href="./newspaper/">Chronicle</a><a href="./organizations/">Directory</a><a href="./rules/">Rules</a><a href="./guide/">Guide</a><a href="./changelog/">Change Log</a><a href="./portal/">Portals</a>
     </nav>
    </div>
   </section>
  </div>
 </PublicSchoolShell>;
}
