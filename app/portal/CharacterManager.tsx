"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import styles from "./CharacterManager.module.css";
import type {ActiveCharacter} from "./DashboardShell";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type CharacterRole="student"|"faculty";
type Character=ActiveCharacter;
type Props={accessToken:string;onActiveCharacterChange?:(character:Character|null)=>void};

function authHeaders(accessToken:string,extra:Record<string,string>={}){
  return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};
}

export default function CharacterManager({accessToken,onActiveCharacterChange}:Props){
  const [userId,setUserId]=useState("");
  const [characters,setCharacters]=useState<Character[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("Loading your private character slots…");
  const [displayName,setDisplayName]=useState("");
  const [handle,setHandle]=useState("");
  const [role,setRole]=useState<CharacterRole>("student");

  const loadCharacters=useCallback(async(uid:string)=>{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/characters?select=id,slot,role,display_name,handle,visibility,is_active&order=slot.asc`,{headers:authHeaders(accessToken)});
    if(!response.ok)throw new Error("Your character slots could not be loaded.");
    const rows=await response.json() as Character[];
    setCharacters(rows);
    onActiveCharacterChange?.(rows.find(character=>character.is_active)??null);
    setNotice(rows.length?"Choose the character you want to play, or fill an open slot.":"Both character slots are open. Create your first Hanami character below.");
    return uid;
  },[accessToken,onActiveCharacterChange]);

  useEffect(()=>{
    let cancelled=false;
    async function initialize(){
      try{
        const userResponse=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:authHeaders(accessToken)});
        if(!userResponse.ok)throw new Error("Your Discord session could not be verified.");
        const user=await userResponse.json() as {id?:string};
        if(!user.id)throw new Error("Your Hanami account ID is unavailable.");
        if(cancelled)return;
        setUserId(user.id);
        await loadCharacters(user.id);
      }catch(error){if(!cancelled)setNotice(error instanceof Error?error.message:"Character slots could not be opened.");}
      finally{if(!cancelled)setLoading(false);}
    }
    initialize();
    return()=>{cancelled=true;};
  },[accessToken,loadCharacters]);

  async function createCharacter(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!userId||characters.length>=2)return;
    const cleanName=displayName.trim();
    const cleanHandle=handle.trim().replace(/^@/,"").toLowerCase();
    if(cleanName.length<2||cleanName.length>40){setNotice("Character name must be between 2 and 40 characters.");return;}
    if(!/^[a-z0-9_]{3,24}$/.test(cleanHandle)){setNotice("Handle must be 3–24 lowercase letters, numbers, or underscores.");return;}
    const slot=characters.some(character=>character.slot===1)?2:1;
    setSaving(true);
    setNotice(`Creating private character slot ${slot}…`);
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/characters`,{
        method:"POST",
        headers:authHeaders(accessToken,{"Content-Type":"application/json",Prefer:"return=representation"}),
        body:JSON.stringify({owner_user_id:userId,slot,role,display_name:cleanName,handle:cleanHandle,visibility:"private",is_active:characters.length===0}),
      });
      if(!response.ok){const detail=await response.text();throw new Error(detail.includes("duplicate")?"That character handle or slot is already in use.":"The character could not be created.");}
      setDisplayName("");setHandle("");setRole("student");
      await loadCharacters(userId);
      setNotice(`Character slot ${slot} created privately.`);
    }catch(error){setNotice(error instanceof Error?error.message:"The character could not be created.");}
    finally{setSaving(false);}
  }

  async function switchCharacter(character:Character){
    if(character.is_active||saving)return;
    setSaving(true);setNotice(`Switching to ${character.display_name}…`);
    try{
      const deactivate=await fetch(`${SUPABASE_URL}/rest/v1/characters?is_active=eq.true`,{method:"PATCH",headers:authHeaders(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({is_active:false})});
      if(!deactivate.ok)throw new Error("The current character could not be released.");
      const activate=await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${encodeURIComponent(character.id)}`,{method:"PATCH",headers:authHeaders(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({is_active:true})});
      if(!activate.ok)throw new Error("The new character could not be activated.");
      await loadCharacters(userId);
      setNotice(`${character.display_name} is now your active Hanami character.`);
    }catch(error){setNotice(error instanceof Error?error.message:"The character switch did not finish.");}
    finally{setSaving(false);}
  }

  const openSlots=2-characters.length;
  return <section className={styles.manager} aria-labelledby="character-manager-title">
    <div className={styles.heading}><div><p className="eyebrow">CHARACTER SWITCHER</p><h3 id="character-manager-title">Who are you playing?</h3></div><span>{characters.length}/2 USED</span></div>
    <p className={styles.notice} aria-live="polite">{notice}</p>
    <div className={styles.slots}>
      {[1,2].map(slot=>{
        const character=characters.find(item=>item.slot===slot);
        return <article className={`${styles.slot} ${character?.is_active?styles.active:""}`} key={slot}>
          <div className={styles.slotTop}><strong>SLOT {slot}</strong>{character?.is_active&&<span>ACTIVE</span>}</div>
          {character?<><div className={styles.avatar}>花</div><h4>{character.display_name}</h4><p>@{character.handle}</p><dl><div><dt>Role</dt><dd>{character.role}</dd></div><div><dt>Privacy</dt><dd>{character.visibility.replace("_"," ")}</dd></div></dl><button type="button" onClick={()=>switchCharacter(character)} disabled={saving||character.is_active}>{character.is_active?"Currently playing":"Play this character"}</button></>:<div className={styles.empty}><b>Open character slot</b><p>Create a student or faculty identity. New profiles begin private.</p></div>}
        </article>;
      })}
    </div>
    {!loading&&openSlots>0&&<form className={styles.form} onSubmit={createCharacter}>
      <div className={styles.formTitle}><strong>CREATE CHARACTER</strong><span>{openSlots} SLOT{openSlots===1?"":"S"} AVAILABLE</span></div>
      <label><span>Character name</span><input value={displayName} onChange={event=>setDisplayName(event.target.value)} maxLength={40} placeholder="e.g. Hana Mori" autoComplete="off" required/></label>
      <label><span>Hanami handle</span><div className={styles.handleInput}><b>@</b><input value={handle} onChange={event=>setHandle(event.target.value)} maxLength={24} placeholder="hana_mori" autoComplete="off" required/></div></label>
      <label><span>School role</span><select value={role} onChange={event=>setRole(event.target.value as CharacterRole)}><option value="student">Student</option><option value="faculty">Faculty</option></select></label>
      <button type="submit" disabled={saving||loading}>{saving?"Saving…":"Create private character"}</button>
      <small>This creates real account data. Test/example characters on the public preview are never copied into your account.</small>
    </form>}
  </section>;
}
