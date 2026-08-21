"use client";

import {useCallback,useEffect,useState} from "react";
import {createPortal} from "react-dom";
import NotificationAccessibilityPanel from "./NotificationAccessibilityPanel";
import styles from "./StudentSettingsDrawer.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Skin={sidebar?:string;surface?:string;radius?:string;pattern?:string;fontFamily?:string;websiteBackground?:string};
type Props={accessToken:string;characterId:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

const FONT_OPTIONS=[
 ["default","Hanami Default"],
 ["Arial, Helvetica, sans-serif","Arial"],
 ["Verdana, Geneva, sans-serif","Verdana"],
 ["Trebuchet MS, Arial, sans-serif","Trebuchet MS"],
 ["Georgia, Times New Roman, serif","Georgia"],
 ["Times New Roman, Times, serif","Times New Roman"],
 ["system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif","System UI"]
] as const;

export default function StudentSettingsDrawer({accessToken,characterId}:Props){
 const [open,setOpen]=useState(false),[skin,setSkin]=useState<Skin>({}),[fontFamily,setFontFamily]=useState("default"),[websiteBackground,setWebsiteBackground]=useState("#fffafa"),[notice,setNotice]=useState(""),[rail,setRail]=useState<HTMLElement|null>(null);
 const apply=useCallback((font:string,bg:string)=>{const root=document.documentElement;if(font==="default")root.style.removeProperty("--hanami-user-font-family");else root.style.setProperty("--hanami-user-font-family",font);root.style.setProperty("--hanami-website-background",bg);},[]);
 const load=useCallback(async()=>{try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?select=portal_skin&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)});if(!response.ok)return;const row=(await response.json() as {portal_skin:Skin|null}[])[0];const next=row?.portal_skin??{};setSkin(next);const font=next.fontFamily??"default";const bg=next.websiteBackground??"#fffafa";setFontFamily(font);setWebsiteBackground(bg);apply(font,bg);}catch{}},[accessToken,characterId,apply]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{const target=document.querySelector('aside[aria-label$="global navigation"]');setRail(target instanceof HTMLElement?target:null);},[]);
 async function save(nextFont=fontFamily,nextBg=websiteBackground){const merged:Skin={...skin,fontFamily:nextFont,websiteBackground:nextBg};setSkin(merged);apply(nextFont,nextBg);setNotice("Saving…");const response=await fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?on_conflict=character_id`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}),body:JSON.stringify({character_id:characterId,portal_skin:merged})});setNotice(response.ok?"Settings saved.":"Settings could not be saved.");if(response.ok)window.dispatchEvent(new CustomEvent("hanami-character-identity-changed",{detail:{characterId}}));}
 function resetVisuals(){setFontFamily("default");setWebsiteBackground("#fffafa");void save("default","#fffafa");}
 const trigger=<button type="button" className={styles.settingsButton} onClick={()=>setOpen(true)} aria-label="Open portal settings"><span aria-hidden="true">⚙</span><b>Settings</b></button>;
 return <>{rail?createPortal(trigger,rail):trigger}{open&&<div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="student-settings-title"><header className={styles.header}><div><small>PORTAL SETTINGS</small><h2 id="student-settings-title">Settings</h2><p>Personalize how the Hanami website looks and behaves for you.</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close settings">×</button></header><div className={styles.content}><section className={styles.visualSection}><div className={styles.sectionHeading}><div><h3>Website appearance</h3><p>These settings change the portal website itself, not your dashboard wallpaper or course-card designs.</p></div><button type="button" onClick={resetVisuals}>Reset appearance</button></div><div className={styles.controlGrid}><label>Website font<select value={fontFamily} onChange={e=>{setFontFamily(e.target.value);apply(e.target.value,websiteBackground);void save(e.target.value,websiteBackground);}}>{FONT_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Website background color<div className={styles.colorRow}><input type="color" value={websiteBackground} onChange={e=>{setWebsiteBackground(e.target.value);apply(fontFamily,e.target.value);}} onBlur={()=>void save()}/><input type="text" value={websiteBackground} onChange={e=>setWebsiteBackground(e.target.value)} onBlur={()=>void save()} aria-label="Website background hex color"/></div></label></div><div className={styles.preview} style={{fontFamily:fontFamily==="default"?undefined:fontFamily,background:websiteBackground}}><strong>Preview</strong><span>Hanami High • Student Portal • Assignments • Messages</span></div>{notice&&<p className={styles.notice}>{notice}</p>}</section><NotificationAccessibilityPanel accessToken={accessToken} characterId={characterId}/></div></section></div>}</>;
}
