"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type EventRow={id:string;title:string;description:string;location:string|null;starts_at:string;all_day:boolean;category:string;featured:boolean;is_test_data:boolean};
const fallback:EventRow={id:"fallback-event",title:"Autumn Culture Festival",description:"Preview event until Administration publishes the live school calendar.",location:"Hanami High Campus",starts_at:"2026-09-12T10:00:00+09:00",all_day:false,category:"campus",featured:true,is_test_data:true};

export default function LiveNextEvent(){
 const [event,setEvent]=useState<EventRow>(fallback);const [live,setLive]=useState(false);
 useEffect(()=>{let cancelled=false;async function load(){try{const now=encodeURIComponent(new Date().toISOString());const response=await fetch(`${SUPABASE_URL}/rest/v1/school_calendar_events?select=id,title,description,location,starts_at,all_day,category,featured,is_test_data&starts_at=gte.${now}&order=featured.desc,starts_at.asc&limit=1`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!response.ok)return;const rows=await response.json() as EventRow[];if(!cancelled&&rows[0]){setEvent(rows[0]);setLive(true);}}catch{/* Retain labeled fallback. */}}load();return()=>{cancelled=true;};},[]);
 const start=new Date(event.starts_at);const days=Math.max(0,Math.ceil((start.getTime()-Date.now())/86400000));const when=new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",hour:event.all_day?undefined:"numeric",minute:event.all_day?undefined:"2-digit",timeZone:"Asia/Tokyo"}).format(start);
 return <section className="panel" id="calendar"><h2 className="panel-title">NEXT BIG EVENT</h2><div className="panel-body countdown"><p>{event.is_test_data?"[TEST] ":""}{event.title}</p><strong><span>{days}</span> DAYS</strong><small>{when}{event.location?` • ${event.location}`:""}</small><span className="text-link">{live?"Live school calendar":"Fallback preview"}</span></div></section>;
}
