"use client";

import {useEffect,useState} from "react";
import styles from "./SchoolStatusPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Status="open"|"delayed"|"closed"|"holiday"|"emergency";
type Row={status:Status;message:string;updated_at:string};
type Props={accessToken:string};
function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}

export default function SchoolStatusPanel({accessToken}:Props){
 const [row,setRow]=useState<Row>({status:"open",message:"School is operating on the normal schedule.",updated_at:""});const [notice,setNotice]=useState("Loading school operating status…");
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/school_status_config?select=status,message,updated_at&key=eq.main&limit=1`,{headers:headers(accessToken)});if(!response.ok)throw new Error("School status could not be loaded.");const rows=await response.json() as Row[];if(!cancelled&&rows[0]){setRow(rows[0]);setNotice(`School status: ${rows[0].status.toUpperCase()}.`);}}catch(error){if(!cancelled)setNotice(error instanceof Error?error.message:"School status could not be loaded.");}}load();return()=>{cancelled=true;};},[accessToken]);
 return <section className={`${styles.panel} ${styles[row.status]}`} aria-labelledby="school-status-title"><div><p className="eyebrow">HANAMI SCHOOL STATUS</p><h4 id="school-status-title">{row.status.toUpperCase()}</h4><p>{row.message}</p></div><div className={styles.meta}><span>{notice}</span>{row.updated_at&&<small>Updated {new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tokyo"}).format(new Date(row.updated_at))}</small>}</div></section>;
}
