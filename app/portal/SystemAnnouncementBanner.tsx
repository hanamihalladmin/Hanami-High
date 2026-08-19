"use client";

import {useEffect,useState} from "react";
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Notice={id:string;title:string;body:string;severity:"info"|"maintenance"|"warning"|"critical";audience:"all"|"student"|"faculty"|"admin";starts_at:string|null;ends_at:string|null};
function headers(token:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};}
export default function SystemAnnouncementBanner({accessToken,role}:{accessToken:string;role:"student"|"faculty"}){
 const [items,setItems]=useState<Notice[]>([]);
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/system_announcements?select=id,title,body,severity,audience,starts_at,ends_at&status=eq.published&order=created_at.desc&limit=10`,{headers:headers(accessToken),cache:"no-store"});if(!response.ok)return;const now=Date.now();const rows=(await response.json() as Notice[]).filter(item=>(item.audience==="all"||item.audience===role)&&(!item.starts_at||new Date(item.starts_at).getTime()<=now)&&(!item.ends_at||new Date(item.ends_at).getTime()>=now));if(!cancelled)setItems(rows);}catch{}}void load();const timer=window.setInterval(load,60000);return()=>{cancelled=true;window.clearInterval(timer);};},[accessToken,role]);
 if(!items.length)return null;
 return <section aria-label="Hanami system announcements" style={{display:"grid",gap:6,marginTop:14}}>{items.map(item=><article key={item.id} data-severity={item.severity} style={{border:item.severity==="critical"?"2px solid #8d243f":"1px solid #c9a95d",background:item.severity==="critical"?"#fff0f2":"#fff8dd",padding:"10px 12px",display:"grid",gridTemplateColumns:"auto 1fr",gap:10,alignItems:"start"}}><strong style={{fontSize:8,letterSpacing:'.08em',color:item.severity==="critical"?"#8d243f":"#795e1d"}}>{item.severity.toUpperCase()}</strong><div><b style={{display:"block",color:"#17375f"}}>SYSTEM NOTICE • {item.title}</b><p style={{margin:"4px 0 0",fontSize:10,lineHeight:1.5,color:"#4f5f70"}}>{item.body}</p></div></article>)}</section>;
}
