import PublicSchoolShell from "../components/PublicSchoolShell";
import AdminOwnerOnly from "../components/AdminOwnerOnly";
import styles from "../network-pages.module.css";

const feeds=[
 {title:"The Chronicle",desc:"School newspaper headlines, issue notices, and archive updates.",href:"../newspaper/"},
 {title:"School Announcements",desc:"Published school notices, schedule changes, and important reminders.",href:"../changelog/"},
 {title:"Clubs & Activities",desc:"Recruitment notices, meetings, campus events, and organization updates.",href:"../campus-life/"},
 {title:"Website Updates",desc:"New pages, fixes, portal changes, and network maintenance notes.",href:"../whats-new/"}
];
export default function FeedsPage(){return <PublicSchoolShell sectionTitle="SCHOOL FEEDS" breadcrumb="Internal Feeds" lastUpdated="09.06.2006"><AdminOwnerOnly label="RSS-style school feeds"><div className={styles.page}>
 <section className={styles.hero}><div className={styles.heroHeader}>HANAMI INTERNAL FEEDS</div><div className={styles.heroBody}><h2>School Network Feeds</h2><p>Administration and Owner shortcuts for monitoring published school-network sections.</p></div></section>
 <section className={styles.panel}><div className={styles.panelHeader}>AVAILABLE FEEDS</div><div className={`${styles.panelBody} ${styles.rssList}`}>{feeds.map(feed=><div className={styles.rssRow} key={feed.title}><span className={styles.rssBadge}>RSS</span><div><b>{feed.title}</b><div className={styles.small}>{feed.desc}</div></div><a className={styles.button} href={feed.href}>Open feed</a></div>)}</div></section>
 </div></AdminOwnerOnly></PublicSchoolShell>}
