"use client";

import {useEffect,useMemo,useState} from "react";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Yearbook={character_id:string;portrait_url:string|null;quote:string;clubs_sports:string[];awards:string[];most_likely_to:string[];approved:boolean};
type Character={id:string;display_name:string;handle:string;role:string};

export default function YearbookPage(){
 const [rows,setRows]=useState<Yearbook[]>([]),[characters,setCharacters]=useState<Character[]>([]),[status,setStatus]=useState("Loading approved yearbook pages…");
 useEffect(()=>{let cancelled=false;void(async()=>{try{const headers={apikey:K};const [yr,cr]=await Promise.all([fetch(`${U}/rest/v1/yearbook_profiles?select=character_id,portrait_url,quote,clubs_sports,awards,most_likely_to,approved&approved=eq.true&order=updated_at.desc`,{headers}),fetch(`${U}/rest/v1/characters?select=id,display_name,handle,role&role=eq.student`,{headers})]);if(!yr.ok||!cr.ok)throw new Error();const [y,c]=await Promise.all([yr.json() as Promise<Yearbook[]>,cr.json() as Promise<Character[]>]);if(cancelled)return;setRows(y);setCharacters(c);setStatus(`${y.length} approved student page${y.length===1?"":"s"}.`)}catch{if(!cancelled)setStatus("Approved yearbook pages are not publicly available yet.")}})();return()=>{cancelled=true}},[]);
 const names=useMemo(()=>new Map(characters.map(c=>[c.id,c])),[characters]);
 return <PublicSchoolShell active="student-life" sectionTitle="YEARBOOK" breadcrumb="Student Yearbook" lastUpdated="08.26.2006">
  <div className={styles.pageTitle}><small>HANAMI HIGH · 2006–07</small><h1>Student Yearbook</h1><p>Approved student profiles, quotes, clubs, honors, superlatives, and school memories presented in a compact early-web directory.</p></div>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Approved Pages</h2><span>{status}</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{rows.map(row=>{const c=names.get(row.character_id);return <article className={styles.card} key={row.character_id}><div style={{height:120,border:"1px solid #c9c3b7",background:"linear-gradient(180deg,#eef0e8,#fffdf8)",display:"grid",placeItems:"center",overflow:"hidden"}}>{row.portrait_url?<img src={row.portrait_url} alt="Yearbook portrait" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{font:"700 30px Georgia,serif"}}>花</span>}</div><small>STUDENT PROFILE</small><h3>{c?.display_name??"Hanami Student"}</h3><p>{row.quote?`“${row.quote}”`:"No quote submitted."}</p><div className={styles.note}>Clubs: {(row.clubs_sports??[]).join(", ")||"—"}<br/>Awards: {(row.awards??[]).join(", ")||"—"}<br/>Most likely to: {(row.most_likely_to??[]).join(", ")||"—"}</div></article>})}</div>{!rows.length?<div className={styles.note}>{status} Students can prepare their yearbook page inside the Student portal.</div>:null}</div></section>
 </PublicSchoolShell>;
}
