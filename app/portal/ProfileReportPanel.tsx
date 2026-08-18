"use client";

import {FormEvent,useState} from "react";
import styles from "./ProfileReportPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Reason="profile_content"|"harassment"|"spam"|"impersonation"|"other";
type Props={accessToken:string;viewerCharacterId:string;targetCharacterId:string;targetHandle:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function ProfileReportPanel({accessToken,viewerCharacterId,targetCharacterId,targetHandle}:Props){
 const [open,setOpen]=useState(false);const [reason,setReason]=useState<Reason>("profile_content");const [details,setDetails]=useState("");const [notice,setNotice]=useState("");const [saving,setSaving]=useState(false);
 if(viewerCharacterId===targetCharacterId)return null;
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(saving)return;setSaving(true);setNotice("Submitting report…");try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_reports`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({reporter_character_id:viewerCharacterId,target_character_id:targetCharacterId,reason,details:details.trim(),status:"open",review_note:""})});if(!response.ok)throw new Error("The report could not be submitted.");setDetails("");setOpen(false);setNotice(`Report submitted for @${targetHandle}. Hanami moderators can now review it.`);}catch(error){setNotice(error instanceof Error?error.message:"The report could not be submitted.");}finally{setSaving(false);}}
 return <div className={styles.report}><div className={styles.top}><span>{notice||"See something that breaks Hanami rules? Send it to the moderation queue."}</span><button type="button" onClick={()=>setOpen(value=>!value)}>{open?"Cancel":"Report profile"}</button></div>{open&&<form onSubmit={submit}><label><span>Reason</span><select value={reason} onChange={e=>setReason(e.target.value as Reason)}><option value="profile_content">Profile content</option><option value="harassment">Harassment</option><option value="spam">Spam</option><option value="impersonation">Impersonation</option><option value="other">Other</option></select></label><label><span>Details</span><textarea value={details} onChange={e=>setDetails(e.target.value)} maxLength={3000} placeholder="Describe what a moderator should review."/></label><p>Reports are tied to your active character and are visible to authorized Hanami moderators.</p><button type="submit" disabled={saving}>{saving?"Submitting…":"Submit report"}</button></form>}</div>;
}
