import PortalAuthPanel from "./PortalAuthPanel";
import {hanamiRoleplayDate} from "../components/roleplay-date";

const tools=[
  ["▣","Personal Dashboard","Classes, assignments, events, notices, and chosen widgets in one school desk."],
  ["♙","Character Switcher","Create up to two student or faculty characters under one Discord-authenticated account."],
  ["✉","Hanami Messages","Private conversations, group chats, attachments, teacher messages, and office requests stay inside the website."],
  ["✦","Profile & Privacy","Build a fully customizable personal page and choose public, friends-only, or private visibility."],
] as const;

export default function PortalPage(){
  const currentDate=hanamiRoleplayDate();
  return <main className="site-page portal-page">
    <a className="skip-link" href="#portal-main">Skip to main content</a>
    <header className="school-header">
      <div className="network-strip">HANAMI HIGH SCHOOL • SECURE SCHOOL NETWORK • EST. 2006</div>
      <div className="brand-row"><a className="brand-lockup brand-link" href="../"><div className="school-mark"><span>花</span></div><div><p className="jp-name">花見高等学校</p><p className="brand-name">HANAMI HIGH SCHOOL</p><p className="brand-subtitle">Student & Faculty Portal</p></div></a><div className="school-clock"><strong>{currentDate.toUpperCase()}</strong><span>HANAMI CITY • SECURE PORTAL GATEWAY</span></div></div>
      <div className="nav-row"><nav><a href="../">School Home</a><a href="../about/">About</a><a href="../academics/">Academics</a><a href="../campus-life/">Campus Life</a><a href="./admin/">Administration</a></nav><a className="portal-button active" href="./">Login / Portal</a></div>
    </header>
    <div className="portal-gateway" id="portal-main"><section className="portal-intro"><p className="eyebrow">HANAMI HIGH • ACCOUNT GATEWAY</p><h1>Your school life,<br/>all in one place.</h1><p>Sign in with Discord, synchronize your school roles, choose who you are playing, and enter your private Hanami school desk.</p><PortalAuthPanel/></section><aside className="test-desk"><div className="window-title">MY HANAMI • TEST DESK</div><div className="test-character"><div className="avatar-placeholder">花</div><div><p className="eyebrow">TEST CHARACTER</p><h2>Student Preview</h2><span>@test_student • Student</span></div></div><div className="desk-list"><p><b>08:30</b> Homeroom</p><p><b>10:15</b> Literature & Composition</p><p><b>15:30</b> Club activities</p></div><small>Preview only • No account data</small></aside></div>
    <section className="portal-features"><div className="section-heading"><h2>YOUR HANAMI NETWORK</h2><span>ACCOUNT FOUNDATION</span></div><div>{tools.map(([icon,title,copy])=><article key={title}><span>{icon}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="portal-rules"><div><p className="eyebrow">ACCOUNT RULE</p><strong>Maximum two characters</strong><p>Choose student + student, faculty + faculty, or one of each.</p></div><div><p className="eyebrow">DEFAULT PRIVACY</p><strong>Private until you publish</strong><p>New characters and personal layouts begin private.</p></div><div><p className="eyebrow">COMMUNICATION</p><strong>Website messages only</strong><p>Hanami never opens an external email application.</p></div></section>
    <footer><p>HANAMI HIGH SCHOOL • SECURE PORTAL FOUNDATION • 2006</p><nav><a href="../">School Home</a><a href="./admin/">Administration</a><a href="./help/">Help</a><a href="#portal-main">Back to top ↑</a></nav></footer>
  </main>;
}
