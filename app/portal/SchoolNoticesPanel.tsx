"use client";

import {useEffect,useState} from "react";
import styles from "./SchoolNoticesPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Notice={id:string;title:string;body:string;category:"general"|"event"|"urgent";featured:boolean;is_test_data:boolean;published_at:string|null};
type Props={accessToken:string};
function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}

export default function SchoolNoticesPanel({accessToken}:Props){
 const [items,setItems]=useState<Notice[]>([]);const [status,setStatus]=useState("Loading published school notices…");
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/site_announcements?select=id,title,body,category,featured,is_test_data,published_at&order=featured.desc,published_at.desc&limit=5`,{headers:headers(accessToken)});if(!response.ok)throw new Error("School notices could not be loaded.");const rows=await response.json() as Notice[];if(!cancelled){setItems(rows);setStatus(rows.length?`${rows.length} current school notice${rows.length===1?"":"s"}.`:"No current school notices.");}}catch(error){if(!cancelled)setStatus(error instanceof Error?error.message:"School notices could not be loaded.");}}load();return()=>{cancelled=true;};},[accessToken]);
 return <section className={styles.panel} aria-labelledby="school-notices-title"><div className={styles.heading}><div><p className="eyebrow">HANAMI SCHOOL NETWORK</p><h4 id="school-notices-title">School Notices</h4></div><span>LIVE CMS</span></div><div className={styles.status} aria-live="polite">{status}</div>{items.length>0&&<div className={styles.list}>{items.map(item=><article key={item.id} className={`${styles.item} ${item.category==="urgent"?styles.urgent:""}`}><div><p className="eyebrow">{item.category.toUpperCase()}{item.featured?" • FEATURED":""}{item.is_test_data?" • TEST":""}</p><h5>{item.title}</h5>{item.published_at&&<time>{new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"Asia/Tokyo"}).format(new Date(item.published_at))}</time>}</div><p>{item.body}</p></article>)}</div>}</section>;
}
