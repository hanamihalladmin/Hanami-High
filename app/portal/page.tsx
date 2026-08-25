import PortalAuthPanel from "./PortalAuthPanel";
import {hanamiRoleplayDate} from "../components/roleplay-date";
import styles from "./PortalGatewayCompact.module.css";

export default function PortalPage(){
  const currentDate=hanamiRoleplayDate();
  return <main className={styles.shell}>
    <a className="skip-link" href="#portal-main">Skip to main content</a>

    <div className={styles.utilityBar}>
      <span>HANAMI HIGH SCHOOL • SECURE SCHOOL NETWORK • EST. 2006</span>
      <nav><a href="../help/">Help Desk</a><a href="../">Public Site</a></nav>
    </div>

    <header className={styles.masthead}>
      <a className={styles.brandBlock} href="../" aria-label="Hanami High School home">
        <img className={styles.crest} src="../hanami-high-portal-icon.png?v=20260825b" alt="Hanami High crest" />
        <div>
          <p>花見高等学校</p>
          <h1>HANAMI HIGH SCHOOL</h1>
          <span>Student & Faculty Portal</span>
        </div>
      </a>
      <div className={styles.schoolMeta}>
        <strong>{currentDate.toUpperCase()}</strong>
        <span>HANAMI CITY • JAPAN STANDARD TIME</span>
        <span>SECURE PORTAL GATEWAY</span>
      </div>
    </header>

    <nav className={styles.primaryNav} aria-label="Portal navigation">
      <a href="../">School Home</a>
      <a href="../about/">About</a>
      <a href="../academics/">Academics</a>
      <a href="../campus-life/">Campus Life</a>
      <a href="./admin/">Administration</a>
      <a className={styles.activeNav} href="./">Login / Portal</a>
    </nav>

    <div className={styles.pageFrame} id="portal-main">
      <div className={styles.breadcrumbs}><b>HANAMI HIGH</b> / SECURE PORTAL / CHARACTER GATEWAY</div>
      <section className={styles.gateway}>
        <div className={styles.frameLabel}><span>PRIVATE SCHOOL DESK</span><span>STUDENT • FACULTY • ADMINISTRATION • OWNER</span></div>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>HANAMI HIGH • ACCOUNT GATEWAY</p>
            <h2>Choose your Hanami character.</h2>
            <p><strong>Maximum two characters.</strong> Sign in with Discord, choose a student or faculty identity, and open the portal that matches who you are playing. Your character desk stays private until you publish profile content.</p>
          </div>
          <aside className={styles.gatewayNote}>
            <b>HOW IT WORKS</b>
            <ol><li>Sign in with Discord</li><li>Choose your character</li><li>Enter the correct portal</li></ol>
            <span>Website messages only • no email inbox required</span>
          </aside>
        </header>
        <div className={styles.authSurface}><PortalAuthPanel/></div>
      </section>
    </div>

    <footer className={styles.footer}>
      <p>HANAMI HIGH SCHOOL • SECURE PORTAL FOUNDATION • 2006</p>
      <nav><a href="../">School Home</a><a href="./admin/">Administration</a><a href="./help/">Help</a><a href="#portal-main">Back to top ↑</a></nav>
    </footer>
  </main>;
}
