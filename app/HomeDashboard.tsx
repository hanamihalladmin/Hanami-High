"use client";

import SiteSearch from "./components/site-search";
import LiveAnnouncements from "./components/live-announcements";
import LiveNextEvent from "./components/live-next-event";
import LiveUpcomingEvents from "./components/live-upcoming-events";
import LiveSchoolStatus from "./components/live-school-status";
import PublicSchoolShell from "./components/PublicSchoolShell";
import VisitorNetworkStatus from "./components/VisitorNetworkStatus";
import styles from "./Home.module.css";

type Props={currentDate:string};

export default function HomeDashboard({currentDate}:Props){
 return <PublicSchoolShell active="home" sectionTitle="PUBLIC NETWORK" breadcrumb="Home" stickyUtility lastUpdated="09.05.2026">
  <div className={styles.page}>
   <section className={styles.hero}>
    <div className={styles.heroImage} role="img" aria-label="Hanami High School campus framed by cherry blossoms"/>
    <div className={styles.heroCopy}>
     <p className={styles.kicker}>花見高等学校 · HANAMI HIGH SCHOOL</p>
     <h1>Hanami High School</h1>
     <p className={styles.tagline}>Tradition · Learning · Community</p>
     <p className={styles.heroMeta}>School Network est. 2006 · <span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></p>
     <div className={styles.heroActions}><a href="./about/">About Hanami</a><a href="./academics/">Academics</a><a href="./portal/">Student / Faculty Login</a></div>
    </div>
   </section>

   <section className={styles.searchPanel} id="network-search"><div><p>HANAMI NETWORK SEARCH</p><span>Search school pages, people, clubs, news, rules and resources.</span></div><SiteSearch/></section>

   <div className={styles.layout}>
    <aside className={styles.leftRail}>
     <section className={styles.card}><h2>Quick Links</h2><nav className={styles.linkList}><a href="./calendar/">School Calendar</a><a href="./directory/">School Directory</a><a href="./newspaper/">Hanami Chronicle</a><a href="./homerooms/">Homeroom Pages</a><a href="./yearbook/">Student Yearbook</a><a href="./club-sites/">Club Microsites</a><a href="./gallery/">Photo Gallery</a><a href="./radio/">School Radio</a></nav></section>
     <section className={styles.card}><h2>Student Access</h2><div className={styles.stackButtons}><a className={styles.primaryButton} href="./portal/">Open School Portal</a><a href="./apply/">Apply to Hanami</a></div></section>
     <section className={styles.card}><h2>Site Tools</h2><nav className={styles.linkList}><a href="./new-student/">New Student Guide</a><a href="./status/">Network Status</a><a href="./webmaster/">Webmaster</a><a href="./support/">Report a Problem</a></nav></section>
    </aside>

    <main className={styles.mainColumn}>
     <section className={`${styles.card} ${styles.feature}`}><h2>Welcome to Hanami High</h2><div className={styles.featureBody}><div><p className={styles.dateLine}>HANAMI HIGH SCHOOL NETWORK · <span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></p><h3>A school day is more than a schedule.</h3><p>Explore academics, student life, traditions, news, events and community resources through a school website that still feels proudly at home in 2006.</p></div></div></section>

     <section className={styles.card}><h2>Featured Announcements</h2><div className={styles.cardBody}><LiveAnnouncements/></div></section>

     <div className={styles.twoColumn}>
      <section className={styles.card}><h2>Hanami Chronicle</h2><div className={styles.cardBody}><p>School notices, feature stories, club updates, event coverage and archived issues.</p><a className={styles.textLink} href="./newspaper/">Read the latest Chronicle »</a><br/><a className={styles.textLink} href="./newspaper/archive/">Browse the archive »</a></div></section>
      <section className={styles.card}><h2>Upcoming Events</h2><div className={styles.cardBody}><LiveUpcomingEvents/></div></section>
     </div>

     <section className={styles.card}><h2>Today at Hanami</h2><div className={styles.todayGrid}><div><strong>Current school date</strong><span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></div><div><strong>Next school event</strong><LiveNextEvent/></div><div><strong>Academic resources</strong><a href="./academics/">Departments, courses & guidance »</a></div></div></section>

     <div className={styles.twoColumn}>
      <section className={styles.card}><h2>Student Life</h2><div className={styles.cardBody}><p>Homerooms, yearbook, clubs, radio, community boards, Lost & Found, classifieds, polls, guestbooks and badges.</p><a className={styles.textLink} href="./campus-life/">Explore student life »</a></div></section>
      <section className={styles.card}><h2>Community Participation</h2><div className={styles.cardBody}><p>Signed-in students can vote in polls, RSVP to events, post notices, submit suggestions and open help tickets.</p><a className={styles.textLink} href="./portal/">Sign in to participate »</a></div></section>
     </div>
    </main>

    <aside className={styles.rightRail}>
     <section className={styles.card}><h2>Network Status</h2><div className={styles.cardBody}><LiveSchoolStatus/><VisitorNetworkStatus className={styles.visitor}/><a className={styles.textLink} href="./status/">Full status page »</a></div></section>
     <section className={styles.card}><h2>School Network</h2><nav className={styles.linkList}><a href="./directory/">Staff Directory</a><a href="./homerooms/">Homerooms</a><a href="./yearbook/">Yearbook</a><a href="./club-sites/">Club Sites</a><a href="./gallery/">Gallery</a><a href="./radio/">Radio</a></nav></section>
     <section className={styles.card}><h2>RSS / Updates</h2><nav className={styles.linkList}><a href="./feeds/">Chronicle Feed</a><a href="./feeds/">Announcements Feed</a><a href="./feeds/">Club Feed</a><a href="./whats-new/">What&apos;s New</a></nav></section>
    </aside>
   </div>
  </div>
 </PublicSchoolShell>;
}
