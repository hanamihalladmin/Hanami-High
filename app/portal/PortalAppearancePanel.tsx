"use client";

import {ChangeEvent,useCallback,useEffect,useMemo,useState} from "react";
import styles from "./PortalAppearancePanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const IMAGE_TYPES=["image/jpeg","image/png","image/gif","image/webp"];
const MAX_IMAGE_SIZE=5*1024*1024;
type PortalPreference={text_color:string;accent_color:string};
type CharacterPreference={profile_image_path:string|null;class_banner_colors:Record<string,string>};
type Course={code:string;title:string};
type Section={id:string;section_code:string;academic_courses:Course|null};
type Membership={relationship:"student"|"instructor";class_sections:Section|null};
type Props={accessToken:string;characterId:string;displayName:string;role:"student"|"faculty"};

function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
function validHex(value:string){return /^#[0-9a-f]{6}$/i.test(value);}
function uploadPath(characterId:string,file:File){const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];return `${characterId}/avatar-${crypto.randomUUID()}.${ext}`;}

export default function PortalAppearancePanel({accessToken,characterId,displayName,role}:Props){
 const [portal,setPortal]=useState<PortalPreference>({text_color:"#2d3b45",accent_color:"#17375f"});
 const [character,setCharacter]=useState<CharacterPreference>({profile_image_path:null,class_banner_colors:{}});
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [avatarUrl,setAvatarUrl]=useState("");
 const [status,setStatus]=useState("Loading appearance settings…");
 const [saving,setSaving]=useState(false);
 const expected=role==="student"?"student":"instructor";
 const classes=useMemo(()=>memberships.filter(row=>row.relationship===expected&&row.class_sections).map(row=>row.class_sections!),[memberships,expected]);

 const loadAvatar=useCallback(async(path:string|null)=>{if(!path){setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return "";});return;}const response=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(path)}`,{headers:headers(accessToken)});if(!response.ok)return;const url=URL.createObjectURL(await response.blob());setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return url;});},[accessToken]);
 const load=useCallback(async()=>{try{const select="relationship,class_sections(id,section_code,academic_courses(code,title))";const [portalResponse,characterResponse,membershipResponse]=await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/portal_ui_preferences?select=text_color,accent_color&limit=1`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?select=profile_image_path,class_banner_colors&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=${encodeURIComponent(select)}&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)})
 ]);if(!portalResponse.ok||!characterResponse.ok||!membershipResponse.ok)throw new Error("Appearance settings could not be loaded.");const portalRow=(await portalResponse.json() as PortalPreference[])[0];const characterRow=(await characterResponse.json() as CharacterPreference[])[0];const nextPortal=portalRow??{text_color:"#2d3b45",accent_color:"#17375f"};const nextCharacter=characterRow??{profile_image_path:null,class_banner_colors:{}};setPortal(nextPortal);setCharacter(nextCharacter);setMemberships(await membershipResponse.json() as Membership[]);await loadAvatar(nextCharacter.profile_image_path);setStatus("Appearance settings ready.");}catch(error){setStatus(error instanceof Error?error.message:"Appearance settings could not be loaded.");}},[accessToken,characterId,loadAvatar]);
 useEffect(()=>{void load();return()=>{setAvatarUrl(old=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old);return "";});};},[load]);

 async function savePortalTheme(){if(!validHex(portal.text_color)||!validHex(portal.accent_color)){setStatus("Choose valid six-digit colors.");return;}setSaving(true);try{const response=await fetch(`${SUPABASE_URL}/rest/v1/portal_ui_preferences?on_conflict=user_id`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}),body:JSON.stringify({text_color:portal.text_color,accent_color:portal.accent_color,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("Portal colors could not be saved.");document.documentElement.style.setProperty("--hanami-portal-text",portal.text_color);document.documentElement.style.setProperty("--hanami-portal-accent",portal.accent_color);document.documentElement.style.setProperty("--hanami-portal-accent-soft",`${portal.accent_color}18`);window.dispatchEvent(new Event("hanami-portal-theme-changed"));setStatus("Portal colors saved across Student, Faculty, Admin, and Owner views.");}catch(error){setStatus(error instanceof Error?error.message:"Portal colors could not be saved.");}finally{setSaving(false);}}

 async function saveCharacter(next:CharacterPreference,message:string){const response=await fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?on_conflict=character_id`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}),body:JSON.stringify({character_id:characterId,profile_image_path:next.profile_image_path,class_banner_colors:next.class_banner_colors,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error(message);setCharacter(next);window.dispatchEvent(new CustomEvent("hanami-character-identity-changed",{detail:{characterId}}));}

 async function uploadAvatar(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(!file)return;if(!IMAGE_TYPES.includes(file.type)||file.size>MAX_IMAGE_SIZE){setStatus("Profile images support JPEG, PNG, GIF, or WebP files up to 5 MB.");return;}const path=uploadPath(characterId,file);setSaving(true);try{const upload=await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${path}`,{method:"POST",headers:headers(accessToken,{"Content-Type":file.type,"x-upsert":"false"}),body:file});if(!upload.ok)throw new Error("Profile image upload failed.");const old=character.profile_image_path;const next={...character,profile_image_path:path};await saveCharacter(next,"Profile image could not be saved.");setAvatarUrl(previous=>{if(previous.startsWith("blob:"))URL.revokeObjectURL(previous);return URL.createObjectURL(file);});if(old&&old!==path)await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${old}`,{method:"DELETE",headers:headers(accessToken)}).catch(()=>undefined);setStatus("Profile image updated. It now appears in your portal identity card.");}catch(error){setStatus(error instanceof Error?error.message:"Profile image upload failed.");}finally{setSaving(false);}}

 async function setBanner(sectionId:string,color:string){if(!validHex(color))return;const next={...character,class_banner_colors:{...character.class_banner_colors,[sectionId]:color}};setSaving(true);try{await saveCharacter(next,"Class banner could not be saved.");setStatus("Class banner color saved.");}catch(error){setStatus(error instanceof Error?error.message:"Class banner could not be saved.");}finally{setSaving(false);}}

 return <section className={styles.panel} aria-labelledby="portal-appearance-title">
  <div className={styles.heading}><p className="eyebrow">PORTAL APPEARANCE</p><h4 id="portal-appearance-title">Customize your Canvas-style workspace</h4><p>Choose account-wide portal colors, a character profile image, and per-class banner colors without changing anyone else&apos;s view.</p></div>
  <div className={styles.section}><div className={styles.sectionTitle}><strong>Portal colors</strong><span>These follow your signed-in account across Student, Faculty, Admin, and Owner workspaces.</span></div><div className={styles.controls}><div className={styles.colorGrid}><label className={styles.colorField}><input type="color" value={portal.text_color} onChange={event=>setPortal({...portal,text_color:event.target.value})}/><span>Text color<code>{portal.text_color}</code></span></label><label className={styles.colorField}><input type="color" value={portal.accent_color} onChange={event=>setPortal({...portal,accent_color:event.target.value})}/><span>Accent color<code>{portal.accent_color}</code></span></label></div><button className={styles.button} type="button" disabled={saving} onClick={savePortalTheme}>Save portal colors</button></div></div>
  <div className={styles.section}><div className={styles.sectionTitle}><strong>Profile image</strong><span>This is the avatar shown beside {displayName} in the portal header. Your custom profile still keeps its own full canvas design.</span></div><div className={styles.avatarRow}><div className={styles.avatar}>{avatarUrl?<img src={avatarUrl} alt={`${displayName} profile`}/>:displayName.slice(0,1).toUpperCase()}</div><label className={styles.uploadLabel}>Choose profile image<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadAvatar}/></label></div></div>
  <div className={styles.section}><div className={styles.sectionTitle}><strong>Class banners</strong><span>Personalize the course-card banner color for this character. Only your own portal display changes.</span></div><div className={styles.controls}>{classes.length?<div className={styles.classList}>{classes.map(section=>{const color=character.class_banner_colors?.[section.id]??portal.accent_color;return <div className={styles.classRow} key={section.id}><div><strong>{section.academic_courses?.title??"Untitled course"}</strong><span>{section.academic_courses?.code??"COURSE"} • Section {section.section_code}</span></div><label className={styles.bannerControl}><input type="color" value={validHex(color)?color:portal.accent_color} onChange={event=>void setBanner(section.id,event.target.value)}/><span>Banner</span></label></div>;})}</div>:<span>No assigned classes yet. Banner controls will appear after Administration enrolls or assigns this character.</span>}</div></div>
  <div className={styles.status} aria-live="polite">{status}</div>
 </section>;
}
