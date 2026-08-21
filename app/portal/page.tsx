import PortalAuthPanel from "./PortalAuthPanel";
import {hanamiRoleplayDate} from "../components/roleplay-date";
import styles from "./PortalGatewayCompact.module.css";

export default function PortalPage(){
  const currentDate=hanamiRoleplayDate();
  return <main className="site-page portal-page">
    <a className="skip-link" href="#portal-main">Skip to main content</a>
    <header className="school-header">
      <div className="network-strip">HANAMI HIGH SCHOOL • SECURE SCHOOL NETWORK • EST. 2006</div>
      <div className="brand-row"><a className="brand-lockup brand-link" href="../"><div className="school-mark" style={{background:"transparent",border:0,boxShadow:"none"}}><img src="../hanami-high-portal-icon.png" alt="Hanami High" style={{width:"100%",height:"100%",objectFit:"contain",background:"transparent"}}/></div><div><p className="jp-name">花見高等学校</p><p className="brand-name">HANAMI HIGH SCHOOL</p><p className="brand-subtitle">Student & Faculty Portal</p></div></a><div className="school-clock"><strong>{currentDate.toUpperCase()}</strong><span>HANAMI CITY • JAPAN STANDARD TIME • SECURE PORTAL GATEWAY</span></div></div>
      <div className="nav-row"><nav><a href="../">School Home</a><a href="../about/">About</a><a href="../academics/">Academics</a><a href="../campus-life/">Campus Life</a><a href="./admin/">Administration</a></nav><a className="portal-button active" href="./">Login / Portal</a></div>
    </header>
    <section className={styles.gateway} id="portal-main">
      <header className={styles.heading}><div><p className="eyebrow">HANAMI HIGH • ACCOUNT GATEWAY</p><h1>Choose your Hanami character.</h1><p><strong>Maximum two characters.</strong> Sign in with Discord, choose a student or faculty identity, and open the portal that matches who you are playing. <strong>Private until you publish.</strong></p></div><div className={styles.badge}><strong>PRIVATE SCHOOL DESK</strong><span>Student • Faculty • Administration • Owner</span></div></header>
      <PortalAuthPanel/>
    </section>
    <footer><p>HANAMI HIGH SCHOOL • SECURE PORTAL FOUNDATION • 2006</p><nav><a href="../">School Home</a><a href="./admin/">Administration</a><a href="./help/">Help</a><a href="#portal-main">Back to top ↑</a></nav></footer>
  </main>;
}
