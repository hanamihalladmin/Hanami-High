"use client";

import {useCallback,useEffect,useState} from "react";
import ProfileSocialControlsPanel from "./ProfileSocialControlsPanel";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Visibility="public"|"friends_only"|"private";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}

export default function PrivacySocialSettingsPanel({accessToken,characterId}:{accessToken:string;characterId:string}){
 const [visibility,setVisibility]=useState<Visibility>("private");
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState("Loading profile privacy…");
 const loadVisibility=useCallback(async()=>{try{const response=await fetch(`${SUPABASE_URL}/rest/v1/characters?select=visibility&id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken),cache:"no-store"});if(!response.ok)throw new Error("Profile visibility could not be loaded.");const row=(await response.json() as Array<{visibility:Visibility}>)[0];setVisibility(row?.visibility??"private");setNotice("Profile privacy is ready.");}catch(error){setNotice(error instanceof Error?error.message:"Profile visibility could not be loaded.");}},[accessToken,characterId]);
 useEffect(()=>{void loadVisibility();},[loadVisibility]);
 async function saveVisibility(next:Visibility){setVisibility(next);setSaving(true);setNotice("Saving profile visibility…");try{const response=await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({visibility:next,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("Profile visibility could not be saved.");setNotice(`Profile visibility set to ${next.replace("_"," ")}.`);window.dispatchEvent(new CustomEvent("hanami-character-identity-changed",{detail:{characterId}}));}catch(error){setNotice(error instanceof Error?error.message:"Profile visibility could not be saved.");await loadVisibility();}finally{setSaving(false);}}
 return <section aria-label="Privacy and social settings" style={{display:"grid",gap:14}}>
  <div style={{border:"1px solid #c5ced8",background:"#fff"}}>
   <div style={{padding:"13px 14px",background:"#eef3f8",borderBottom:"1px solid #c5ced8"}}><p className="eyebrow">PROFILE PRIVACY</p><h4 style={{margin:"3px 0",font:"400 20px Georgia,serif"}}>Who can see this character?</h4><small>{notice}</small></div>
   <div style={{padding:14,display:"grid",gap:10}}>
    <label style={{display:"grid",gap:5}}><strong>Profile visibility</strong><select value={visibility} disabled={saving} onChange={event=>void saveVisibility(event.target.value as Visibility)}><option value="private">Private — only you and authorized staff</option><option value="friends_only">Friends only — accepted friends can view</option><option value="public">Public — signed-in Hanami members can view</option></select></label>
    <div style={{padding:10,border:"1px solid #d9e0e7",background:"#f8fafc",fontSize:10,lineHeight:1.5}}><strong>What this controls</strong><p style={{margin:"4px 0 0"}}>This affects your social profile and member-facing profile lookup. School records, moderation data, administrative tools, private messages, and account information follow their own access rules and are never made public by this switch.</p></div>
   </div>
  </div>
  <ProfileSocialControlsPanel accessToken={accessToken} characterId={characterId}/>
 </section>;
}
