"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import styles from "./AdminAnnouncementManager.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Access={site_admin:boolean;content_editor:boolean;moderator:boolean};
type Status="open"|"delayed"|"closed"|"holiday"|"emergency";
type Row={key:string;status:Status;message:string;updated_at:string};
type Props={accessToken:string;userId:string;access:Access};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function AdminSchoolStatusManager({accessToken,userId,access}:Props){
 const [status,setStatus]=useState<Status>("open");const [message,setMessage]=useState("School is operating on the normal schedule.");const [updatedAt,setUpdatedAt]=useState("");const [notice,setNotice]=useState("Loading school status…");const [saving,setSaving]=useState(false);const canEdit=access.site_admin||access.content_editor;
 const load=useCallback(async()=>{const response=await fetch(`${SUPABASE_URL}/rest/v1/school_status_config?select=key,status,message,updated_at&key=eq.main&limit=1`,{headers:headers(accessToken)});if(!response.ok)throw new Error("School status could not be loaded.");const rows=await response.json() as Row[];const row=rows[0];if(row){setStatus(row.status);setMessage(row.message);setUpdatedAt(row.updated_at);setNotice(`Current status: ${row.status.toUpperCase()}.`);}else setNotice("The main school status record is unavailable.");},[accessToken]);
 useEffect(()=>{queueMicrotask(()=>{void load().catch(error=>setNotice(error instanceof Error?error.message:"School status could not be loaded."));});},[load]);
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!canEdit||saving)return;setSaving(true);setNotice("Updating school status…");try{const response=await fetch(`${SUPABASE_URL}/rest/v1/school_status_config?key=eq.main`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({status,message:message.trim(),updated_by:userId,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("School status could not be updated.");await load();setNotice("School status updated across the Hanami network.");}catch(error){setNotice(error instanceof Error?error.message:"School status could not be updated.");}finally{setSaving(false);}}
 return <section className={styles.panel} aria-labelledby="school-status-admin-title"><div className={styles.heading}><div><p className="eyebrow">SCHOOL OPERATIONS</p><h3 id="school-status-admin-title">School Status</h3></div><span>{canEdit?"EDITOR ACCESS":"READ ONLY"}</span></div><div className={styles.notice} aria-live="polite">{notice}</div><form className={styles.form} onSubmit={save}><div className={styles.row}><label><span>Operating status</span><select value={status} onChange={e=>setStatus(e.target.value as Status)} disabled={!canEdit}><option value="open">Open</option><option value="delayed">Delayed</option><option value="closed">Closed</option><option value="holiday">Holiday</option><option value="emergency">Emergency</option></select></label><label><span>Last updated</span><input value={updatedAt?new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tokyo"}).format(new Date(updatedAt)):"—"} readOnly/></label></div><label><span>Status message</span><textarea value={message} maxLength={500} onChange={e=>setMessage(e.target.value)} disabled={!canEdit}/></label>{canEdit&&<button type="submit" disabled={saving}>{saving?"Updating…":"Update school status"}</button>}</form></section>;
}
