"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import PublicSchoolShell from "../components/PublicSchoolShell";
import ChronicleEditorDesk from "./ChronicleEditorDesk";
import styles from "../PublicRebuild.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Article={id:string;section:string;headline:string;dek:string;body:string;published_at:string;author_name:string|null;author_handle:string|null};
function pretty(v:string){return v.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}

export default function NewspaperPage(){
 const [articles,setArticles]=useState<Article[]>([]);
 const [status,setStatus]=useState("Loading the latest issue…");
 const [section,setSection]=useState("all");
 const load=useCallback(async()=>{try{const r=await fetch(`${U}/rest/v1/rpc/public_newspaper_feed`,{method:"POST",headers:{apikey:K,"Content-Type":"application/json"},body:JSON.stringify({row_limit:80}),cache:"no-store"});if(!r.ok)throw new Error("The Chronicle could not be loaded.");const data=await r.json() as Article[];setArticles(data);setStatus(data.length?"The latest Hanami stories are live.":"No issue has been published yet.");}catch(e){setStatus(e instanceof Error?e.message:"The Chronicle could not be loaded.")}},[]);
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener("hanami-chronicle-published",refresh);return()=>window.removeEventListener("hanami-chronicle-published",refresh)},[load]);
 const sections=useMemo(()=>["all",...Array.from(new Set(articles.map(a=>a.section)))],[articles]);
 const visible=section==="all"?articles:articles.filter(a=>a.section===section);
 const lead=visible[0];
 return <PublicSchoolShell active="news" sectionTitle="HANAMI CHRONICLE" breadcrumb="Student Newspaper" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>STUDENT NEWSPAPER · HANAMI CITY · 2006</small><h1>The Hanami Chronicle</h1><p>Approved student reporting, school stories, announcements, features, and archive pieces from the Hanami community.</p><div className={styles.printTools}><button type="button" onClick={()=>window.print()}>Print this Chronicle view</button><span>Printer-friendly edition · current section only</span></div></div>

  <section className={styles.quick} aria-label="Newspaper sections"><h3>SECTIONS</h3><nav>{sections.map(s=><button key={s} type="button" onClick={()=>setSection(s)}>{section===s?"» ":""}{s==="all"?"Front Page":pretty(s)}</button>)}</nav></section>

  <section className={styles.section}><div className={styles.sectionHead}><h2>{section==="all"?"Front Page":pretty(section)}</h2><span>{status}</span></div><div className={styles.sectionBody}>{lead?<div className={styles.stack}>{visible.map((article,index)=><article className={index===0?styles.welcome:styles.box} key={article.id}>{index===0?<><small>{pretty(article.section).toUpperCase()}</small><h2>{article.headline}</h2><p>{article.dek||article.body.slice(0,180)}</p><div className={styles.note}>By {article.author_name||"Hanami Chronicle Staff"} · {new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",year:"numeric"}).format(new Date(article.published_at))}</div><div className={styles.sectionBody}><p>{article.body}</p></div></>:<><div className={styles.boxHead}><h3>{article.headline}</h3><span>{pretty(article.section).toUpperCase()}</span></div><div className={styles.boxBody}><p>{article.dek||article.body.slice(0,180)}</p><small>{article.author_name||"Chronicle Staff"} · {new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric"}).format(new Date(article.published_at))}</small></div></>}</article>)}</div>:<div className={styles.note}>The presses are quiet. When Hanami&apos;s student writers publish the first approved story, it will appear here.</div>}</div></section>
  <ChronicleEditorDesk/>
 </PublicSchoolShell>
}
