import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../network-pages.module.css";

const feeds=[
 {title:"The Chronicle",desc:"School newspaper headlines, issue notices, and archive updates.",href:"../newspaper/"},
 {title:"School Announcements",desc:"Published school notices, schedule changes, and important reminders.",href:"../changelog/"},
 {title:"Clubs & Activities",desc:"Recruitment notices, meetings, campus events, and organization updates.",href:"../campus-life/"},
 {title:"Website Updates",desc:"New pages, fixes, portal changes, and network maintenance notes.",href:"../whats-new/"}
];
export default function FeedsPage(){return <PublicSchoolShell sectionTitle="SCHOOL FEEDS" breadcrumb="RSS-style Feeds" lastUpdated="08.26.2026"><div className={styles.page}>
 <section className={styles.hero}><div className={styles.heroHeader}>SUBSCRIBE TO HANAMI HIGH</div><div className={styles.heroBody}><h2>RSS-style School Feeds</h2><p>These are visual feed shortcuts inspired by the orange RSS buttons found across 2000s websites. They open the live Hanami pages instead of requiring a separate feed reader.</p></div></section>
 <section className={styles.panel}><div className={styles.panelHeader}>AVAILABLE FEEDS</div><div className={`${styles.panelBody} ${styles.rssList}`}>{feeds.map(feed=><div className={styles.rssRow} key={feed.title}><span className={styles.rssBadge}>RSS</span><div><b>{feed.title}</b><div className={styles.small}>{feed.desc}</div></div><a className={styles.button} href={feed.href}>Open feed</a></div>)}</div></section>
 <section className={styles.panel}><div className={styles.panelHeader}>FEED NOTES</div><div className={styles.panelBody}><p><span className={styles.newBadge}>NEW!</span> Tiny orange feed badges can be reused beside Chronicle headlines, announcement modules, club pages, and the What&apos;s New page as those sections expand.</p></div></section>
 </div></PublicSchoolShell>}
