"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import styles from "./ProfileSavedDesignsPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type SavedDesign={id:string;name:string;is_active:boolean;created_at:string;updated_at:string};
type Props={accessToken:string;characterId:string;onApplied?:()=>void};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function ProfileSavedDesignsPanel({accessToken,characterId,onApplied}:Props){
  const [designs,setDesigns]=useState<SavedDesign[]>([]);
  const [name,setName]=useState("");
  const [notice,setNotice]=useState("Loading saved profile designs…");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_design_templates?select=id,name,is_active,created_at,updated_at&character_id=eq.${encodeURIComponent(characterId)}&order=updated_at.desc`,{headers:headers(accessToken)});
    if(!response.ok)throw new Error("Saved profile designs could not be loaded.");
    const rows=await response.json() as SavedDesign[];setDesigns(rows);setNotice(rows.length?`${rows.length} saved design${rows.length===1?"":"s"}. Switch anytime without rebuilding your page.`:"No saved designs yet. Save your current canvas as your first template.");
  }catch(error){setNotice(error instanceof Error?error.message:"Saved profile designs could not be loaded.");}},[accessToken,characterId]);
  useEffect(()=>{void load();},[load]);

  async function saveCurrent(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy||!name.trim())return;setBusy(true);setNotice("Saving your current profile design…");try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_profile_design_template`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:characterId,requested_name:name.trim()})});
    if(!response.ok)throw new Error(await response.text()||"Profile design could not be saved.");
    setName("");await load();setNotice("Profile design saved. Your current canvas, widgets, layout, styles, and background are now reusable.");
  }catch(error){setNotice(error instanceof Error?error.message:"Profile design could not be saved.");}finally{setBusy(false);}}

  async function applyDesign(design:SavedDesign){if(busy||design.is_active)return;const confirmed=window.confirm(`Switch to “${design.name}”? Your current live canvas will be replaced. Save it first if you want to keep it as another design.`);if(!confirmed)return;setBusy(true);setNotice(`Switching to ${design.name}…`);try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_profile_design_template`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_template_id:design.id})});
    if(!response.ok)throw new Error(await response.text()||"Saved design could not be applied.");
    await load();window.dispatchEvent(new CustomEvent("hanami-profile-template-applied",{detail:{characterId}}));window.dispatchEvent(new CustomEvent("hanami-profile-studio-refresh",{detail:{characterId}}));onApplied?.();setNotice(`${design.name} is now your active profile design.`);
  }catch(error){setNotice(error instanceof Error?error.message:"Saved design could not be applied.");}finally{setBusy(false);}}

  async function deleteDesign(design:SavedDesign){if(busy)return;const confirmed=window.confirm(`Delete saved design “${design.name}”? This removes the saved template only; it does not erase your current live profile.`);if(!confirmed)return;setBusy(true);try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_design_templates?id=eq.${encodeURIComponent(design.id)}&character_id=eq.${encodeURIComponent(characterId)}`,{method:"DELETE",headers:headers(accessToken)});
    if(!response.ok)throw new Error("Saved design could not be deleted.");await load();setNotice(`${design.name} was removed from your saved designs.`);
  }catch(error){setNotice(error instanceof Error?error.message:"Saved design could not be deleted.");}finally{setBusy(false);}}

  return <section className={styles.panel} aria-labelledby="saved-profile-designs-title">
    <div className={styles.heading}><div><p className="eyebrow">MY PROFILE DESIGNS</p><h4 id="saved-profile-designs-title">Save & switch layouts</h4><p>Turn any Profile Studio creation into a reusable personal template. Each character keeps its own design collection.</p></div><span>{designs.length}/20 saved</span></div>
    <form className={styles.saveRow} onSubmit={saveCurrent}><label><span>Template name</span><input value={name} onChange={event=>setName(event.target.value)} maxLength={60} placeholder="Sakura scrapbook, Winter profile…" required/></label><button type="submit" disabled={busy||!name.trim()}>{busy?"Working…":"Save current design"}</button></form>
    <div className={styles.grid}>{designs.map(design=><article className={`${styles.card} ${design.is_active?styles.active:""}`} key={design.id}><div><strong>{design.name}</strong><small>{design.is_active?"ACTIVE DESIGN":`Saved ${new Date(design.updated_at).toLocaleDateString()}`}</small></div><div className={styles.actions}><button type="button" disabled={busy||design.is_active} onClick={()=>void applyDesign(design)}>{design.is_active?"In use":"Switch to design"}</button><button type="button" className={styles.delete} disabled={busy} onClick={()=>void deleteDesign(design)}>Delete</button></div></article>)}</div>
    <p className={styles.notice} aria-live="polite">{notice}</p>
  </section>;
}
