"use client";

import {FormEvent,useState} from "react";
import styles from "./SearchEverythingPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};}
type Result={id:string;kind:string;title:string;subtitle:string;detail:string;href?:string;profileHandle?:string};
type Props={accessToken:string;characterId:string};

const sitePages:Result[]=[
 {id:"page-home",kind:"Website Page",title:"Home",subtitle:"Public website",detail:"Hanami High homepage, school status, announcements, and featured information.",href:"../../"},
 {id:"page-about",kind:"Website Page",title:"About Hanami",subtitle:"Public website",detail:"School history, leadership, faculty directory, and contact information.",href:"../../about/"},
 {id:"page-academics",kind:"Website Page",title:"Academics",subtitle:"Public website",detail:"Departments, course catalog, academic programs, and guidance.",href:"../../academics/"},
 {id:"page-campus",kind:"Website Page",title:"Campus Life",subtitle:"Public website",detail:"Clubs, activities, opportunities, galleries, and campus life.",href:"../../campus-life/"},
 {id:"page-calendar",kind:"Website Page",title:"School Calendar",subtitle:"Public website",detail:"Published school events and important dates.",href:"../../calendar/"},
 {id:"page-organizations",kind:"Website Page",title:"Organizations",subtitle:"Public website",detail:"Official clubs, student organizations, and participation information.",href:"../../organizations/"},
 {id:"page-sports",kind:"Website Page",title:"Sports",subtitle:"Public website",detail:"Athletics, teams, standings, and sports information.",href:"../../sports/"},
 {id:"page-elections",kind:"Website Page",title:"Elections",subtitle:"Public website",detail:"Student elections, candidates, and election information.",href:"../../elections/"},
 {id:"page-homeroom",kind:"Website Page",title:"Homeroom",subtitle:"Public website",detail:"Homeroom information, notices, representatives, and events.",href:"../../homeroom/"},
 {id:"page-rooms",kind:"Website Page",title:"Rooms",subtitle:"Public website",detail:"Campus room and location directory.",href:"../../rooms/"},
 {id:"page-traditions",kind:"Website Page",title:"Traditions",subtitle:"Public website",detail:"Hanami High traditions, festivals, and school customs.",href:"../../traditions/"},
 {id:"page-rules",kind:"Website Page",title:"Rules & Conduct",subtitle:"Public website",detail:"Community, roleplay, conduct, and school rules.",href:"../../rules/"},
 {id:"page-apply",kind:"Website Page",title:"Apply",subtitle:"Public website",detail:"Student and Faculty enrollment intake.",href:"../../apply/"},
 {id:"page-updates",kind:"Website Page",title:"Website Updates",subtitle:"Public website",detail:"Website development and school-network updates.",href:"../../updates/"},
 {id:"page-changelog",kind:"Website Page",title:"Changelog",subtitle:"Public website",detail:"Published Hanami High website version history.",href:"../../changelog/"},
 {id:"page-help",kind:"Portal Page",title:"Portal Help",subtitle:"Hanami Portal",detail:"Portal guidance and support information.",href:"../help/"},
 {id:"page-city",kind:"Portal Page",title:"Hanami City",subtitle:"Signed-in portal",detail:"Transit, stations, neighborhoods, and commute information.",href:"../city/"},
 {id:"page-roadmap",kind:"Portal Page",title:"Roadmap Hub",subtitle:"Signed-in portal",detail:"Orientation, sign-ups, volunteer hours, mentorship, feedback, and templates.",href:"../roadmap/"},
 {id:"page-lore",kind:"Portal Page",title:"Lore & Canon",subtitle:"Signed-in portal",detail:"Published Hanami lore and canon entries.",href:"../lore/"}
];

export default function SearchEverythingPanel({accessToken,characterId}:Props){
 const [query,setQuery]=useState("");const [results,setResults]=useState<Result[]>([]);const [status,setStatus]=useState("Search website pages, people, classes, clubs, rules, events, resources, messages, assignments, and opportunities you are allowed to see.");const [searching,setSearching]=useState(false);
 async function run(event:FormEvent){event.preventDefault();const term=query.trim();if(term.length<2){setStatus("Enter at least 2 characters.");return;}setSearching(true);setStatus("Searching your Hanami access…");const pattern=`*${term.replace(/[,*()]/g," ")}*`;const get=async(path:string)=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:headers(accessToken)});return r.ok?await r.json():[];}catch{return [];}};
  const [people,handbook,activities,events,assignments,messages,opportunities,documents]=await Promise.all([
   get(`characters?select=id,display_name,handle,role,visibility&or=(display_name.ilike.${encodeURIComponent(pattern)},handle.ilike.${encodeURIComponent(pattern)})&limit=24`),
   get(`handbook_sections?select=id,title,category,body&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},body.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`campus_activities?select=id,name,kind,description&is_active=eq.true&or=(name.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=20`),
   get(`school_events?select=id,title,category,description,starts_at&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`course_assignments?select=id,title,description,due_at,section_id&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`conversation_messages?select=id,conversation_id,body,created_at&body=ilike.${encodeURIComponent(pattern)}&limit=12`),
   get(`campus_opportunities?select=id,title,department,description,opportunity_type&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`),
   get(`school_documents?select=id,title,category,description&status=eq.published&or=(title.ilike.${encodeURIComponent(pattern)},description.ilike.${encodeURIComponent(pattern)})&limit=12`)
  ]);
  const lower=term.toLowerCase();const next:Result[]=sitePages.filter(page=>`${page.title} ${page.subtitle} ${page.detail}`.toLowerCase().includes(lower));
  for(const row of people)next.push({id:`person-${row.id}`,kind:"Person",title:row.display_name,subtitle:`@${row.handle} • ${row.role}`,detail:`Profile visibility: ${String(row.visibility).replaceAll("_"," ")}`,profileHandle:row.handle});
  for(const row of handbook)next.push({id:`rule-${row.id}`,kind:"Handbook / Rules",title:row.title,subtitle:String(row.category).replaceAll("_"," "),detail:String(row.body).slice(0,180),href:"../../rules/"});
  for(const row of activities)next.push({id:`club-${row.id}`,kind:"Club / Organization",title:row.name,subtitle:String(row.kind).replaceAll("_"," "),detail:row.description||"No description",href:"../../organizations/"});
  for(const row of events)next.push({id:`event-${row.id}`,kind:"Event",title:row.title,subtitle:`${row.category??"school"}${row.starts_at?` • ${new Date(row.starts_at).toLocaleDateString()}`:""}`,detail:row.description||"No description",href:"../../calendar/"});
  for(const row of assignments)next.push({id:`assignment-${row.id}`,kind:"Assignment",title:row.title,subtitle:row.due_at?`Due ${new Date(row.due_at).toLocaleString()}`:"No due date",detail:row.description||"No description"});
  for(const row of messages)next.push({id:`message-${row.id}`,kind:"Message",title:"Message result",subtitle:new Date(row.created_at).toLocaleString(),detail:String(row.body).slice(0,220)});
  for(const row of opportunities)next.push({id:`opportunity-${row.id}`,kind:"Opportunity",title:row.title,subtitle:`${row.department??"Hanami High"} • ${String(row.opportunity_type).replaceAll("_"," ")}`,detail:row.description||"No description",href:"../../campus-life/#jobs"});
  for(const row of documents)next.push({id:`document-${row.id}`,kind:"Resource",title:row.title,subtitle:String(row.category).replaceAll("_"," "),detail:row.description||"School resource"});
  setResults(next);setStatus(`${next.length} result${next.length===1?"":"s"} found through your current character permissions.`);setSearching(false);
 }
 function openProfile(handle:string){window.dispatchEvent(new CustomEvent("hanami-open-profile",{detail:{handle}}));const target=document.getElementById("dashboard-profile-lookup");if(target instanceof HTMLDetailsElement)target.open=true;target?.scrollIntoView({behavior:"smooth",block:"start"});}
 return <section className={styles.panel} aria-labelledby="search-everything-title"><div className={styles.heading}><div><p className="eyebrow">HANAMI NETWORK SEARCH</p><h4 id="search-everything-title">Search Everything</h4></div><span>PERMISSION AWARE</span></div><form className={styles.form} onSubmit={run}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search pages, people, clubs, classes…" aria-label="Search Hanami"/><button disabled={searching}>{searching?"Searching…":"Search"}</button></form><div className={styles.status}>{status}</div>{results.length>0&&<div className={styles.results}>{results.map(item=><article key={item.id}><p className="eyebrow">{item.kind.toUpperCase()}</p><h5>{item.title}</h5><span>{item.subtitle}</span><p>{item.detail}</p>{item.profileHandle?<button type="button" onClick={()=>openProfile(item.profileHandle!)}>Open profile →</button>:item.href&&<a href={item.href}>Open page →</a>}</article>)}</div>}</section>;
}
