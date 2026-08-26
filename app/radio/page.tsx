import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const schedule=[
 ["08:05","Morning Announcements","School notices, weather, schedule reminders, and event updates."],
 ["12:35","Lunch Broadcast","Student announcements, club notices, and music requests."],
 ["15:45","After-School Update","Club meetings, athletics, transit reminders, and tomorrow's notices."],
];

export default function RadioPage(){return <PublicSchoolShell active="news" sectionTitle="HANAMI SCHOOL RADIO" breadcrumb="Radio & Broadcast" lastUpdated="08.26.2006">
 <div className={styles.pageTitle}><small>HANAMI BROADCAST CLUB · WEB PLAYER EDITION</small><h1>School Radio & Broadcast</h1><p>Morning announcements, school broadcast times, DJ notes, and an archive-style player presented like a tiny 2006 media page.</p></div>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Now Playing</h2><span>HANAMI RADIO 2006</span></div><div className={styles.sectionBody}><div style={{border:"2px inset #b8b8b8",background:"linear-gradient(#f8f8f8,#d9d9d9)",padding:12,maxWidth:520}}><div style={{background:"#17283c",color:"white",padding:"8px 10px",fontFamily:"Courier New,monospace",fontSize:11}}>▶ HANAMI SCHOOL NETWORK · BROADCAST STANDBY</div><div style={{display:"flex",gap:6,marginTop:8}}><button type="button" disabled>◀</button><button type="button" disabled>▶</button><button type="button" disabled>■</button><span style={{fontSize:9,alignSelf:"center"}}>Live audio is not currently attached to the school network.</span></div></div></div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Daily Broadcast Schedule</h2><span>JST</span></div><div className={styles.sectionBody}><table className={styles.retroTable}><thead><tr><th>Time</th><th>Program</th><th>Details</th></tr></thead><tbody>{schedule.map(([time,title,details])=><tr key={time}><td>{time}</td><td><strong>{title}</strong></td><td>{details}</td></tr>)}</tbody></table></div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Broadcast Archive</h2><span>COMING ONLINE</span></div><div className={styles.sectionBody}><p>Published school broadcasts and morning-announcement recordings can be indexed here as the archive grows.</p><div className={styles.note}>The page is intentionally styled like an early web media player, while future playback can use modern accessible controls underneath.</div></div></section>
 </PublicSchoolShell>}
