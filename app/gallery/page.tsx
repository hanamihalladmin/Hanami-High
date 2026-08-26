import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const albums=[
 ["Spring Opening","Campus opening week, classroom arrivals, and first club notices."],
 ["Clubs & Activities","Student organizations, practices, meetings, and recruitment days."],
 ["School Events","Assemblies, seasonal events, festivals, and school-wide gatherings."],
 ["Athletics","Physical education, sports fixtures, and campus recreation."],
 ["Classroom Life","Selected classroom and project photos approved for the school gallery."],
 ["Seasonal Hanami","Sakura, rainy season, cultural festival, winter, and exam-week snapshots."],
];

export default function GalleryPage(){return <PublicSchoolShell active="student-life" sectionTitle="PHOTO GALLERY" breadcrumb="School Photo Gallery" lastUpdated="08.26.2006">
 <div className={styles.pageTitle}><small>HANAMI HIGH MEDIA CENTER</small><h1>School Photo Gallery</h1><p>A compact 2006-style album index for school events, clubs, seasonal photos, field activities, sports, and campus life.</p></div>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Albums</h2><span>TINY THUMBNAILS · BIG MEMORIES</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{albums.map(([title,description],index)=><article className={styles.card} key={title}><div style={{height:96,border:"1px solid #c9c3b7",background:"linear-gradient(135deg,#eef0e8,#fffdf8)",display:"grid",placeItems:"center",font:"700 22px Georgia,serif"}} aria-hidden="true">▧ {String(index+1).padStart(2,"0")}</div><small>PHOTO ALBUM</small><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
 <section className={styles.section}><div className={styles.sectionHead}><h2>Gallery Policy</h2><span>SCHOOL NETWORK</span></div><div className={styles.sectionBody}><div className={styles.note}>Only school-approved images should appear here. Character profile media remains governed by each character&apos;s privacy settings.</div></div></section>
 </PublicSchoolShell>}
