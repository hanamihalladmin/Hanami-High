import FacultyDirectory from "../components/faculty-directory";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const sideItems=[
  {id:"story",label:"Our Story",href:"/about/#story"},
  {id:"mission",label:"Mission & Values",href:"/about/#mission"},
  {id:"leadership",label:"Leadership",href:"/about/#leadership"},
  {id:"traditions",label:"Traditions",href:"/about/#traditions"},
  {id:"profile",label:"School Profile",href:"/about/#profile"},
  {id:"directory",label:"Faculty & Staff",href:"/about/#directory"},
  {id:"contact",label:"Contact",href:"/about/#contact"},
];

const traditions=[
  ["APRIL","First Bloom Assembly","The new school year opens beneath the courtyard cherry trees."],
  ["SEPTEMBER","Autumn Culture Festival","Clubs, classes, and performers transform campus for a full community day."],
  ["DECEMBER","Lantern Walk","Students recognize the people who helped them grow during the year."],
  ["MARCH","Petal Farewell","Graduating students leave a written wish in the school archive."],
] as const;

export default function AboutPage(){
 return <PublicSchoolShell active="about" sectionTitle="ABOUT HANAMI" breadcrumb="About Hanami" sideItems={sideItems} sideActive="story" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>HANAMI HIGH · SCHOOL PROFILE</small><h1>About Hanami High</h1><p>Founded in 1836 and represented here through the school network&apos;s 2006 edition, Hanami carries a long institutional history into a new academic year.</p></div>

  <section className={styles.section} id="story"><div className={styles.sectionHead}><h2>Our Story</h2><span>1836–2006</span></div><div className={styles.sectionBody}><p>Hanami began in 1836 as an ordinary local school and grew steadily through the nineteenth century. The Meiji Restoration of 1868 accelerated that growth, helping Hanami earn a reputation as one of the area&apos;s better-known schools.</p><p>In 1885, Headmistress Sakura Kawasaki took control during a difficult period for the school and surrounding district. Her leadership rebuilt Hanami around discipline, resilience, and order.</p><p>The school endured wartime upheaval and the postwar years. In 1952, Nora Kawasaki became headmistress, continuing the family&apos;s strict approach while improving the school&apos;s organization and public reputation. In 2006, Principal Akira inherits that complicated legacy as the first male head of Hanami High since before Sakura&apos;s tenure.</p><div className={styles.note}>School founded: <strong>1836</strong> · Current roleplay/network era: <strong>2006</strong>. These dates now describe different parts of Hanami&apos;s identity rather than conflicting with each other.</div></div></section>

  <section className={styles.section} id="mission"><div className={styles.sectionHead}><h2>Mission & Values</h2><span>WHAT GUIDES US</span></div><div className={styles.sectionBody}><p>Our mission is to help every student become a capable learner, a grounded individual, and an active member of their community.</p><div className={styles.cardGrid}><article className={styles.card}><h3>Curiosity</h3><p>Learn boldly, ask thoughtful questions, and share what you discover.</p></article><article className={styles.card}><h3>Character</h3><p>Act with courage, accountability, kindness, and respect for the community.</p></article><article className={styles.card}><h3>Connection</h3><p>Build friendships across classrooms, clubs, teams, and generations.</p></article></div></div></section>

  <section className={styles.section} id="leadership"><div className={styles.sectionHead}><h2>School Leadership</h2><span>OFFICE DIRECTORY</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>Principal Akira</h3><p>Current headmaster of Hanami High and the first male principal since before Sakura Kawasaki&apos;s tenure began in 1885.</p><small>HEAD OF SCHOOL</small></article><article className={styles.card}><h3>Student Life Office</h3><p>Clubs, conduct, attendance support, events, and student wellbeing.</p><small>STUDENT AFFAIRS</small></article></div></div></section>

  <section className={styles.section} id="traditions"><div className={styles.sectionHead}><h2>Hanami Traditions</h2><span>ANNUAL SCHOOL CULTURE</span></div><div className={styles.sectionBody}><div className={styles.timeline}>{traditions.map(([month,title,copy])=><article key={title}><time>{month}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></div></section>

  <section className={styles.section} id="profile"><div className={styles.sectionHead}><h2>School at a Glance</h2><span>2006 PROFILE</span></div><div className={styles.sectionBody}><div className={styles.factGrid}><div className={styles.fact}><strong>1836</strong><span>School founding year</span></div><div className={styles.fact}><strong>170</strong><span>Years of history in 2006</span></div><div className={styles.fact}><strong>3</strong><span>Student year levels</span></div><div className={styles.fact}><strong>JST</strong><span>Shared school timezone</span></div></div></div></section>

  <section className={styles.section} id="directory"><div className={styles.sectionHead}><h2>Faculty & Staff Directory</h2><span>LIVE DIRECTORY</span></div><div className={styles.sectionBody}><FacultyDirectory/></div></section>

  <section className={styles.section} id="contact"><div className={styles.sectionHead}><h2>Contact Information</h2><span>HANAMI CITY, JAPAN</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>General Office</h3><p>Records, school visits, and general questions. Monday–Friday, 8:00 AM–3:30 PM JST.</p><small>USE SCHOOL OFFICE REQUESTS IN THE PORTAL</small></article><article className={styles.card}><h3>Student Support</h3><p>Counseling, accessibility, health, safety, and student services remain inside the authenticated portal.</p><small>PRIVATE SUPPORT CHANNEL</small></article><article className={styles.card}><h3>Portal Help</h3><p>Discord sign-in, account access, profiles, and technical problems.</p><small>NEVER SHARE PRIVILEGED PASSWORDS</small></article></div></div></section>
 </PublicSchoolShell>;
}
