"use client";

import {FormEvent,useState} from "react";
import styles from "./ProfileLookupPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type VisibleProfile={character_id:string;display_name:string;handle:string;role:"student"|"faculty";visibility:"public"|"friends_only"|"private";headline:string;bio:string;status_message:string};
type Props={accessToken:string;viewerCharacterId:string};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function ProfileLookupPanel({accessToken,viewerCharacterId}:Props){
  const [handle,setHandle]=useState("");
  const [profile,setProfile]=useState<VisibleProfile|null>(null);
  const [message,setMessage]=useState("Search an exact Hanami handle to view an available character profile.");
  const [loading,setLoading]=useState(false);

  async function search(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const clean=handle.trim().replace(/^@/,"").toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(clean)){setProfile(null);setMessage("Enter a valid Hanami handle using lowercase letters, numbers, or underscores.");return;}
    setLoading(true);setProfile(null);setMessage(`Checking profile visibility for @${clean}…`);
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/lookup_visible_character_profile`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({viewer_character_id:viewerCharacterId,target_handle:clean})});
      if(!response.ok)throw new Error("The Hanami profile lookup could not be completed.");
      const rows=await response.json() as VisibleProfile[];
      const result=rows[0]??null;
      setProfile(result);
      setMessage(result?`@${clean} is visible to your active character.`:`@${clean} is private, friends-only, unavailable, or does not exist.`);
    }catch(error){setMessage(error instanceof Error?error.message:"The Hanami profile lookup could not be completed.");}
    finally{setLoading(false);}
  }

  return <section className={styles.panel} aria-labelledby="profile-search-title">
    <div className={styles.heading}><div><p className="eyebrow">HANAMI PROFILES</p><h4 id="profile-search-title">Character lookup</h4></div><span>PRIVACY-AWARE</span></div>
    <form className={styles.search} onSubmit={search}><label><span>Exact Hanami handle</span><div><b>@</b><input value={handle} onChange={event=>setHandle(event.target.value)} maxLength={24} placeholder="character_handle" autoComplete="off"/><button type="submit" disabled={loading}>{loading?"Checking…":"View profile"}</button></div></label></form>
    <div className={styles.status} aria-live="polite">{message}</div>
    {profile&&<article className={styles.card}><div className={styles.avatar}>花</div><div className={styles.identity}><p className="eyebrow">{profile.role.toUpperCase()} • {profile.visibility.replace("_"," ").toUpperCase()}</p><h5>{profile.display_name}</h5><span>@{profile.handle}</span>{profile.status_message&&<blockquote>{profile.status_message}</blockquote>}</div><div className={styles.copy}><strong>{profile.headline||"Hanami character profile"}</strong><p>{profile.bio||"This character has not added a biography yet."}</p></div></article>}
    <div className={styles.privacy}><strong>VISIBILITY RULE</strong><span>Public profiles can be viewed by signed-in Hanami members. Private profiles remain owner-only. Friends-only profiles stay hidden from other users until the friendship system is connected.</span></div>
  </section>;
}
