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
 return <PublicSchoolShell active="home" sectionTitle="PUBLIC NETWORK" breadcrumb="Home" stickyUtility lastUpdated="08.27.2026">
  <div className={styles.homeGrid}>
   <aside className={styles.leftRail}>
    <section className={styles.panel} id="search"><h2>🔎 SCHOOL SEARCH</h2><div className={styles.panelBody}><SiteSearch/></div></section>
    <section className={styles.panel}><h2>📢 ANNOUNCEMENTS</h2><nav className={styles.linkList}><a href="./whats-new/">What&apos;s New</a><a href="./calendar/">School Calendar</a><a href="./newspaper/">Hanami Chronicle</a><a href="./status/">Network Notices</a></nav></section>
    <section className={styles.panel}><h2>🔗 QUICK LINKS</h2><nav className={styles.linkList}><a href="./directory/">School Directory</a><a href="./newspaper/archive/">Chronicle Archive</a><a href="./gallery/">Photo Gallery</a><a href="./radio/">School Radio</a><a href="./homerooms/">Homerooms</a><a href="./yearbook/">Yearbook</a><a href="./club-sites/">Club Microsites</a><a href="./new-student/">FAQ / New Student Guide</a><a href="./webmaster/">Webmaster Page</a></nav></section>
    <section className={styles.panel}><h2>👤 NETWORK ACCESS</h2><div className={styles.loginBox}><a className={styles.primaryButton} href="./portal/">Student / Faculty Login</a><a href="./apply/">Apply to Hanami</a></div></section>
   </aside>

   <main className={styles.centerColumn}>
    <section className={`${styles.panel} ${styles.welcome}`}><h2>✿ WELCOME TO HANAMI HIGH SCHOOL</h2><div className={styles.welcomeBody}><div><p className={styles.dateLine}>HANAMI HIGH SCHOOL NETWORK · <span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></p><h3>A school day is more than a schedule.</h3><p>Explore academics, student life, school traditions, news, events, and community resources through a school website that still looks proudly at home in 2006.</p><div className={styles.actions}><a href="./about/">About Hanami</a><a href="./academics/">Explore Academics</a><a href="./campus-life/">Student Life</a></div></div><img src="./hanami-high-portal-icon.png" alt="Hanami High School logo"/></div></section>

    <section className={`${styles.panel} ${styles.announcement}`}><h2>★ FEATURED ANNOUNCEMENTS</h2><div className={styles.panelBody}><LiveAnnouncements/></div></section>

    <div className={styles.twoCol}>
     <section className={styles.panel}><h2>📰 HANAMI CHRONICLE</h2><div className={styles.panelBody}><p>School notices, feature stories, club updates, event coverage, and archived issues from the Hanami school newspaper.</p><a className={styles.textLink} href="./newspaper/">Read the latest Chronicle »</a><br/><a className={styles.textLink} href="./newspaper/archive/">Browse the newspaper archive »</a></div></section>
     <section className={styles.panel}><h2>📅 UPCOMING SCHOOL EVENTS</h2><div className={styles.panelBody}><LiveUpcomingEvents/></div></section>
    </div>

    <section className={styles.panel}><h2>🏫 TODAY AT HANAMI</h2><div className={styles.todayGrid}><div><strong>Current school network date</strong><span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></div><div><strong>Next school event</strong><LiveNextEvent/></div><div><strong>Academic resources</strong><a href="./academics/">Departments, courses & guidance »</a></div></div></section>

    <div className={styles.twoCol}>
     <section className={styles.panel}><h2>🌸 STUDENT LIFE</h2><div className={styles.panelBody}><p>Homerooms, yearbook, clubs, activities, school radio, community boards, Lost & Found, classifieds, polls, guestbooks, badges and more.</p><a className={styles.textLink} href="./campus-life/">Explore student life »</a></div></section>
     <section className={styles.panel}><h2>💬 COMMUNITY PARTICIPATION</h2><div className={styles.panelBody}><p>Signed-in students can vote in school polls, post Lost & Found notices and classifieds, RSVP to events, submit anonymous suggestions, and open help tickets.</p><a className={styles.textLink} href="./portal/">Sign in to use community tools »</a></div></section>
    </div>
   </main>

   <aside className={styles.rightRail}>
    <section className={styles.panel}><h2>❗ IMPORTANT / NETWORK STATUS</h2><div className={styles.panelBody}><LiveSchoolStatus/><VisitorNetworkStatus className={styles.visitor}/><a className={styles.textLink} href="./status/">Full maintenance & status page »</a></div></section>
    <section className={styles.panel}><h2>📡 RSS FEEDS</h2><nav className={styles.rssList}><a href="./feeds/">▣ The Chronicle</a><a href="./feeds/">▣ Announcements</a><a href="./feeds/">▣ Clubs & Activities</a><a href="./feeds/">▣ Website Updates</a></nav></section>
    <section className={styles.panel}><h2>✦ SCHOOL NETWORK</h2><nav className={styles.linkList}><a href="./directory/">Staff Directory</a><a href="./homerooms/">Homeroom Pages</a><a href="./yearbook/">Student Yearbook</a><a href="./club-sites/">Club Sites</a><a href="./gallery/">Photo Gallery</a><a href="./radio/">School Radio</a></nav></section>
    <section className={styles.panel}><h2>🛠 SITE INFORMATION</h2><dl className={styles.siteInfo}><div><dt>Network era</dt><dd>2006</dd></div><div><dt>Last updated</dt><dd>08/27/2026</dd></div><div><dt>Site tools</dt><dd><a href="./webmaster/">Webmaster</a></dd></div><div><dt>Support</dt><dd><a href="./support/">Report a Problem</a></dd></div></dl></section>
   </aside>
  </div>
 </PublicSchoolShell>;
}
