"use client";

import SiteSearch from "./components/site-search";
import LiveAnnouncements from "./components/live-announcements";
import LiveNextEvent from "./components/live-next-event";
import LiveUpcomingEvents from "./components/live-upcoming-events";
import LiveSchoolStatus from "./components/live-school-status";
import PublicSchoolShell from "./components/PublicSchoolShell";
import VisitorNetworkStatus from "./components/VisitorNetworkStatus";
import styles from "./Home.module.css";

type Props = { currentDate: string };

export default function HomeDashboard({ currentDate }: Props) {
  return (
    <PublicSchoolShell active="home" sectionTitle="PUBLIC NETWORK" breadcrumb="Home" stickyUtility lastUpdated="09.05.2026">
      <section className={styles.searchBand} id="network-search" aria-labelledby="search-title">
        <div>
          <p className={styles.eyebrow}>HANAMI HIGH SCHOOL NETWORK</p>
          <h2 id="search-title">Search the school network</h2>
          <p>Find school pages, courses, clubs, news, staff, events, and resources.</p>
        </div>
        <SiteSearch />
      </section>

      <div className={styles.homeGrid}>
        <aside className={styles.leftRail} aria-label="Homepage quick links">
          <section className={styles.panel}>
            <h2>QUICK LINKS</h2>
            <nav className={styles.linkList}>
              <a href="./apply/">Apply to Hanami</a>
              <a href="./calendar/">School Calendar</a>
              <a href="./directory/">Faculty & Staff Directory</a>
              <a href="./new-student/">New Student Guide</a>
              <a href="./club-sites/">Clubs & Activities</a>
              <a href="./yearbook/">Yearbook</a>
              <a href="./rules/">Rules & Policies</a>
              <a href="./portal/">Portal Login</a>
            </nav>
          </section>

          <section className={styles.panel}>
            <h2>ACADEMICS</h2>
            <nav className={styles.linkList}>
              <a href="./academics/">Academic Overview</a>
              <a href="./academics/">Departments</a>
              <a href="./academics/">Courses</a>
              <a href="./calendar/">Academic Calendar</a>
            </nav>
          </section>

          <section className={styles.admissionsCard}>
            <span className={styles.smallLabel}>ADMISSIONS</span>
            <h2>Interested in Hanami High?</h2>
            <p>Learn how the community works, review the character guide, and begin the joining process.</p>
            <div className={styles.stackActions}><a href="./apply/">How to Join</a><a href="./new-student/">New Student Guide</a></div>
          </section>
        </aside>

        <main className={styles.centerColumn}>
          <section className={`${styles.panel} ${styles.welcome}`}>
            <h2>WELCOME TO HANAMI HIGH SCHOOL</h2>
            <div className={styles.welcomeBody}>
              <p className={styles.dateLine}>HANAMI HIGH SCHOOL NETWORK · <span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></p>
              <h3>A school day is more than a schedule.</h3>
              <p>Explore Hanami academics, student life, school traditions, community resources, news, and events through a school network that feels proudly at home in 2006.</p>
              <div className={styles.actions}><a href="./about/">About Hanami</a><a href="./academics/">Explore Academics</a><a href="./campus-life/">Student Life</a></div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.announcement}`}>
            <h2>IMPORTANT ANNOUNCEMENT</h2>
            <div className={styles.panelBody}><LiveAnnouncements /></div>
          </section>

          <div className={styles.twoCol}>
            <section className={styles.panel}>
              <h2>LATEST NEWS · HANAMI CHRONICLE</h2>
              <div className={styles.panelBody}>
                <p>School notices, feature stories, club updates, event coverage, and archived issues from the Hanami school newspaper.</p>
                <a className={styles.textLink} href="./newspaper/">Read the latest Chronicle »</a>
                <a className={styles.textLink} href="./newspaper/archive/">Browse the archive »</a>
              </div>
            </section>
            <section className={styles.panel}>
              <h2>UPCOMING SCHOOL EVENTS</h2>
              <div className={styles.panelBody}><LiveUpcomingEvents /></div>
            </section>
          </div>

          <section className={styles.panel}>
            <h2>TODAY AT HANAMI</h2>
            <div className={styles.todayGrid}>
              <div><strong>School network date</strong><span data-hanami-roleplay-clock>{currentDate.toUpperCase()}</span></div>
              <div><strong>Next school event</strong><LiveNextEvent /></div>
              <div><strong>School status</strong><LiveSchoolStatus /></div>
            </div>
          </section>

          <section className={styles.panel}>
            <h2>STUDENT LIFE</h2>
            <div className={styles.studentLifeGrid}>
              <a href="./club-sites/"><b>Clubs</b><span>Explore club microsites and activities.</span></a>
              <a href="./yearbook/"><b>Yearbook</b><span>Browse approved school memories and pages.</span></a>
              <a href="./gallery/"><b>Gallery</b><span>View approved campus and event photos.</span></a>
              <a href="./radio/"><b>School Radio</b><span>See programs, schedules, and school broadcasts.</span></a>
            </div>
          </section>
        </main>

        <aside className={styles.rightRail} aria-label="School network information">
          <section className={styles.panel}>
            <h2>SCHOOL STATUS</h2>
            <div className={styles.panelBody}><LiveSchoolStatus /><VisitorNetworkStatus className={styles.visitor} /><a className={styles.textLink} href="./status/">Full network status »</a></div>
          </section>

          <section className={styles.panel}>
            <h2>UPCOMING</h2>
            <div className={styles.panelBody}><LiveNextEvent /></div>
          </section>

          <section className={styles.panel}>
            <h2>WHAT&apos;S NEW</h2>
            <nav className={styles.linkList}>
              <a href="./whats-new/">Website Updates</a>
              <a href="./newspaper/">Latest Chronicle</a>
              <a href="./calendar/">School Calendar</a>
            </nav>
          </section>

          <section className={styles.panel}>
            <h2>SCHOOL NETWORK</h2>
            <nav className={styles.linkList}>
              <a href="./feeds/">RSS Feeds</a>
              <a href="./status/">Network Status</a>
              <a href="./webmaster/">Webmaster</a>
              <a href="./support/">Report a Problem</a>
            </nav>
          </section>
        </aside>
      </div>
    </PublicSchoolShell>
  );
}
