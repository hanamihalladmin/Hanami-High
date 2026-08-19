"use client";

import {useEffect,useState} from "react";
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Opportunity={id:string;opportunity_type:string;title:string;department:string;description:string;location:string|null;closes_at:string|null;is_test_data:boolean};
function tokyo(value:string){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"Asia/Tokyo"}).format(new Date(value));}
export default function LiveCampusOpportunities(){
 const [items,setItems]=useState<Opportunity[]>([]);const [message,setMessage]=useState("Loading published opportunities…");
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/campus_opportunities?select=id,opportunity_type,title,department,description,location,closes_at,is_test_data&status=eq.published&order=created_at.desc&limit=12`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store"});if(!response.ok)throw new Error();const rows=await response.json() as Opportunity[];if(!cancelled){setItems(rows);setMessage(rows.length?`${rows.length} published opportunit${rows.length===1?"y":"ies"}.`:"No jobs, internships, service, or leadership opportunities are open right now.");}}catch{if(!cancelled)setMessage("Published opportunities could not be loaded right now.");}}void load();return()=>{cancelled=true;};},[]);
 return <><p className="content-note" aria-live="polite">{message}</p>{items.length>0&&<div className="opportunity-grid">{items.map(item=><article key={item.id}><p className="eyebrow">{item.opportunity_type.replaceAll("_"," ").toUpperCase()}{item.is_test_data?" • TEST":""}</p><h3>{item.title}</h3><p>{item.description}</p><dl><div><dt>Department</dt><dd>{item.department}</dd></div><div><dt>{item.closes_at?"Closes":"Location"}</dt><dd>{item.closes_at?tokyo(item.closes_at):(item.location||"Hanami campus")}</dd></div></dl><a className="secondary-action" href="../portal/student/">Apply in Student Portal</a></article>)}</div>}</>;
}
