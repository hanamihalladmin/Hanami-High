"use client";

import {FormEvent,useMemo,useState} from "react";
import styles from "./site-search.module.css";

type Category="All"|"Pages"|"Academics"|"Campus"|"News"|"People";

const entries=[
 {label:"Academic departments",detail:"Courses, honors, departments, and guidance",href:"./academics/",category:"Academics",path:"hanami.jp/academics"},
 {label:"Club directory",detail:"Sports, academic, arts, service, and special-interest clubs",href:"./organizations/",category:"Campus",path:"hanami.jp/campus/clubs"},
 {label:"Campus opportunities",detail:"Jobs, volunteering, internships, and student leadership",href:"./campus-life/#jobs",category:"Campus",path:"hanami.jp/campus/opportunities"},
 {label:"School calendar",detail:"Upcoming school and community events",href:"./calendar/",category:"Pages",path:"hanami.jp/calendar"},
 {label:"Faculty and staff",detail:"Leadership, teachers, and the school directory",href:"./about/",category:"People",path:"hanami.jp/directory/faculty"},
 {label:"Hanami Chronicle",detail:"School newspaper, features, announcements, and student stories",href:"./newspaper/",category:"News",path:"hanami.jp/chronicle"},
 {label:"Website guide",detail:"Learn how the public site, portals, profiles, and school tools work",href:"./guide/",category:"Pages",path:"hanami.jp/guide"},
 {label:"Rules & guidelines",detail:"Community rules, roleplay standards, and website policies",href:"./rules/",category:"Pages",path:"hanami.jp/rules"},
];

const categories:Category[]=["All","Pages","Academics","Campus","News","People"];

export default function SiteSearch(){
 const [query,setQuery]=useState("");
 const [submitted,setSubmitted]=useState(false);
 const [category,setCategory]=useState<Category>("All");
 const matches=useMemo(()=>{
  const needle=query.trim().toLowerCase();
  return entries.filter(entry=>{
   const inCategory=category==="All"||entry.category===category;
   const inQuery=!needle||`${entry.label} ${entry.detail} ${entry.category}`.toLowerCase().includes(needle);
   return inCategory&&inQuery;
  });
 },[query,category]);
 function handleSubmit(event:FormEvent<HTMLFormElement>){event.preventDefault();setSubmitted(true)}
 function lucky(){const result=matches[0]??entries[0];window.location.href=result.href}
 return <section className={styles.search} aria-labelledby="search-heading">
  <div className={styles.browserbar}>
   <span>Hanami Network</span>
   <div className={styles.address}>http://www.hanami.jp/search</div>
   <span>2006</span>
  </div>
  <div className={styles.main}>
   <div className={styles.wordmark} aria-hidden="true"><span>H</span>anami<small>Search</small></div>
   <h2 id="search-heading">Search the Hanami High School Network</h2>
   <div className={styles.tabs} role="tablist" aria-label="Search categories">
    {categories.map(item=><button key={item} type="button" className={category===item?styles.active:""} onClick={()=>{setCategory(item);setSubmitted(Boolean(query.trim()))}}>{item}</button>)}
   </div>
   <form className={styles.form} role="search" onSubmit={handleSubmit}>
    <label className="sr-only" htmlFor="school-search">Search Hanami High</label>
    <input id="school-search" onChange={event=>{setQuery(event.target.value);setSubmitted(false)}} placeholder="Search Hanami High…" type="search" value={query}/>
    <div className={styles.actions}><button type="submit">Hanami Search</button><button type="button" onClick={lucky}>I&apos;m Feeling Lucky</button></div>
   </form>
   <p className={styles.hint}>Try: clubs, courses, calendar, Chronicle, faculty, jobs, rules</p>
  </div>
  {submitted&&<div className={styles.results} aria-live="polite">
   <div className={styles.summary}>Results for <b>“{query||"Hanami High"}”</b> · {matches.length} result{matches.length===1?"":"s"}</div>
   {matches.length?matches.map(entry=><article key={entry.label}>
    <a className={styles.resultTitle} href={entry.href}>{entry.label}</a>
    <div className={styles.resultPath}>{entry.path}</div>
    <p>{entry.detail}</p>
    <span>{entry.category}</span>
   </article>):<div className={styles.empty}><h3>No results found.</h3><p>Try a broader term or choose another category.</p></div>}
  </div>}
  <footer className={styles.footer}>Hanami Search · School Network Directory · Public results only</footer>
 </section>
}
