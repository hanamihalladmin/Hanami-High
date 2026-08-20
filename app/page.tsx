import SiteSearch from "./components/site-search";
import LiveAnnouncements from "./components/live-announcements";
import LiveNextEvent from "./components/live-next-event";
import LiveUpcomingEvents from "./components/live-upcoming-events";
import LiveSchoolStatus from "./components/live-school-status";
import {hanamiRoleplayDate} from "./components/roleplay-date";

const navigation = [["Home", "#home"], ["About", "./about/"], ["Academics", "./academics/"], ["Campus Life", "./campus-life/"], ["Clubs", "./campus-life/#directory"], ["Calendar", "./calendar/"], ["Rules", "./rules/"], ["News", "#news"], ["People", "./about/#directory"], ["Gallery", "./campus-life/#gallery"], ["Apply", "./apply/"]] as const;
const quickLinks = [["A", "About Hanami", "./about/"], ["学", "Academic departments", "./academics/#departments"], ["C", "Clubs & organizations", "./campus-life/#directory"], ["E", "School calendar", "./calendar/"], ["規", "Rules & conduct", "./rules/"], ["入", "Apply to Hanami", "./apply/"]] as const;

export default function Home() {
  const currentDate = hanamiRoleplayDate();
  return (
    <main id="home" className="site-page">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="school-header" aria-label="Hanami High header">
        <div className="network-strip"><a href="./portal/" style={{color:"inherit",textDecoration:"none"}}>HANAMI HIGH SCHOOL • PUBLIC SCHOOL NETWORK • EST. 1836</a></div>
        <div className="brand-row">
          <div className="brand-lockup"><div className="school-mark" aria-hidden="true"><span>花</span></div><div><p className="jp-name">花見高等学校</p><h1>HANAMI HIGH SCHOOL</h1><p className="brand-subtitle">Knowledge • Character • Community</p></div></div>
          <div className="school-clock" aria-label={`Hanami roleplay date is ${currentDate}`}><strong>{currentDate.toUpperCase()}</strong><LiveSchoolStatus/></div>
        </div>
        <div className="nav-row"><nav aria-label="Primary navigation">{navigation.map(([label, href], index) => <a className={index === 0 ? "active" : ""} href={href} key={label}>{label}</a>)}</nav><a className="portal-button" href="./portal/">↪ Login / Portal</a></div>
      </header>

      <LiveAnnouncements />

      <div className="homepage-grid">
        <aside className="left-rail" aria-label="Quick links and portal access">
          <section className="panel" id="portal-access"><h2 className="panel-title">PORTAL ACCESS</h2><div className="panel-body portal-panel"><a className="eyebrow" href="./portal/">HANAMI SCHOOL NETWORK</a><p>Students and faculty can access their private school desk here. Returning users keep their browser session and active character until Logout.</p><a className="primary-action" href="./portal/">Student Login</a><a className="secondary-action" href="./portal/">Faculty Login</a><a className="secondary-action" href="./apply/">Apply to Join Hanami</a><a className="secondary-action" href="./rules/">Read Rules & Conduct</a><small>New guests can review the rules and begin enrollment through the public Apply page. Approved members sign in with Discord after receiving their school role.</small></div></section>
          <section className="panel"><h2 className="panel-title">QUICK LINKS</h2><div className="link-list">{quickLinks.map(([icon, label, href]) => <a href={href} key={label}><span>{icon}</span>{label}</a>)}</div></section>
          <section className="panel network-panel"><h2 className="panel-title">NETWORK STATUS</h2><div className="panel-body"><p><i aria-hidden="true" /> ONLINE • 2006</p><small>Student Web Committee</small></div></section>
        </aside>

        <div className="main-column" id="main-content">
          <section className="hero-panel" aria-labelledby="welcome-heading"><p className="eyebrow">HANAMI HIGH • SCHOOL HOME • PUBLIC NETWORK</p><div className="hero-copy"><div><h2 id="welcome-heading">A school day is more than a schedule.</h2><p>Explore academics, student life, clubs, school traditions, and the stories shaping Hanami this semester.</p><div className="hero-actions"><a className="primary-action" href="./academics/">Explore academics</a><a className="secondary-action" href="./apply/">Apply to Hanami</a><a className="text-link" href="./campus-life/">See campus life →</a></div></div><div className="sakura-seal" aria-label="Hanami High sakura emblem"><span>花</span><small>HANAMI</small></div></div></section>
          <SiteSearch />
          <section className="info-section" id="academics"><div className="section-heading"><h2>ACADEMIC HIGHLIGHTS</h2><a href="./academics/">Course guide</a></div><div className="academic-grid"><article><span>01</span><h3>Arts & Humanities</h3><p>Literature, history, languages, visual art, and music.</p></article><article><span>02</span><h3>Science & Technology</h3><p>Laboratory science, mathematics, computing, and design.</p></article><article><span>03</span><h3>Guidance & Pathways</h3><p>Graduation planning, counseling, internships, and careers.</p></article></div></section>
          <section className="info-section campus-preview" id="campus-life"><div className="section-heading"><h2>CAMPUS LIFE</h2><a href="./campus-life/">Browse activities</a></div><div className="campus-columns"><article id="clubs"><b>THE CLUB DIRECTORY</b><h3>Find your place after the bell.</h3><p>Browse active sports, academic, arts, service, and special-interest clubs.</p><a href="./campus-life/#directory">View club roster →</a></article><article id="jobs"><b>CAMPUS OPPORTUNITIES</b><h3>Build experience beyond class.</h3><p>Jobs, volunteering, internships, and student leadership opportunities are published through Hanami.</p><a href="./campus-life/#jobs">See opportunities →</a></article></div></section>
          <section className="quiet-sections" aria-label="Additional public information"><div id="about"><h2>About Hanami</h2><p>Established in 1836, Hanami High carries a long school history into its current 2006 academic year.</p></div><div id="people"><h2>People</h2><p>Meet school leadership, faculty, staff, and student representatives.</p></div><div id="gallery"><h2>Gallery</h2><p>School photographs and student work are collected through the campus network.</p></div></section>
        </div>

        <aside className="right-rail" aria-label="Today at Hanami">
          <section className="panel"><h2 className="panel-title">TODAY AT HANAMI</h2><div className="panel-body today-panel"><strong>{currentDate.toUpperCase()}</strong><hr /><p><b>Hanami City</b><br />Japan Standard Time<br /><small>Roleplay year • 2006</small></p></div></section>
          <LiveNextEvent />
          <LiveUpcomingEvents />
          <section className="panel"><h2 className="panel-title">STUDENT VOTE</h2><div className="panel-body vote-card"><p className="eyebrow">SEMESTER TITLES</p><strong>Best Dressed Hoodie?</strong><p>Voting opens September 1.</p><a href="./portal/student/">Return to Student Portal to participate</a></div></section>
          <section className="panel"><h2 className="panel-title">HALLWAY WIRE</h2><div className="panel-body wire-card"><p className="eyebrow">BROADCAST COMMITTEE</p><h3>Who moved the courtyard bench?</h3><p>Three witnesses. Four conflicting stories. One very confused groundskeeper.</p><span>RUMOR • 8:42 AM</span></div></section>
        </aside>
      </div>
      <footer><p>HANAMI HIGH SCHOOL • 花見高等学校 • HANAMI CITY • 2006</p><nav aria-label="Footer navigation"><a href="./apply/">Apply</a><a href="./rules/">Rules</a><a href="./about/#contact">Contact</a><a href="./portal/help/">Portal Help</a><a href="#home">Back to top ↑</a></nav></footer>
    </main>
  );
}
