import Link from "next/link";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../network-pages.module.css";

export default function SupportPage(){
 return <PublicSchoolShell sectionTitle="HELP DESK" breadcrumb="Support / Report a Problem" lastUpdated="09.06.2026">
  <div className={styles.page}>
   <section className={styles.hero}><div className={styles.heroHeader}>HANAMI HIGH SCHOOL · HELP DESK</div><div className={styles.heroBody}><h2>Website Support & Bug Reports</h2><p>Hanami support stays inside the school website. Signed-in students and faculty can send support tickets and bug reports from their portal; public visitors can use the guide and network-status pages to troubleshoot first.</p><div className={styles.links}><Link href="/portal/">Open Portal</Link><Link href="/guide/#bugs">Troubleshooting Guide</Link><Link href="/status/">Network Status</Link><Link href="/webmaster/">Webmaster Desk</Link></div></div></section>
   <div className={styles.grid2}>
    <section className={styles.panel}><div className={styles.panelHeader}>SIGNED-IN SUPPORT</div><div className={styles.panelBody}><p><b>Student / Faculty:</b> open your portal, then use <b>School → Support Tickets</b> to report an account, classroom, portal, or website problem.</p><p className={styles.small}>Include the exact page, what you clicked, what you expected, and a screenshot when possible. Hanami does not send these reports through personal email.</p></div></section>
    <section className={styles.panel}><div className={styles.panelHeader}>BEFORE REPORTING</div><div className={styles.panelBody}><ul><li>Hard refresh after a new deployment.</li><li>Confirm you are signed into the correct Hanami account and character.</li><li>Check Network Status for maintenance.</li><li>Check the Website Guide for known navigation and account steps.</li></ul></div></section>
   </div>
   <section className={styles.panel}><div className={styles.panelHeader}>WHAT TO INCLUDE</div><div className={styles.panelBody}><table className={styles.retroTable}><tbody><tr><th>Page</th><td>The exact page or portal section where the problem occurred.</td></tr><tr><th>Action</th><td>What you clicked, submitted, uploaded, or changed.</td></tr><tr><th>Result</th><td>The error message, missing content, broken layout, or unexpected behavior you saw.</td></tr><tr><th>Screenshot</th><td>Attach one through the signed-in Hanami support tools when it helps show the bug.</td></tr></tbody></table></div></section>
  </div>
 </PublicSchoolShell>;
}
