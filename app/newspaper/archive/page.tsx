import PublicSchoolShell from "../../components/PublicSchoolShell";
import styles from "../../PublicRebuild.module.css";

const issues=[
 {term:"Spring Term",month:"April 2006",title:"Opening Edition",note:"School opening, new term notices, club recruitment, and campus updates."},
 {term:"Spring Term",month:"May 2006",title:"Campus Life Edition",note:"Student activities, academic notices, and organization news."},
 {term:"Rainy Season",month:"June 2006",title:"Rainy Season Edition",note:"Seasonal campus coverage, school notices, and student features."},
];

export default function NewspaperArchivePage(){return <PublicSchoolShell active="news" sectionTitle="THE HANAMI CHRONICLE" breadcrumb="Newspaper Archive" lastUpdated="08.26.2006">
 <div className={styles.pageTitle}><small>THE HANAMI CHRONICLE · ARCHIVE ROOM</small><h1>Newspaper Archive</h1><p>Browse Chronicle issues by school term and month. Current issues retain the printable newspaper view; archived entries remain available as the school year grows.</p></div>
 <section className={styles.section}><div className={styles.sectionHead}><h2>2006–07 Issues</h2><span>ARCHIVE INDEX</span></div><div className={styles.sectionBody}><table className={styles.retroTable}><thead><tr><th>Issue</th><th>Term</th><th>Edition</th><th>Access</th></tr></thead><tbody>{issues.map(issue=><tr key={issue.month}><td><strong>{issue.month}</strong><br/><small>{issue.note}</small></td><td>{issue.term}</td><td>{issue.title}</td><td><a href="../">Open Chronicle</a></td></tr>)}</tbody></table></div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Archive Notes</h2><span>WEB EDITION</span></div><div className={styles.sectionBody}><p>New editions can be added to this index as they are published. Print styling remains intentionally newspaper-like for saved or printed copies.</p><div className={styles.note}>RSS-style Chronicle updates are available from the school feeds page.</div></div></section>
 </PublicSchoolShell>}
