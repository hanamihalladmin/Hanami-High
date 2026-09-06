import PortalAuthPanel from "./PortalAuthPanel";
import { hanamiRoleplayDate } from "../components/roleplay-date";
import styles from "./PortalGatewayCompact.module.css";

export default function PortalPage() {
  const currentDate = hanamiRoleplayDate();

  return (
    <main className={styles.shell}>
      <a className="skip-link" href="#portal-main">Skip to main content</a>

      <div className={styles.utilityBar}>
        <span>HANAMI HIGH SCHOOL NETWORK · SECURE ACCOUNT GATEWAY</span>
        <nav><a href="../new-student/">Help</a><a href="../">Public Site</a></nav>
      </div>

      <header className={styles.masthead}>
        <a className={styles.brandBlock} href="../" aria-label="Hanami High School home">
          <div className={styles.schoolMark} aria-hidden="true"><span>H</span><small>H</small></div>
          <div>
            <p>HANAMI HIGH SCHOOL</p>
            <h1>HANAMI HIGH SCHOOL</h1>
            <span>School Network Account Gateway</span>
          </div>
        </a>
        <div className={styles.schoolMeta}>
          <strong>{currentDate.toUpperCase()}</strong>
          <span>HANAMI CITY · JAPAN STANDARD TIME</span>
          <span>DISCORD VERIFIED · HANAMI MANAGED</span>
        </div>
      </header>

      <nav className={styles.primaryNav} aria-label="Portal gateway navigation">
        <a href="../">School Home</a>
        <a href="../about/">About</a>
        <a href="../academics/">Academics</a>
        <a href="../campus-life/">Students</a>
        <a href="../apply/">Admissions</a>
        <a className={styles.activeNav} href="./">Portal Login</a>
      </nav>

      <div className={styles.pageFrame} id="portal-main">
        <div className={styles.breadcrumbs}><b>HANAMI HIGH</b> / SCHOOL NETWORK / ACCOUNT GATEWAY</div>

        <section className={styles.gateway}>
          <div className={styles.frameLabel}><span>PRIVATE SCHOOL DESK</span><span>STUDENT · FACULTY · ADMIN · OWNER</span></div>
          <header className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>HANAMI HIGH · ACCOUNT ACCESS</p>
              <h2>Enter the school network.</h2>
              <p>Discord verifies your account and Hanami server roles. Hanami then manages your characters, portal access, profile privacy, and school permissions. Each account may keep up to two characters.</p>
            </div>
            <aside className={styles.gatewayNote}>
              <b>ACCOUNT FLOW</b>
              <ol><li>Continue with Discord</li><li>Confirm Hanami access</li><li>Choose or resume a character</li><li>Enter the matching portal</li></ol>
              <span>Admin and Owner access is account-level and does not require a character.</span>
            </aside>
          </header>

          <div className={styles.authSurface}><PortalAuthPanel /></div>
        </section>
      </div>

      <footer className={styles.footer}>
        <p>HANAMI HIGH SCHOOL NETWORK · PRIVATE ACCOUNT GATEWAY · EST. 2006</p>
        <nav><a href="../">School Home</a><a href="../new-student/">New Student Guide</a><a href="../support/">Help Desk</a><a href="#portal-main">Back to top ↑</a></nav>
      </footer>
    </main>
  );
}
