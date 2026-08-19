"use client";

import {FormEvent,useState} from "react";
import styles from "./SearchEverythingPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};}
type Result={id:string;kind:string;title:string;subtitle:string;detail:string;href?:string};
type Props={accessToken:string;characterId:string};

export default function SearchEverythingPanel({accessToken,characterId}:Props){
 const [query,setQuery]=useState("");const [results,setResults]=useState<Result[]>([]);const [status,setStatus]=useState("Search people, classes, clubs, rules, events, resources, messages, assignments, and opportunities you are allowed to see.");const [searching,setSearching]=useState(false);
 async function run(event:FormEvent){event.preventDefault();const term=query.trim();if(term.length<2){setStatus("Enter at least 2 characters.");return;}setSearching(true);setStatus("Searching your Hanami access…");const pattern=`*${term.replace(/[,*()]/g," ")}*`;const get=async(path:string)=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:headers(accessToken)});return r.ok?await r.json():[];}catch{return [];}};
  const [people,handbook,activities,events,assignments,messages,opportunities,documents]=await Promise.all([
   get(`characters?select=id,display_name,handle,role,visibility&or=(display_name.ilike.${encodeURIComponent(pattern)},handle.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`handbook_sections?select=id,title,category,body&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},body.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`campus_activities?select=id,name,kind,description&is_active=eq.true&or=(name.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`school_events?select=id,title,category,description,starts_at&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`course_assignments?select=id,title,description,due_at,section_id&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`conversation_messages?select=id,conversation_id,body,created_at&body=ilike.${encodeURIComponent(pattern)}&limit=12`),
   get(`campus_opportunities?select=id,title,organization,description,opportunity_type&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`school_documents?select=id,title,category,description&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`)
  ]);
  const next:Result[]=[];
  for(const row of people)next.push({id:`person-${row.id}`,kind:"Person",title:row.display_name,subtitle:`@${row.handle} • ${row.role}`,detail:`Profile visibility: ${String(row.visibility).replaceAll("_"," ")}`});
  for(const row of handbook)next.push({id:`rule-${row.id}`,kind:"Handbook / Rules",title:row.title,subtitle:String(row.category).replaceAll("_"," "),detail:String(row.body).slice(0,180),href:"../../rules/"});
  for(const row of activities)next.push({id:`club-${row.id}`,kind:"Club / Organization",title:row.name,subtitle:String(row.kind).replaceAll("_"," "),detail:row.description||"No description",href:"../../organizations/"});
  for(const row of events)next.push({id:`event-${row.id}`,kind:"Event",title:row.title,subtitle:`${row.category??"school"}${row.starts_at?` • ${new Date(row.starts_at).toLocaleDateString()}`:""}`,detail:row.description||"No description",href:"../../calendar/"});
  for(const row of assignments)next.push({id:`assignment-${row.id}`,kind:"Assignment",title:row.title,subtitle:row.due_at?`Due ${new Date(row.due_at).toLocaleString()}`:"No due date",detail:row.description||"No description"});
  for(const row of messages)next.push({id:`message-${row.id}`,kind:"Message",title:"Message result",subtitle:new Date(row.created_at).toLocaleString(),detail:String(row.body).slice(0,220)});
  for(const row of opportunities)next.push({id:`opportunity-${row.id}`,kind:"Opportunity",title:row.title,subtitle:`${row.organization??"Hanami High"} • ${String(row.opportunity_type).replaceAll("_"," ")}`,detail:row.description||"No description",href:"../../campus-life/#jobs"});
  for(const row of documents)next.push({id:`document-${row.id}`,kind:"Resource",title:row.title,subtitle:String(row.category).replaceAll("_"," "),detail:row.description||"School resource"});
  setResults(next);setStatus(`${next.length} result${next.length===1?"":"s"} found through your current character permissions.`);setSearching(false);
 }
 return <section className={styles.panel} aria-labelledby="search-everything-title"><div className={styles.heading}><div><p className="eyebrow">HANAMI NETWORK SEARCH</p><h4 id="search-everything-title">Search Everything</h4></div><span>PERMISSION AWARE</span></div><form className={styles.form} onSubmit={run}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Hanami…" aria-label="Search Hanami"/><button disabled={searching}>{searching?"Searching…":"Search"}</button></form><div className={styles.status}>{status}</div>{results.length>0&&<div className={styles.results}>{results.map(item=><article key={item.id}><p className="eyebrow">{item.kind.toUpperCase()}</p><h5>{item.title}</h5><span>{item.subtitle}</span><p>{item.detail}</p>{item.href&&<a href={item.href}>Open section →</a>}</article>)}</div>}</section>;
}
