import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const rooms=[
 {code:"1-A",room:"East Academic Wing",teacher:"Homeroom adviser posted in the portal",note:"First/second-year mixed homeroom. Notices, roster, class photo, upcoming dates, and the private class message board live inside the signed-in workspace."},
 {code:"1-B",room:"Central Academic Wing",teacher:"Homeroom adviser posted in the portal",note:"First/second-year mixed homeroom. Students see only the roster and discussion spaces their active character is allowed to access."},
 {code:"1-C",room:"West Academic Wing",teacher:"Homeroom adviser posted in the portal",note:"First/second-year mixed homeroom. Faculty tools remain separate from student-only posts and discussions."},
];

export default function HomeroomsPage(){return <PublicSchoolShell active="academics" sectionTitle="HOMEROOMS" breadcrumb="Homeroom Network" lastUpdated="08.26.2006">
 <div className={styles.pageTitle}><small>HANAMI ACADEMIC NETWORK</small><h1>Homeroom Pages</h1><p>Each Hanami homeroom has its own mini-homepage with adviser information, roster, class photo, notices, important dates, and a role-scoped message board.</p></div>
 <section className={styles.section}><div className={styles.sectionHead}><h2>2006–07 Homerooms</h2><span>3 ACTIVE HOMEROOMS</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{rooms.map(item=><article className={styles.card} key={item.code}><small>HOMEROOM {item.code}</small><h3>{item.code}</h3><p>{item.room}</p><div className={styles.note}>Adviser: <strong>{item.teacher}</strong><br/>{item.note}</div></article>)}</div></div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Private Classroom Content</h2><span>LOGIN REQUIRED</span></div><div className={styles.sectionBody}><p>Roster names, student-only posts, faculty-only posts, and class-specific discussion content are not published on this public index. Open your Student or Faculty portal to see the homeroom page attached to your active character.</p><div className={styles.welcomeActions}><a href="../portal/">Open Hanami Portal</a><a href="../directory/">School Directory</a></div></div></section>
 </PublicSchoolShell>}
