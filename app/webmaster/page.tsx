import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../network-pages.module.css";

export default function WebmasterPage(){
 return <PublicSchoolShell sectionTitle="WEBMASTER DESK" breadcrumb="Webmaster" lastUpdated="08.26.2026">
  <div className={styles.page}>
   <section className={styles.hero}><div className={styles.heroHeader}>HANAMI HIGH SCHOOL · WEBMASTER DESK</div><div className={styles.heroBody}><h2>Webmaster & Site Information</h2><p>This page keeps the little technical details that school websites used to tuck away in the footer: version information, browser notes, credits, and a direct path for reporting problems.</p><div className={styles.links}><a href="../support/">Report a Problem</a><a href="../status/">Network Status</a><a href="../whats-new/">What&apos;s New</a><a href="../feeds/">RSS-style Feeds</a></div></div></section>
   <div className={styles.grid2}>
    <section className={styles.panel}><div className={styles.panelHeader}>SITE INFORMATION</div><div className={styles.panelBody}><table className={styles.retroTable}><tbody><tr><th>Website</th><td>Hanami High School Network</td></tr><tr><th>Network edition</th><td>2006</td></tr><tr><th>Current rebuild</th><td>v1.0.x</td></tr><tr><th>Last updated</th><td>08/26/2026</td></tr><tr><th>Timezone</th><td>Japan Standard Time (JST)</td></tr><tr><th>Recommended</th><td>1024×768 or better</td></tr></tbody></table></div></section>
    <section className={styles.panel}><div className={styles.panelHeader}>BROWSER COMPATIBILITY</div><div className={styles.panelBody}><p><b>Best viewed in Internet Explorer 7*</b></p><p className={styles.small}>*That is a joke. Hanami High is built for current browsers while keeping the visual spirit of a carefully maintained 2006 school website.</p><p><span className={styles.okBadge}>MODERNIZED</span> Responsive layout, keyboard access, secure authentication, working search, and mobile support live underneath the retro presentation.</p></div></section>
   </div>
   <section className={styles.panel}><div className={styles.panelHeader}>CREDITS</div><div className={styles.panelBody}><ul className={styles.credits}><li>Hanami High School website project</li><li>School administration and portal systems</li><li>Community testers and bug reporters</li><li>Chronicle, clubs, students, and faculty who keep the network active</li></ul><p className={styles.small}>© 2006–2026 Hanami High School Network · Please report broken pages, unreadable text, missing images, or portal layout problems through Support.</p></div></section>
  </div>
 </PublicSchoolShell>;
}
