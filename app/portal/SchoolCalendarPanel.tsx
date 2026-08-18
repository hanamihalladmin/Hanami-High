"use client";

import {useEffect,useState} from "react";
import styles from "./SchoolCalendarPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type EventRow={id:string;title:string;description:string;location:string|null;starts_at:string;ends_at:string|null;all_day:boolean;category:string;featured:boolean;is_test_data:boolean};
type Props={accessToken:string};
function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}

export default function SchoolCalendarPanel({accessToken}:Props){
 const [items,setItems]=useState<EventRow[]>([]);const [status,setStatus]=useState("Loading upcoming school events…");
 useEffect(()=>{let cancelled=false;async function load(){try{const now=encodeURIComponent(new Date().toISOString());const response=await fetch(`${SUPABASE_URL}/rest/v1/school_calendar_events?select=id,title,description,location,starts_at,ends_at,all_day,category,featured,is_test_data&starts_at=gte.${now}&order=featured.desc,starts_at.asc&limit=6`,{headers:headers(accessToken)});if(!response.ok)throw new Error("Upcoming school events could not be loaded.");const rows=await response.json() as EventRow[];if(!cancelled){setItems(rows);setStatus(rows.length?`${rows.length} upcoming school event${rows.length===1?"":"s"}.`:"No upcoming school events have been published.");}}catch(error){if(!cancelled)setStatus(error instanceof Error?error.message:"Upcoming school events could not be loaded.");}}load();return()=>{cancelled=true;};},[accessToken]);
 return <section className={styles.panel} aria-labelledby="school-calendar-title"><div className={styles.heading}><div><p className="eyebrow">HANAMI SCHOOL CALENDAR</p><h4 id="school-calendar-title">Upcoming School Events</h4></div><span>LIVE CALENDAR</span></div><div className={styles.status} aria-live="polite">{status}</div>{items.length>0&&<div className={styles.list}>{items.map(item=>{const start=new Date(item.starts_at);return <article key={item.id} className={styles.item}><div className={styles.date}><strong>{new Intl.DateTimeFormat("en-US",{day:"2-digit",timeZone:"Asia/Tokyo"}).format(start)}</strong><span>{new Intl.DateTimeFormat("en-US",{month:"short",timeZone:"Asia/Tokyo"}).format(start).toUpperCase()}</span></div><div><p className="eyebrow">{item.category.toUpperCase()}{item.featured?" • FEATURED":""}{item.is_test_data?" • TEST":""}</p><h5>{item.title}</h5><p>{item.description}</p><small>{new Intl.DateTimeFormat("en-US",{weekday:"short",hour:item.all_day?undefined:"numeric",minute:item.all_day?undefined:"2-digit",timeZone:"Asia/Tokyo"}).format(start)}{item.location?` • ${item.location}`:""}</small></div></article>;})}</div>}<div style={{padding:"10px 12px",borderTop:"1px solid #c2ccd7",background:"#f8fafc"}}><a className="secondary-action" href="../../calendar/">View complete calendar →</a></div></section>;
}
