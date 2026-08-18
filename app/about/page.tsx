import FacultyDirectory from "../components/faculty-directory";

const values = [
  ["学", "Curiosity", "Learn boldly, ask thoughtful questions, and share what you discover."],
  ["心", "Character", "Act with courage, accountability, kindness, and respect for the community."],
  ["結", "Connection", "Build friendships across classrooms, clubs, teams, and generations."],
] as const;

const traditions = [
  ["APRIL", "First Bloom Assembly", "The new school year opens beneath the courtyard cherry trees."],
  ["SEPTEMBER", "Autumn Culture Festival", "Clubs, classes, and performers transform campus for a full community day."],
  ["DECEMBER", "Lantern Walk", "Students recognize the people who helped them grow during the year."],
  ["MARCH", "Petal Farewell", "Graduating students leave a written wish in the school archive."],
] as const;

export default function AboutPage() {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Tokyo",
  }).format(new Date());

  return (
    <main className="site-page about-page">
      <a className="skip-link" href="#about-main">Skip to main content</a>
      <header className="school-header" aria-label="Hanami High header">
        <div className="network-strip">HANAMI HIGH SCHOOL • PUBLIC SCHOOL NETWORK • EST. 2006</div>
        <div className="brand-row">
          <a className="brand-lockup brand-link" href="../">
            <div className="school-mark" aria-hidden="true"><span>花</span></div>
            <div><p className="jp-name">花見高等学校</p><p className="brand-name">HANAMI HIGH SCHOOL</p><p className="brand-subtitle">Knowledge • Character • Community</p></div>
          </a>
          <div className="school-clock"><strong>{currentDate.toUpperCase()}</strong><span>HANAMI CITY • SCHOOL STATUS: OPEN</span></div>
        </div>
        <div className="nav-row">
          <nav aria-label="Primary navigation">
            <a href="../">Home</a><a className="active" href="./">About</a><a href="../academics/">Academics</a><a href="../#campus-life">Campus Life</a><a href="../#clubs">Clubs</a><a href="../academics/#calendar">Calendar</a><a href="../#news">News</a><a href="#directory">People</a><a href="../#gallery">Gallery</a>
          </nav>
          <a className="portal-button" href="../#portal-access">↪ Login / Portal</a>
        </div>
      </header>

      <div className="about-breadcrumb"><a href="../">School Home</a><span>›</span><strong>About Hanami</strong></div>

      <div className="about-layout" id="about-main">
        <aside className="about-nav panel" aria-label="About page sections">
          <h2 className="panel-title">ABOUT HANAMI</h2>
          <nav className="link-list"><a href="#story"><span>01</span>Our Story</a><a href="#mission"><span>02</span>Mission & Values</a><a href="#leadership"><span>03</span>Leadership</a><a href="#traditions"><span>04</span>Traditions</a><a href="#statistics"><span>05</span>School Statistics</a><a href="#directory"><span>06</span>Faculty & Staff</a><a href="#contact"><span>07</span>Contact</a></nav>
          <div className="panel-body about-note"><p className="eyebrow">VISITING CAMPUS?</p><p>Public office hours are Monday–Friday, 8:00 AM–3:30 PM JST.</p><a href="#contact">Plan your visit →</a></div>
        </aside>

        <div className="about-content">
          <section className="about-hero" id="story">
            <p className="eyebrow">HANAMI HIGH • ABOUT OUR SCHOOL</p>
            <div><div><h1>Rooted in tradition.<br />Growing toward tomorrow.</h1><p>Hanami High is a close-knit secondary school in Hanami City, Japan. Since 2006, our classrooms, clubs, and community traditions have helped students discover who they are and how they want to contribute.</p></div><div className="about-year"><small>FOUNDED</small><strong>2006</strong><span>花見市</span></div></div>
          </section>

          <section className="history-panel info-section">
            <div className="section-heading"><h2>OUR STORY</h2><span>2006—PRESENT</span></div>
            <div className="history-copy"><p className="dropcap">Hanami High began as a neighborhood school built around a simple promise: rigorous learning should never come at the expense of belonging. Its first classes gathered in 2006 with an emphasis on strong academics, student-led clubs, and service to Hanami City.</p><p>Today, the school blends dependable traditions with practical modern tools. Students can move from literature seminars and science laboratories to athletics, performance, volunteering, internships, and the lively conversations of the student network.</p></div>
          </section>

          <section className="info-section" id="mission">
            <div className="section-heading"><h2>MISSION & VALUES</h2><span>WHAT GUIDES US</span></div>
            <div className="mission-statement"><p>Our mission is to help every student become a capable learner, a grounded individual, and an active member of their community.</p></div>
            <div className="values-grid">{values.map(([icon,title,copy]) => <article key={title}><span>{icon}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
          </section>

          <section className="info-section" id="leadership">
            <div className="section-heading"><h2>SCHOOL LEADERSHIP</h2><span>OFFICE DIRECTORY</span></div>
            <div className="leadership-grid"><article><div className="portrait-placeholder">校</div><div><p className="eyebrow">HEAD OF SCHOOL</p><h3>Principal&apos;s Office</h3><p>Academic direction, faculty leadership, and whole-school planning.</p><a href="mailto:principal@hanamihigh.example">Contact office →</a></div></article><article><div className="portrait-placeholder">生</div><div><p className="eyebrow">STUDENT AFFAIRS</p><h3>Student Life Office</h3><p>Clubs, conduct, attendance support, events, and student wellbeing.</p><a href="mailto:studentlife@hanamihigh.example">Contact office →</a></div></article></div>
            <p className="content-note">Named roleplay staff will appear here as faculty profiles are approved.</p>
          </section>

          <section className="info-section" id="traditions">
            <div className="section-heading"><h2>HANAMI TRADITIONS</h2><span>THE SCHOOL YEAR</span></div>
            <div className="traditions-list">{traditions.map(([month,title,copy]) => <article key={title}><time>{month}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
          </section>

          <section className="info-section" id="statistics">
            <div className="section-heading"><h2>SCHOOL AT A GLANCE</h2><span>2026 SCHOOL PROFILE</span></div>
            <div className="statistics-grid"><article><strong>2006</strong><span>Year founded</span></article><article><strong>3</strong><span>Student year levels</span></article><article><strong>2</strong><span>Characters per account</span></article><article><strong>Tokyo</strong><span>Roleplay time zone</span></article></div>
          </section>

          <FacultyDirectory />

          <section className="info-section" id="contact">
            <div className="section-heading"><h2>CONTACT INFORMATION</h2><span>HANAMI CITY, JAPAN</span></div>
            <div className="contact-grid"><article><h3>General Office</h3><p>For public information, records, school visits, and general questions.</p><a href="mailto:office@hanamihigh.example">office@hanamihigh.example</a><p>Monday–Friday<br />8:00 AM–3:30 PM JST</p></article><article><h3>Student Support</h3><p>For counseling, accessibility, health, safety, and student services.</p><a href="mailto:support@hanamihigh.example">support@hanamihigh.example</a><p>Private support tools will also be available inside the student portal.</p></article><article><h3>Portal Help</h3><p>For Discord sign-in, account access, profiles, and technical problems.</p><a href="mailto:help@hanamihigh.example">help@hanamihigh.example</a><p>Do not send passwords or private account codes by email.</p></article></div>
          </section>
        </div>
      </div>
      <footer><p>HANAMI HIGH SCHOOL • 花見高等学校 • HANAMI CITY • 2026</p><nav><a href="#contact">Contact</a><a href="../#portal-access">Portal Help</a><a href="#about-main">Back to top ↑</a></nav></footer>
    </main>
  );
}
