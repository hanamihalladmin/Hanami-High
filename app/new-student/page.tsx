import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const faqs=[
 ["How do I join a club?","Open the Student Portal, go to Community or Activities, and use the published club information there. Club membership follows the school's existing activity system."],
 ["How do schedules work?","Students follow the published weekly schedule tied to their homeroom and enrolled classes. PE runs on Monday and Wednesday; Art or Computer rotates on Tuesday and Thursday where scheduled."],
 ["How do profile permissions work?","Character profiles begin private. You can change profile visibility from your Account/Profile settings. Friends-only and private profiles stay restricted."],
 ["Where do I find assignments?","Assignments live in the Student Portal under Courses and the dashboard assignment areas."],
 ["How do I contact faculty?","Use the website's internal messaging and Teacher Office Hours features rather than outside email."],
 ["Where do I report a website problem?","Use the Webmaster or Help Desk links in the school network footer."],
];

export default function NewStudentPage(){return <PublicSchoolShell active="student-life" sectionTitle="NEW STUDENT GUIDE" breadcrumb="FAQ & New Student Guide" lastUpdated="08.26.2006">
 <div className={styles.pageTitle}><small>START HERE · HANAMI HIGH 2006–07</small><h1>FAQ & New Student Guide</h1><p>A straightforward school-network guide to schedules, clubs, profiles, coursework, messages, and getting help.</p></div>
 <section className={styles.section}><div className={styles.sectionHead}><h2>First-Day Checklist</h2><span>NEW!</span></div><div className={styles.sectionBody}><ol><li>Open the Portal and choose your active character.</li><li>Check Dashboard, Schedule, and Courses.</li><li>Review school notices and the calendar.</li><li>Set your profile privacy and appearance.</li><li>Browse clubs and school activities.</li><li>Use internal messages and support tools when you need help.</li></ol></div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Frequently Asked Questions</h2><span>CLICK TO OPEN</span></div><div className={styles.sectionBody}>{faqs.map(([question,answer])=><details key={question} style={{borderBottom:"1px dotted #c9c3b7",padding:"8px 0"}}><summary style={{cursor:"pointer",fontWeight:700}}>{question}</summary><p style={{margin:"7px 0 2px"}}>{answer}</p></details>)}</div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Need More Help?</h2><span>SCHOOL NETWORK</span></div><div className={styles.sectionBody}><div className={styles.linkList}><a href="../portal/">Student Portal <span>»</span></a><a href="../guide/">Full Site Guide <span>»</span></a><a href="../support/">Help Desk / Support <span>»</span></a><a href="../webmaster/">Webmaster <span>»</span></a></div></div></section>
 </PublicSchoolShell>}
