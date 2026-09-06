"use client";

import {useEffect,useState} from "react";
import {hanamiRoleplayNow} from "./roleplay-date";
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type EventRow={id:string;title:string;location:string|null;starts_at:string;all_day:boolean;category:string};
export default function LiveUpcomingEvents(){
 const [items,setItems]=useState<EventRow[]>([]);const [message,setMessage]=useState("Loading upcoming events…");
 useEffect(()=>{let cancelled=false;async function load(){try{const now=encodeURIComponent(hanamiRoleplayNow().toISOString());const response=await fetch(`${SUPABASE_URL}/rest/v1/school_calendar_events?select=id,title,location,starts_at,all_day,category&status=eq.published&starts_at=gte.${now}&order=starts_at.asc&limit=4`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store"});if(!response.ok)throw new Error();const rows=await response.json() as EventRow[];if(!cancelled){setItems(rows);setMessage(rows.length?`${rows.length} upcoming event${rows.length===1?"":"s"}.`:"No upcoming events are published yet.");}}catch{if(!cancelled)setMessage("Upcoming events could not be loaded.");}}void load();return()=>{cancelled=true;};},[]);
 return <section className="panel" id="upcoming-school-events"><h2 className="panel-title">UPCOMING SCHOOL EVENTS</h2><div className="panel-body" style={{display:"grid",gap:9}}><small aria-live="polite">{message}</small>{items.map(item=>{const date=new Date(item.starts_at);return <article key={item.id} style={{borderTop:"1px dotted #c8b6be",paddingTop:8}}><p className="eyebrow" style={{marginBottom:3}}>{item.category.toUpperCase()}</p><strong style={{display:"block",color:"#17375f"}}>{item.title}</strong><small>{new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",weekday:"short",year:"numeric",hour:item.all_day?undefined:"numeric",minute:item.all_day?undefined:"2-digit",timeZone:"Asia/Tokyo"}).format(date)}{item.location?` • ${item.location}`:""}</small></article>})}<a className="text-link" href="./calendar/">View complete calendar →</a></div></section>;
}
