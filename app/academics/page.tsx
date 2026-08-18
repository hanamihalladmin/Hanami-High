import CourseCatalog from "../components/course-catalog";

const departments = [
  ["文", "Languages & Humanities", "English, Japanese, literature, history, civics, philosophy, and global studies.", "West Wing • Level 2"],
  ["数", "Mathematics", "Foundations, algebra, geometry, statistics, pre-calculus, and advanced mathematics.", "East Wing • Level 2"],
  ["科", "Sciences", "Biology, chemistry, physics, environmental science, and practical laboratory study.", "Science Hall • Levels 1–2"],
  ["創", "Arts & Design", "Visual art, music, theatre, media, photography, and design technology.", "Creative Arts Building"],
  ["体", "Health & Physical Education", "Wellness, health literacy, athletics, fitness, and personal development.", "Gymnasium & Field House"],
  ["進", "Pathways & Applied Learning", "Computing, career preparation, internships, independent study, and life skills.", "Learning Commons"],
] as const;

const requirements = [
  ["Languages & Humanities", "8", "English/Japanese studies plus history or civics"],
  ["Mathematics", "6", "Including algebra and geometry competencies"],
  ["Sciences", "6", "Including two laboratory-based courses"],
  ["Arts, Health & PE", "5", "Creative study, health, and physical education"],
  ["Pathways & Electives", "5", "Student-selected courses and applied learning"],
  ["Community Learning", "2", "Service, internship, or approved school contribution"],
] as const;

const calendar = [
  ["APR 08", "School year begins", "Opening assembly and first-semester classes"],
  ["JUL 20", "Summer recess", "Campus offices remain open on reduced hours"],
  ["AUG 24", "Classes resume", "Second instructional block begins"],
  ["SEP 12", "Culture Festival", "School-wide exhibitions and performances"],
  ["DEC 21", "Winter recess", "End of second instructional block"],
  ["JAN 08", "Final term begins", "Guidance and graduation planning"],
  ["MAR 12", "Graduation ceremony", "Petal Farewell and diploma presentation"],
] as const;

export default function AcademicsPage() {
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric", timeZone:"Asia/Tokyo" }).format(new Date());
  return <main className="site-page academics-page">
    <a className="skip-link" href="#academics-main">Skip to main content</a>
    <header className="school-header" aria-label="Hanami High header">
      <div className="network-strip">HANAMI HIGH SCHOOL • PUBLIC SCHOOL NETWORK • EST. 2006</div>
      <div className="brand-row"><a className="brand-lockup brand-link" href="../"><div className="school-mark" aria-hidden="true"><span>花</span></div><div><p className="jp-name">花見高等学校</p><p className="brand-name">HANAMI HIGH SCHOOL</p><p className="brand-subtitle">Knowledge • Character • Community</p></div></a><div className="school-clock"><strong>{currentDate.toUpperCase()}</strong><span>HANAMI CITY • SCHOOL STATUS: OPEN</span></div></div>
      <div className="nav-row"><nav aria-label="Primary navigation"><a href="../">Home</a><a href="../about/">About</a><a className="active" href="./">Academics</a><a href="../campus-life/">Campus Life</a><a href="../campus-life/#directory">Clubs</a><a href="../calendar/">Calendar</a><a href="../#news">News</a><a href="../about/#directory">People</a><a href="../campus-life/#gallery">Gallery</a></nav><a className="portal-button" href="../portal/">↪ Login / Portal</a></div>
    </header>

    <div className="about-breadcrumb"><a href="../">School Home</a><span>›</span><strong>Academics</strong></div>
    <section className="academics-hero" id="academics-main"><div><p className="eyebrow">HANAMI HIGH • ACADEMIC PROGRAM</p><h1>Learn widely.<br />Choose your direction.</h1><p>Build a strong academic foundation, explore creative and practical subjects, and work with guidance staff to shape a path that fits your goals.</p><div className="hero-actions"><a className="primary-action" href="#courses">Browse courses</a><a className="text-link" href="#guidance">Plan with guidance →</a></div></div><aside><small>2026 COURSE GUIDE</small><strong>32</strong><span>credits required</span><hr/><p>Three years<br/>Six departments<br/>One personal pathway</p></aside></section>

    <div className="academic-page-layout">
      <aside className="academic-side">
        <section className="panel academic-index"><h2 className="panel-title">ACADEMICS INDEX</h2><nav className="link-list"><a href="#departments"><span>01</span>Departments</a><a href="#courses"><span>02</span>Course Catalog</a><a href="#graduation"><span>03</span>Graduation</a><a href="#calendar"><span>04</span>Calendar</a><a href="#honors"><span>05</span>Honors</a><a href="#guidance"><span>06</span>Guidance</a></nav></section>
        <section className="panel"><h2 className="panel-title">ACADEMIC OFFICE</h2><div className="panel-body"><p>Questions about placement, credits, or course changes?</p><a href="#guidance">Meet the guidance team →</a><p><small>Office hours<br/>Mon–Fri • 8:00 AM–4:00 PM JST</small></p></div></section>
      </aside>

      <div className="academic-page-content">
        <section className="info-section" id="departments"><div className="section-heading"><h2>ACADEMIC DEPARTMENTS</h2><span>SIX AREAS OF STUDY</span></div><div className="department-grid">{departments.map(([icon,name,copy,location])=><article key={name}><span>{icon}</span><div><h3>{name}</h3><p>{copy}</p><small>{location}</small></div></article>)}</div></section>
        <CourseCatalog />
        <section className="info-section" id="graduation"><div className="section-heading"><h2>GRADUATION REQUIREMENTS</h2><span>32 CREDITS TOTAL</span></div><div className="graduation-intro"><div className="credit-ring"><strong>32</strong><span>CREDITS</span></div><div><h3>A balanced Hanami education</h3><p>Students complete required foundations, select pathway courses, and demonstrate community learning. Guidance counselors review progress every term.</p></div></div><div className="requirements-table" role="table" aria-label="Graduation credit requirements">{requirements.map(([area,credits,note])=><div role="row" key={area}><strong role="cell">{area}</strong><span role="cell">{credits} credits</span><p role="cell">{note}</p></div>)}</div><p className="content-note">Final requirements are confirmed through the student&apos;s official academic plan. Transfer credits and accommodations receive an individual review.</p></section>
        <section className="info-section" id="calendar"><div className="section-heading"><h2>2026–27 ACADEMIC CALENDAR</h2><span>JAPAN STANDARD TIME</span></div><div className="academic-timeline">{calendar.map(([date,title,copy])=><article key={title}><time>{date}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div><div className="calendar-actions"><a className="secondary-action" href="../calendar/">View complete calendar</a><small>Portal calendars include personal class, exam, and assignment dates.</small></div></section>
        <section className="info-section honors-section" id="honors"><div className="section-heading"><h2>HONORS & ADVANCED STUDY</h2><span>CHALLENGE WITH SUPPORT</span></div><div className="honors-grid"><article><p className="eyebrow">HONORS COURSES</p><h3>Deeper classroom study</h3><p>Advanced sections add extended reading, complex projects, and independent analysis while following the core curriculum.</p></article><article><p className="eyebrow">INDEPENDENT STUDY</p><h3>Build a supervised project</h3><p>Eligible students may propose research, creative work, or applied learning with a faculty supervisor.</p></article><article><p className="eyebrow">INTERNSHIP CREDIT</p><h3>Connect learning to work</h3><p>Approved placements can provide pathway credit and structured support for students strengthening academic standing.</p></article></div><div className="eligibility-strip"><strong>HOW TO APPLY</strong><span>Discuss readiness with a teacher</span><span>Review progress with guidance</span><span>Submit the pathway request</span></div></section>
        <section className="info-section" id="guidance"><div className="section-heading"><h2>GUIDANCE COUNSELING</h2><span>PLAN • SUPPORT • PROGRESS</span></div><div className="guidance-grid"><div><p className="eyebrow">YOUR ACADEMIC PATH</p><h3>Planning should feel personal.</h3><p>Guidance counselors help students understand requirements, choose courses, explore future study and careers, arrange accommodations, and recover credits when plans change.</p><a className="primary-action" href="../portal/student/">Message Guidance in Student Portal</a></div><ul><li><strong>Course planning</strong><span>Selection, prerequisites, and schedule changes</span></li><li><strong>Graduation checks</strong><span>Credit reviews and completion plans</span></li><li><strong>Advanced pathways</strong><span>Honors, independent study, and internships</span></li><li><strong>Future planning</strong><span>College, training, careers, and applications</span></li></ul></div></section>
      </div>
    </div>
    <footer><p>HANAMI HIGH SCHOOL • 花見高等学校 • HANAMI CITY • 2026</p><nav><a href="../about/#contact">Contact</a><a href="../portal/">Portal Help</a><a href="#academics-main">Back to top ↑</a></nav></footer>
  </main>;
}
