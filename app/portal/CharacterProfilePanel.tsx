"use client";

import {FormEvent,useEffect,useState} from "react";
import styles from "./CharacterProfilePanel.module.css";
import ProfileSocialControlsPanel from "./ProfileSocialControlsPanel";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Visibility="public"|"friends_only"|"private";
type ProfileRow={headline:string;bio:string;status_message:string};
type Props={accessToken:string;characterId:string;currentVisibility:Visibility};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function CharacterProfilePanel({accessToken,characterId,currentVisibility}:Props){
  const [headline,setHeadline]=useState("");
  const [bio,setBio]=useState("");
  const [statusMessage,setStatusMessage]=useState("");
  const [visibility,setVisibility]=useState<Visibility>(currentVisibility);
  const [message,setMessage]=useState("Loading profile & privacy settings…");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profiles?select=headline,bio,status_message&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)});
        if(!response.ok)throw new Error("Your character profile could not be loaded.");
        const rows=await response.json() as ProfileRow[];
        const profile=rows[0];
        if(cancelled)return;
        setHeadline(profile?.headline??"");setBio(profile?.bio??"");setStatusMessage(profile?.status_message??"");setVisibility(currentVisibility);
        setMessage(profile?"Profile settings loaded.":"This character does not have a profile card yet. Saving will create one privately.");
      }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Profile settings could not be loaded.");}
    }
    load();
    return()=>{cancelled=true;};
  },[accessToken,characterId,currentVisibility]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setSaving(true);setMessage("Saving profile & privacy settings…");
    try{
      const [profileResponse,visibilityResponse]=await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/character_profiles?on_conflict=character_id`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}),body:JSON.stringify({character_id:characterId,headline:headline.trim(),bio:bio.trim(),status_message:statusMessage.trim(),updated_at:new Date().toISOString()})}),
        fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({visibility,updated_at:new Date().toISOString()})}),
      ]);
      if(!profileResponse.ok||!visibilityResponse.ok)throw new Error("Profile or privacy settings could not be saved.");
      setMessage("Profile & privacy settings saved for this character.");
    }catch(error){setMessage(error instanceof Error?error.message:"Profile & privacy settings could not be saved.");}
    finally{setSaving(false);}
  }

  return <>
   <section className={styles.panel} aria-labelledby="profile-title">
    <div className={styles.heading}><div><p className="eyebrow">PROFILE & PRIVACY</p><h4 id="profile-title">Character profile card</h4></div><span>{visibility.replace("_"," ").toUpperCase()}</span></div>
    <div className={styles.status} aria-live="polite">{message}</div>
    <form className={styles.form} onSubmit={save}>
      <div className={styles.fields}><label><span>Headline</span><input value={headline} onChange={event=>setHeadline(event.target.value)} maxLength={120} placeholder="A short line for your Hanami profile"/></label><label><span>Status message</span><input value={statusMessage} onChange={event=>setStatusMessage(event.target.value)} maxLength={160} placeholder="What is your character up to?"/></label><label className={styles.bio}><span>About this character</span><textarea value={bio} onChange={event=>setBio(event.target.value)} maxLength={2000} placeholder="Write a short character biography…"/></label><label><span>Profile visibility</span><select value={visibility} onChange={event=>setVisibility(event.target.value as Visibility)}><option value="private">Private</option><option value="friends_only">Friends only</option><option value="public">Public</option></select></label></div>
      <div className={styles.privacy}><strong>PRIVACY DEFAULT</strong><p>New characters start private. Changing this setting controls future profile visibility; private account/session data is never made public by this setting.</p></div>
      <button type="submit" disabled={saving}>{saving?"Saving…":"Save profile & privacy"}</button>
    </form>
   </section>
   <ProfileSocialControlsPanel accessToken={accessToken} characterId={characterId}/>
  </>;
}
