"use client";

import {useEffect,useState} from "react";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Faculty={id:string;display_name:string;handle:string;role:string;visibility:string};
const departments=[
 ["Administration","School operations, records, enrollment, and campus oversight."],
 ["Mathematics","Mathematics courses and academic support."],
 ["English","English language and literature courses."],
 ["Science","General science courses and laboratory instruction."],
 ["History","History and social studies courses."],
 ["Physical Education","Physical education and athletics support."],
 ["Arts & Computing","Art and computer instruction on the rotating schedule."],
];
const homerooms=["Homeroom A","Homeroom B","Homeroom C"];

export default function DirectoryPage(){
 const [faculty,setFaculty]=useState<Faculty[]>([]);const [status,setStatus]=useState("Loading published faculty profiles…");
 useEffect(()=>{let cancelled=false;void(async()=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/characters?select=id,display_name,handle,role,visibility&role=eq.faculty&visibility=eq.public&is_active=eq.true&order=display_name.asc`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!r.ok)throw new Error();const rows=await r.json() as Faculty[];if(!cancelled){setFaculty(rows);setStatus(rows.length?`${rows.length} published faculty profile${rows.length===1?"":"s"}.`:"No faculty profiles are public yet.");}}catch{if(!cancelled)setStatus("Faculty listings are available through the signed-in portal while the public directory is unavailable.")}})();return()=>{cancelled=true}},[]);
 return <PublicSchoolShell active="directory" sectionTitle="DIRECTORY" breadcrumb="School Directory" lastUpdated="08.26.2006">
  <div className={styles.pageTitle}><small>HANAMI HIGH SCHOOL NETWORK</small><h1>School Directory</h1><p>A classic school-network directory for departments, homerooms, offices, and faculty who have chosen to publish their profiles.</p></div>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Departments & Offices</h2><span>2006–07 DIRECTORY</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{departments.map(([name,description])=><article className={styles.card} key={name}><h3>{name}</h3><p>{description}</p><small>OFFICE HOURS · SEE FACULTY PORTAL / BY APPOINTMENT</small></article>)}</div></div></section>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Homerooms</h2><span>1ST + 2ND YEAR</span></div><div className={styles.sectionBody}><div className={styles.threeCol}>{homerooms.map(room=><article className={styles.card} key={room}><small>HOMEROOM</small><h3>{room}</h3><p>Mixed first- and second-year student homeroom. Teacher and roster information is shown when published.</p></article>)}</div></div></section>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Published Faculty</h2><span>{status}</span></div><div className={styles.sectionBody}>{faculty.length?<div className={styles.cardGrid}>{faculty.map(person=><article className={styles.card} key={person.id}><small>FACULTY PROFILE</small><h3>{person.display_name}</h3><p>@{person.handle}</p><div className={styles.note}>Office hours: see the Teacher Office Hours area in the signed-in portal.</div></article>)}</div>:<div className={styles.note}>{status}</div>}</div></section>
 </PublicSchoolShell>;
}
