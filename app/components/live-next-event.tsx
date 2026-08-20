"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type EventRow={id:string;title:string;description:string;location:string|null;starts_at:string;all_day:boolean;category:string;featured:boolean};

export default function LiveNextEvent(){
 const [event,setEvent]=useState<EventRow|null>(null);const [nowMs,setNowMs]=useState<number|null>(null);
 useEffect(()=>{let cancelled=false;setNowMs(Date.now());const clock=window.setInterval(()=>setNowMs(Date.now()),60000);async function load(){try{const now=encodeURIComponent(new Date().toISOString());const response=await fetch(`${SUPABASE_URL}/rest/v1/school_calendar_events?select=id,title,description,location,starts_at,all_day,category,featured&status=eq.published&starts_at=gte.${now}&order=featured.desc,starts_at.asc&limit=1`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!response.ok)return;const rows=await response.json() as EventRow[];if(!cancelled)setEvent(rows[0]??null);}catch{/* Leave the empty live state visible. */}}load();return()=>{cancelled=true;window.clearInterval(clock);};},[]);
 if(!event)return <section className="panel" id="calendar"><h2 className="panel-title">NEXT BIG EVENT</h2><div className="panel-body countdown"><p>No upcoming school event has been published yet.</p><a className="text-link" href="./calendar/">View school calendar →</a></div></section>;
 const start=new Date(event.starts_at);const days=nowMs===null?0:Math.max(0,Math.ceil((start.getTime()-nowMs)/86400000));const when=new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",hour:event.all_day?undefined:"numeric",minute:event.all_day?undefined:"2-digit",timeZone:"Asia/Tokyo"}).format(start);
 return <section className="panel" id="calendar"><h2 className="panel-title">NEXT BIG EVENT</h2><div className="panel-body countdown"><p>{event.title}</p><strong><span>{days}</span> DAYS</strong><small>{when}{event.location?` • ${event.location}`:""}</small><span className="text-link">Live school calendar</span></div></section>;
}
