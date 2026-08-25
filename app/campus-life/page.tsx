import CampusDirectory from "../components/campus-directory";
import LiveCampusOpportunities from "../components/live-campus-opportunities";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const sideItems=[
 {id:"directory",label:"Clubs & Athletics",href:"/campus-life/#directory"},
 {id:"government",label:"Student Government",href:"/campus-life/#government"},
 {id:"events",label:"Events",href:"/calendar/"},
 {id:"gallery",label:"Gallery",href:"/campus-life/#gallery"},
 {id:"services",label:"Student Services",href:"/campus-life/#services"},
 {id:"jobs",label:"Opportunities",href:"/campus-life/#jobs"},
];

const services=[
 ["Health Office","First aid, health plans, wellness support, and referrals.","Student Services · Room 104"],
 ["Counseling","Private appointments for personal, social, and academic support.","Student Services · Room 108"],
 ["Library","Books, research help, quiet study, media, and technology lending.","Learning Commons · Levels 1–2"],
 ["Volunteer Center","School and community service projects with verified participation.","Student Life · Room 202"],
] as const;

export default function CampusLifePage(){
 return <PublicSchoolShell active="student-life" sectionTitle="STUDENT LIFE" breadcrumb="Campus Life" sideItems={sideItems} sideActive="directory" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>LIFE BEYOND THE CLASSROOM</small><h1>Find your people. Make campus yours.</h1><p>Join a club, compete with a team, serve the community, attend an event, or help build Hanami High traditions during the 2006 school year.</p></div>

  <section className={styles.section} id="directory"><div className={styles.sectionHead}><h2>Clubs & Athletics Directory</h2><span>LIVE DIRECTORY</span></div><div className={styles.sectionBody}><CampusDirectory/></div></section>

  <section className={styles.section} id="government"><div className={styles.sectionHead}><h2>Student Government</h2><span>VOICE · SERVICE · LEADERSHIP</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>Student Council</h3><p>Elected representatives coordinate student proposals, events, and campus initiatives.</p></article><article className={styles.card}><h3>Class Representatives</h3><p>Each class selects a representative to raise concerns and share announcements.</p></article><article className={styles.card}><h3>Broadcast Committee</h3><p>Student reporters publish notices, interviews, event coverage, and school-network features.</p></article></div></div></section>

  <section className={styles.section} id="events"><div className={styles.sectionHead}><h2>Campus Events</h2><span>2006 · JST</span></div><div className={styles.sectionBody}><div className={styles.timeline}><article><time>AUG 24</time><div><h3>Club Recruitment Week</h3><p>Meet student organizations in the courtyard after classes.</p></div></article><article><time>AUG 29</time><div><h3>Welcome Sports Day</h3><p>Open practices, team introductions, and friendly matches.</p></div></article><article><time>SEP 12</time><div><h3>Autumn Culture Festival</h3><p>Performances, class exhibits, club booths, art, and food.</p></div></article></div><div className={styles.note}>All campus schedules use Japan Standard Time. The complete live event list is available on the public calendar.</div></div></section>

  <section className={styles.section} id="gallery"><div className={styles.sectionHead}><h2>Campus Gallery</h2><span>STUDENT NETWORK ARCHIVE</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>Courtyard in Bloom</h3><p>Cherry trees and gathering spaces at the center of campus.</p></article><article className={styles.card}><h3>Culture Festival</h3><p>Class displays, performances, food stalls, and club showcases.</p></article><article className={styles.card}><h3>After-School Rooms</h3><p>Club meetings, rehearsals, study groups, and creative work after the bell.</p></article><article className={styles.card}><h3>Athletics Field</h3><p>Practices, sports-day events, and school competitions.</p></article></div></div></section>

  <section className={styles.section} id="services"><div className={styles.sectionHead}><h2>Student Services</h2><span>HEALTH · COUNSELING · LIBRARY</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{services.map(([title,copy,place])=><article className={styles.card} key={title}><h3>{title}</h3><p>{copy}</p><small>{place}</small></article>)}</div></div></section>

  <section className={styles.section} id="jobs"><div className={styles.sectionHead}><h2>Campus Opportunities</h2><span>JOBS · SERVICE · INTERNSHIPS · LEADERSHIP</span></div><div className={styles.sectionBody}><LiveCampusOpportunities/><div className={styles.note}>Only published opportunities appear publicly. Applications and status updates stay inside Hanami High; external email forms are not used.</div></div></section>
 </PublicSchoolShell>;
}
