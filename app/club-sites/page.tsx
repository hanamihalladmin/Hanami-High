"use client";

import {useEffect,useState} from "react";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Activity={id:string;name:string;description:string;meeting_location:string|null;meeting_schedule:string|null;kind:string};

export default function ClubSitesPage(){
 const [activities,setActivities]=useState<Activity[]>([]),[status,setStatus]=useState("Loading club pages…");
 useEffect(()=>{let cancelled=false;void(async()=>{try{const r=await fetch(`${U}/rest/v1/campus_activities?select=id,name,description,meeting_location,meeting_schedule,kind&is_active=eq.true&kind=eq.club&order=name.asc`,{headers:{apikey:K}});if(!r.ok)throw new Error();const rows=await r.json() as Activity[];if(cancelled)return;setActivities(rows);setStatus(`${rows.length} club microsite${rows.length===1?"":"s"} available.`)}catch{if(!cancelled)setStatus("Club microsites are unavailable right now.")}})();return()=>{cancelled=true}},[]);
 return <PublicSchoolShell active="student-life" sectionTitle="CLUB SITES" breadcrumb="Club Microsites" lastUpdated="08.26.2006">
  <div className={styles.pageTitle}><small>HANAMI STUDENT WEBRING</small><h1>Club Microsites</h1><p>Small early-MySpace-style club pages with banners, officer information, meeting details, galleries, recruitment notes, and news posts.</p></div>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Club Webring</h2><span>{status}</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{activities.map((activity,index)=><article className={styles.card} key={activity.id}><div style={{minHeight:70,border:"1px solid #9aa7b4",background:index%2?"linear-gradient(180deg,#dfe8ef,#f8fbfd)":"linear-gradient(180deg,#e7ecdf,#fffdf8)",display:"flex",alignItems:"end",padding:9,font:"700 15px Trebuchet MS,Verdana,sans-serif",boxShadow:"inset 0 1px #fff"}}>{activity.name}</div><small>CLUB HOMEPAGE</small><h3>{activity.name}</h3><p>{activity.description||"No club description posted."}</p><div className={styles.note}>Meets: {activity.meeting_schedule||"Not posted"}<br/>Room: {activity.meeting_location||"Not posted"}<br/>Sections: Officers · News · Gallery · Recruitment</div></article>)}</div></div></section>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Editing & Privacy</h2><span>OFFICER TOOLS</span></div><div className={styles.sectionBody}><p>Club membership continues to use the existing Student Activities system. Microsite editing is reserved for authorized club officers/advisers; ordinary members can browse the club page without changing its presentation.</p><div className={styles.welcomeActions}><a href="../organizations/">Club Directory</a><a href="../portal/">Open Student Portal</a></div></div></section>
 </PublicSchoolShell>;
}
