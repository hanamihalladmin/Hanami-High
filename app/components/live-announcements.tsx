"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Announcement={id:string;title:string;body:string;category:"general"|"event"|"urgent";featured:boolean;published_at:string|null};
function shortDate(value:string|null){if(!value)return "--.--";return new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",timeZone:"Asia/Tokyo"}).format(new Date(value));}
function longDate(value:string|null){if(!value)return "HANAMI NETWORK";return new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"Asia/Tokyo"}).format(new Date(value)).toUpperCase();}

export default function LiveAnnouncements(){
 const [items,setItems]=useState<Announcement[]>([]);const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/site_announcements?select=id,title,body,category,featured,published_at&status=eq.published&order=featured.desc,published_at.desc&limit=5`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!response.ok)return;const rows=await response.json() as Announcement[];if(!cancelled){setItems(rows);setLoaded(true);}}catch{if(!cancelled)setLoaded(true);}}load();return()=>{cancelled=true;};},[]);
 if(!items.length)return <section className="feature-grid" id="news" aria-label="School news"><article className="feature-story"><p className="eyebrow">SCHOOL ANNOUNCEMENTS</p><h2>{loaded?"No announcements published yet":"Loading school announcements…"}</h2><p>Administration can publish the first schoolwide notice from the Administration portal.</p></article></section>;
 const featured=items.find(item=>item.featured)??items[0];const latest=items.filter(item=>item.id!==featured.id).slice(0,4);
 return <><section className="status-banner" aria-label="Featured announcement"><span className="status-label">{featured.category==="urgent"?"URGENT":"NOTICE"}</span><p><strong>{featured.title}</strong> {featured.body}</p><a href="#news">Read notice</a></section><section className="feature-grid" id="news" aria-label="School news"><article className="feature-story"><p className="eyebrow">FEATURED ANNOUNCEMENT</p><p className="story-date">{longDate(featured.published_at)}</p><h2>{featured.title}</h2><p>{featured.body}</p><span className="text-link">LIVE SCHOOL NETWORK</span></article><div className="news-list"><div className="section-heading"><h2>LATEST NEWS</h2><span>LIVE</span></div>{latest.length?latest.map(item=><article key={item.id}><time>{shortDate(item.published_at)}</time><a href="#news">{item.title}</a></article>):<article><time>--.--</time><a href="#news">No additional announcements have been published.</a></article>}</div></section></>;
}
