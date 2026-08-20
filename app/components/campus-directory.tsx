"use client";

import {useEffect,useMemo,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Activity={id:string;kind:string;name:string;description:string;meeting_location:string|null;meeting_schedule:string|null};

export default function CampusDirectory(){
 const [activities,setActivities]=useState<Activity[]>([]);const [status,setStatus]=useState("Loading campus directory…");const [query,setQuery]=useState("");const [type,setType]=useState("All");
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/campus_activities?select=id,kind,name,description,meeting_location,meeting_schedule&is_active=eq.true&order=name.asc`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store"});if(!response.ok)throw new Error();const rows=await response.json() as Activity[];if(!cancelled){setActivities(rows);setStatus(rows.length?`${rows.length} active campus activit${rows.length===1?"y":"ies"}.`:"No clubs, teams, or organizations have been published yet.");}}catch{if(!cancelled)setStatus("The campus directory could not be loaded right now.");}}void load();return()=>{cancelled=true;};},[]);
 const types=useMemo(()=>["All",...Array.from(new Set(activities.map(item=>item.kind))).sort()],[activities]);
 const matches=useMemo(()=>activities.filter(item=>(type==="All"||item.kind===type)&&`${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())),[activities,query,type]);
 return <section className="info-section" id="directory"><div className="section-heading"><h2>CLUBS, ATHLETICS & ORGANIZATIONS</h2><span>{matches.length} SHOWN</span></div><p className="content-note" aria-live="polite">{status}</p><div className="campus-directory-controls"><label><span>Search activities</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search clubs, teams, or interests"/></label><label><span>Activity type</span><select value={type} onChange={event=>setType(event.target.value)}>{types.map(value=><option key={value} value={value}>{value==="All"?"All":value.replaceAll("_"," ")}</option>)}</select></label></div><div className="activity-results" aria-live="polite">{matches.length?matches.map(item=><article key={item.id}><p className="eyebrow">{item.kind.replaceAll("_"," ")}</p><h3>{item.name}</h3><p>{item.description||"No description posted yet."}</p><dl><div><dt>Meets</dt><dd>{item.meeting_schedule||"Not posted"}</dd></div><div><dt>Location</dt><dd>{item.meeting_location||"Not posted"}</dd></div></dl></article>):<p className="no-results">{activities.length?"No activities match that search.":"No campus activities have been added yet."}</p>}</div></section>;
}
