import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../network-pages.module.css";

const updates=[
 {date:"08/26/2026",title:"Retro network expansion begins",body:"Added the Webmaster desk, RSS-style school feeds, maintenance/network status, and expanded seasonal skin support.",kind:"SITE"},
 {date:"08/26/2026",title:"Portal workspace balance update",body:"Student and faculty workspaces were rebalanced around the navigation rail while preserving the 2006 Web 2.0 visual language.",kind:"PORTAL"},
 {date:"08/26/2026",title:"Text contrast and viewport fixes",body:"Dark filled controls now use final-priority black/white contrast and portal pages are constrained to the usable browser width.",kind:"FIX"},
 {date:"08/25/2026",title:"Profile and classroom customization expanded",body:"Character appearance tools and per-classroom banner customization were strengthened while keeping profiles private by default.",kind:"PROFILE"},
 {date:"08/25/2026",title:"Public network rebuild",body:"Public Hanami pages moved into the school-network shell with updated navigation, Chronicle presentation, search, and retro network details.",kind:"PUBLIC"}
];
export default function WhatsNewPage(){return <PublicSchoolShell sectionTitle="WHAT'S NEW" breadcrumb="What's New" lastUpdated="08.26.2026"><div className={styles.page}>
 <section className={styles.hero}><div className={styles.heroHeader}>WHAT&apos;S NEW AT HANAMI HIGH?</div><div className={styles.heroBody}><h2>Website Update Log</h2><p>A chronological list of recently added pages, fixes, and school-network changes. Look for the little <span className={styles.newBadge}>NEW!</span> marker on recent additions around the site.</p><div className={styles.links}><a href="../changelog/">Technical Change Log</a><a href="../feeds/">RSS-style Updates Feed</a><a href="../webmaster/">Webmaster</a></div></div></section>
 <section className={styles.panel}><div className={styles.panelHeader}>LATEST UPDATES</div><div className={`${styles.panelBody} ${styles.timeline}`}>{updates.map((item,index)=><article className={styles.updateCard} key={`${item.date}-${item.title}`}><div className={styles.date}>{item.date} · <span className={styles.badge}>{item.kind}</span> {index<2&&<span className={styles.newBadge}>NEW!</span>}</div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
 </div></PublicSchoolShell>}
