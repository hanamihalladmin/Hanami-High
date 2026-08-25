import CourseCatalog from "../components/course-catalog";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const sideItems=[
 {id:"departments",label:"Departments",href:"/academics/#departments"},
 {id:"courses",label:"Course Catalog",href:"/academics/#courses"},
 {id:"graduation",label:"Graduation",href:"/academics/#graduation"},
 {id:"calendar",label:"Academic Calendar",href:"/academics/#calendar"},
 {id:"honors",label:"Honors & Advanced",href:"/academics/#honors"},
 {id:"guidance",label:"Guidance",href:"/academics/#guidance"},
];

const departments=[
 ["Languages & Humanities","English, Japanese, literature, history, civics, philosophy, and global studies.","West Wing · Level 2"],
 ["Mathematics","Foundations, algebra, geometry, statistics, pre-calculus, and advanced mathematics.","East Wing · Level 2"],
 ["Sciences","Biology, chemistry, physics, environmental science, and practical laboratory study.","Science Hall · Levels 1–2"],
 ["Arts & Design","Visual art, music, theatre, media, photography, and design technology.","Creative Arts Building"],
 ["Health & Physical Education","Wellness, health literacy, athletics, fitness, and personal development.","Gymnasium & Field House"],
 ["Pathways & Applied Learning","Computing, career preparation, internships, independent study, and life skills.","Learning Commons"],
] as const;

const requirements=[
 ["Languages & Humanities","8","English/Japanese studies plus history or civics"],
 ["Mathematics","6","Including algebra and geometry competencies"],
 ["Sciences","6","Including two laboratory-based courses"],
 ["Arts, Health & PE","5","Creative study, health, and physical education"],
 ["Pathways & Electives","5","Student-selected courses and applied learning"],
 ["Community Learning","2","Service, internship, or approved school contribution"],
] as const;

const calendar=[
 ["APR 08","School year begins","Opening assembly and first-semester classes"],
 ["JUL 20","Summer recess","Campus offices remain open on reduced hours"],
 ["AUG 24","Classes resume","Second instructional block begins"],
 ["SEP 12","Culture Festival","School-wide exhibitions and performances"],
 ["DEC 21","Winter recess","End of second instructional block"],
 ["JAN 08","Final term begins","Guidance and graduation planning"],
 ["MAR 12","Graduation ceremony","Petal Farewell and diploma presentation"],
] as const;

export default function AcademicsPage(){
 return <PublicSchoolShell active="academics" sectionTitle="ACADEMICS" breadcrumb="Academic Program" sideItems={sideItems} sideActive="departments" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>2006 COURSE GUIDE</small><h1>Learn widely. Choose your direction.</h1><p>Build a strong academic foundation, explore creative and practical subjects, and work with guidance staff to shape a path that fits your goals.</p></div>

  <section className={styles.section} id="departments"><div className={styles.sectionHead}><h2>Academic Departments</h2><span>SIX AREAS OF STUDY</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{departments.map(([name,copy,location])=><article className={styles.card} key={name}><h3>{name}</h3><p>{copy}</p><small>{location}</small></article>)}</div></div></section>

  <section className={styles.section} id="courses"><div className={styles.sectionHead}><h2>Course Catalog</h2><span>LIVE CATALOG</span></div><div className={styles.sectionBody}><CourseCatalog/></div></section>

  <section className={styles.section} id="graduation"><div className={styles.sectionHead}><h2>Graduation Requirements</h2><span>32 CREDITS TOTAL</span></div><div className={styles.sectionBody}><div className={styles.factGrid}><div className={styles.fact}><strong>32</strong><span>Total credits required</span></div><div className={styles.fact}><strong>6</strong><span>Departments represented</span></div><div className={styles.fact}><strong>3</strong><span>Years of study</span></div></div><br/><table className={styles.retroTable}><thead><tr><th>Area</th><th>Credits</th><th>Requirement</th></tr></thead><tbody>{requirements.map(([area,credits,note])=><tr key={area}><td><strong>{area}</strong></td><td>{credits}</td><td>{note}</td></tr>)}</tbody></table></div></section>

  <section className={styles.section} id="calendar"><div className={styles.sectionHead}><h2>2006 Academic Calendar</h2><span>JAPAN STANDARD TIME</span></div><div className={styles.sectionBody}><div className={styles.timeline}>{calendar.map(([date,title,copy])=><article key={title}><time>{date}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div><div className={styles.note}>The full school calendar also contains live events. Personal classes, assignments, and exam dates remain inside authenticated portals.</div></div></section>

  <section className={styles.section} id="honors"><div className={styles.sectionHead}><h2>Honors & Advanced Study</h2><span>CHALLENGE WITH SUPPORT</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>Honors Courses</h3><p>Advanced sections add extended reading, complex projects, and independent analysis while following the core curriculum.</p></article><article className={styles.card}><h3>Independent Study</h3><p>Eligible students may propose research, creative work, or applied learning with a faculty supervisor.</p></article><article className={styles.card}><h3>Internship Credit</h3><p>Approved placements can provide pathway credit and structured support for students strengthening academic standing.</p></article></div></div></section>

  <section className={styles.section} id="guidance"><div className={styles.sectionHead}><h2>Guidance Counseling</h2><span>PLAN · SUPPORT · PROGRESS</span></div><div className={styles.sectionBody}><p>Guidance counselors help students understand requirements, choose courses, explore future study and careers, arrange accommodations, and recover credits when plans change.</p><div className={styles.cardGrid}><article className={styles.card}><h3>Course Planning</h3><p>Selection, prerequisites, and schedule changes.</p></article><article className={styles.card}><h3>Graduation Checks</h3><p>Attendance, report cards, credit reviews, and completion plans.</p></article><article className={styles.card}><h3>Future Planning</h3><p>College, training, careers, applications, honors, and internships.</p></article></div></div></section>
 </PublicSchoolShell>;
}
