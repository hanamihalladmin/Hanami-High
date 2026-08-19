"use client";

import {ChangeEvent,CSSProperties,useEffect,useState} from "react";
import ProfileTemplateGallery from "./ProfileTemplateGallery";
import ProfileDecorativePresetGallery from "./ProfileDecorativePresetGallery";
import ProfileStudioV2Panel from "./ProfileStudioV2Panel";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string;characterId:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function ProfileDesignWorkspace({accessToken,characterId}:Props){
  const [revision,setRevision]=useState(0);
  const [notice,setNotice]=useState("");
  const [unlocking,setUnlocking]=useState(false);
  const [backgroundUrl,setBackgroundUrl]=useState("");
  const [backgroundPath,setBackgroundPath]=useState("");
  const [uploadingBackground,setUploadingBackground]=useState(false);

  useEffect(()=>{
    function refresh(event:Event){const detail=(event as CustomEvent<{characterId?:string}>).detail;if(detail?.characterId===characterId)setRevision(value=>value+1);}
    window.addEventListener("hanami-profile-template-applied",refresh);
    return()=>window.removeEventListener("hanami-profile-template-applied",refresh);
  },[characterId]);

  useEffect(()=>{let cancelled=false;let objectUrl="";(async()=>{try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?select=background_storage_path&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)});
    if(!response.ok)return;const rows=await response.json() as Array<{background_storage_path:string|null}>;const path=rows[0]?.background_storage_path??"";if(cancelled)return;setBackgroundPath(path);
    if(path){const media=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(path)}`,{headers:headers(accessToken)});if(media.ok){objectUrl=URL.createObjectURL(await media.blob());if(!cancelled)setBackgroundUrl(objectUrl);}}
  }catch{}})();return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[accessToken,characterId,revision]);

  async function unlockAll(){if(unlocking)return;setUnlocking(true);setNotice("Unlocking every widget on this character page…");try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?character_id=eq.${encodeURIComponent(characterId)}&locked=eq.true`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({locked:false,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("Locked widgets could not be recovered.");setRevision(value=>value+1);setNotice("All profile widgets are unlocked and editable again.");}catch(error){setNotice(error instanceof Error?error.message:"Locked widgets could not be recovered.");}finally{setUnlocking(false);}}

  async function uploadBackground(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(!file)return;if(!["image/jpeg","image/png","image/gif","image/webp"].includes(file.type)){setNotice("Profile backgrounds support JPEG, PNG, GIF, or WebP images.");return;}if(file.size>5*1024*1024){setNotice("Profile background images must be 5 MB or smaller.");return;}setUploadingBackground(true);setNotice("Uploading private profile background…");const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];const path=`${characterId}/background-${crypto.randomUUID()}.${ext}`;try{const upload=await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${path}`,{method:"POST",headers:headers(accessToken,{"Content-Type":file.type,"x-upsert":"false"}),body:file});if(!upload.ok)throw new Error("Background image could not be uploaded.");const patch=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({background_storage_path:path,background_image_url:null,updated_at:new Date().toISOString()})});if(!patch.ok)throw new Error("Background image could not be attached to the profile canvas.");if(backgroundPath)await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${backgroundPath}`,{method:"DELETE",headers:headers(accessToken)}).catch(()=>undefined);setBackgroundPath(path);setRevision(value=>value+1);setNotice("Profile background uploaded and applied.");}catch(error){setNotice(error instanceof Error?error.message:"Background image could not be uploaded.");}finally{setUploadingBackground(false);}}

  async function clearBackground(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({background_storage_path:null,background_image_url:null,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("Background could not be cleared.");if(backgroundPath)await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${backgroundPath}`,{method:"DELETE",headers:headers(accessToken)}).catch(()=>undefined);setBackgroundPath("");setBackgroundUrl("");setRevision(value=>value+1);setNotice("Background image cleared. Canvas color is active again.");}catch(error){setNotice(error instanceof Error?error.message:"Background could not be cleared.");}}

  const studioStyle=(backgroundUrl?{"--hanami-profile-background-image":`url(${JSON.stringify(backgroundUrl)})`}: {}) as CSSProperties;
  return <>
    <ProfileTemplateGallery accessToken={accessToken} characterId={characterId}/>
    <ProfileDecorativePresetGallery accessToken={accessToken} characterId={characterId} onAdded={()=>setRevision(value=>value+1)}/>
    <section style={{marginTop:12,padding:"10px 12px",border:"1px solid #c8b5bf",background:"#fff8fb",display:"grid",gap:10}} aria-label="Profile Studio workspace controls">
      <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}><div><strong style={{display:"block",fontSize:9,color:"#8e4364",letterSpacing:".06em"}}>PROFILE BACKGROUND</strong><span style={{fontSize:9,color:"#6a6470"}}>Upload a background directly from your device. Image URLs are no longer required.</span></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><label style={{minHeight:32,padding:"7px 10px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{uploadingBackground?"Uploading…":"Upload background"}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadBackground} disabled={uploadingBackground} style={{display:"none"}}/></label>{(backgroundPath||backgroundUrl)&&<button type="button" onClick={clearBackground} style={{minHeight:32,padding:"6px 10px",border:"1px solid #983845",background:"#fff",color:"#8b2632",fontSize:8,fontWeight:700,cursor:"pointer"}}>Clear background</button>}</div></div>
      <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}><div><strong style={{display:"block",fontSize:9,color:"#8e4364",letterSpacing:".06em"}}>PROFILE STUDIO V2</strong><span style={{fontSize:9,color:"#6a6470"}}>Enhanced editor: zoom, layers, keyboard nudging, border/shadow tools, corner presets, image fitting, style copy/paste, and private uploads.</span>{notice&&<div style={{marginTop:4,fontSize:8,color:"#5d6d80"}}>{notice}</div>}</div><button type="button" onClick={unlockAll} disabled={unlocking} style={{minHeight:32,padding:"6px 10px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{unlocking?"Unlocking…":"Unlock all widgets"}</button></div>
    </section>
    <div style={studioStyle}><ProfileStudioV2Panel key={`${characterId}-${revision}`} accessToken={accessToken} characterId={characterId}/></div>
  </>;
}
