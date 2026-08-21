import SiteSearch from "./components/site-search";
import LiveAnnouncements from "./components/live-announcements";
import LiveNextEvent from "./components/live-next-event";
import LiveUpcomingEvents from "./components/live-upcoming-events";
import LiveSchoolStatus from "./components/live-school-status";
import {hanamiRoleplayDate} from "./components/roleplay-date";
import styles from "./Home.module.css";

const navigation=[["⌂","Home","#home"],["◎","About","./about/"],["▣","Academics","./academics/"],["✦","Campus Life","./campus-life/"],["□","Calendar","./calendar/"],["◆","Rules","./rules/"],["+","Apply","./apply/"]] as const;

export default function Home(){
 const currentDate=hanamiRoleplayDate();
 return <main id="home" className={styles.shell}>
  <aside className={styles.rail} aria-label="Public website navigation">
   <a className={styles.logo} href="#home"><span className={styles.logoMark}>花</span><small>HANAMI HIGH</small></a>
   <nav>{navigation.map(([icon,label,href])=><a key={label} href={href}><span className={styles.railIcon}>{icon}</span><b>{label}</b></a>)}</nav>
   <div className={styles.railBottom}><a href="./portal/"><span className={styles.railIcon}>↪</span><b>Portal Login</b></a></div>
  </aside>
  <section className={styles.main}>
   <header className={styles.topbar}><div><p>PUBLIC SCHOOL NETWORK • EST. 1836</p><h1>Hanami High School</h1></div><div className={styles.dateCard}><strong>{currentDate.toUpperCase()}</strong><LiveSchoolStatus/></div></header>
   <div className={styles.content}>
    <LiveAnnouncements/>
    <section className={styles.hero} aria-labelledby="welcome-heading">
     <div className={styles.heroMain}><p className={styles.eyebrow}>HANAMI HIGH • SCHOOL HOME</p><h2 id="welcome-heading">A school day is more than a schedule.</h2><p>Explore academics, student life, clubs, school traditions, and the stories shaping Hanami this semester from one cleaner school dashboard.</p><div className={styles.actions}><a href="./academics/">Explore academics</a><a href="./apply/">Apply to Hanami</a><a href="./portal/">Open portal</a></div></div>
     <aside className={`${styles.card} ${styles.todayCard}`}><div className={styles.cardHeader}><h3>Today at Hanami</h3><span>LIVE</span></div><p><b>{currentDate.toUpperCase()}</b></p><p>Hanami City • Japan Standard Time<br/>Roleplay year • 2006</p><LiveNextEvent/></aside>
    </section>
    <div className={styles.dashboardGrid}>
     <section className={styles.wideCard}><div className={styles.cardHeader}><h3>Academic highlights</h3><span>COURSE GUIDE</span></div><div className={styles.academicGrid}><article><b>01</b><h4>Arts & Humanities</h4><p>Literature, history, languages, visual art, and music.</p></article><article><b>02</b><h4>Science & Technology</h4><p>Laboratory science, mathematics, computing, and design.</p></article><article><b>03</b><h4>Guidance & Pathways</h4><p>Graduation planning, counseling, internships, and careers.</p></article></div></section>
     <section className={styles.card}><div className={styles.cardHeader}><h3>Quick links</h3><span>EXPLORE</span></div><div className={styles.linkGrid}><a href="./about/">About Hanami</a><a href="./academics/">Academics</a><a href="./campus-life/#directory">Clubs</a><a href="./calendar/">Calendar</a><a href="./rules/">Rules</a><a href="./apply/">Apply</a></div></section>
     <section className={`${styles.card} ${styles.searchWrap}`}><div className={styles.cardHeader}><h3>Search Hanami</h3><span>DIRECTORY</span></div><SiteSearch/></section>
     <section className={styles.wideCard}><div className={styles.cardHeader}><h3>Campus life</h3><span>AFTER THE BELL</span></div><div className={styles.liveWrap}><div><h3>Clubs & organizations</h3><p>Sports, academic, arts, service, and special-interest groups all in one directory.</p><div className={styles.actions}><a href="./campus-life/#directory">View clubs</a></div></div><div><h3>Campus opportunities</h3><p>Jobs, volunteering, internships, and student leadership opportunities published through Hanami.</p><div className={styles.actions}><a href="./campus-life/#jobs">See opportunities</a></div></div></div></section>
     <section className={styles.card}><div className={styles.cardHeader}><h3>Upcoming events</h3><span>SCHOOL CALENDAR</span></div><LiveUpcomingEvents/></section>
    </div>
    <footer className={styles.footer}><p>HANAMI HIGH SCHOOL • 花見高等学校 • HANAMI CITY • 2006</p><nav><a href="./apply/">Apply</a><a href="./rules/">Rules</a><a href="./about/#contact">Contact</a><a href="./portal/help/">Portal Help</a></nav></footer>
   </div>
  </section>
 </main>;
}
