"use client";

import {ChangeEvent,CSSProperties,useEffect,useState} from "react";
import ProfileTemplateGallery from "./ProfileTemplateGallery";
import ProfileDecorativePresetGallery from "./ProfileDecorativePresetGallery";
import GlitterDividerPresetGallery from "./GlitterDividerPresetGallery";
import ProfileStudioV2Panel from "./ProfileStudioV2Panel";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string;characterId:string};
type ResetWidget={id:string;content:Record<string,string>};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function photoPaths(content:Record<string,string>){try{const parsed=JSON.parse(content.photo_paths??"[]");return Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==="string"&&Boolean(value)):[];}catch{return [];}}

export default function ProfileDesignWorkspace({accessToken,characterId}:Props){
  const [revision,setRevision]=useState(0);
  const [notice,setNotice]=useState("");
  const [unlocking,setUnlocking]=useState(false);
  const [resetting,setResetting]=useState(false);
  const [backgroundUrl,setBackgroundUrl]=useState("");
  const [backgroundPath,setBackgroundPath]=useState("");
  const [uploadingBackground,setUploadingBackground]=useState(false);

  function refreshStudio(){window.dispatchEvent(new CustomEvent("hanami-profile-studio-refresh",{detail:{characterId}}));}

  useEffect(()=>{
    function refresh(event:Event){const detail=(event as CustomEvent<{characterId?:string}>).detail;if(detail?.characterId===characterId){setRevision(value=>value+1);refreshStudio();}}
    window.addEventListener("hanami-profile-template-applied",refresh);
    return()=>window.removeEventListener("hanami-profile-template-applied",refresh);
  },[characterId]);

  useEffect(()=>{let cancelled=false;let objectUrl="";(async()=>{try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?select=background_storage_path&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)});
    if(!response.ok)return;const rows=await response.json() as Array<{background_storage_path:string|null}>;const path=rows[0]?.background_storage_path??"";if(cancelled)return;setBackgroundPath(path);
    if(path){const media=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(path)}`,{headers:headers(accessToken)});if(media.ok){objectUrl=URL.createObjectURL(await media.blob());if(!cancelled)setBackgroundUrl(objectUrl);}}
    else if(!cancelled)setBackgroundUrl("");
  }catch{}})();return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[accessToken,characterId,revision]);

  async function unlockAll(){if(unlocking)return;setUnlocking(true);setNotice("Unlocking every widget on this character page…");try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?character_id=eq.${encodeURIComponent(characterId)}&locked=eq.true`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({locked:false,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("Locked widgets could not be recovered.");refreshStudio();setNotice("All profile widgets are unlocked and editable again.");}catch(error){setNotice(error instanceof Error?error.message:"Locked widgets could not be recovered.");}finally{setUnlocking(false);}}

  async function resetCanvas(){
    if(resetting)return;
    const confirmed=window.confirm("Reset this Profile Studio canvas? This permanently removes every widget, uploaded canvas background, and canvas customization for this character. Your character/account and profile identity are not deleted.");
    if(!confirmed)return;
    setResetting(true);setNotice("Resetting this character's Profile Studio canvas…");
    try{
      const widgetResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?select=id,content&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)});
      if(!widgetResponse.ok)throw new Error("Canvas widgets could not be inspected before reset.");
      const widgets=await widgetResponse.json() as ResetWidget[];
      const storagePaths=new Set<string>();
      for(const widget of widgets){if(widget.content?.storage_path)storagePaths.add(widget.content.storage_path);for(const path of photoPaths(widget.content??{}))storagePaths.add(path);}
      if(backgroundPath)storagePaths.add(backgroundPath);
      for(const widget of widgets){const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_owned_profile_widget`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_widget_id:widget.id})});if(!response.ok||!Boolean(await response.json()))throw new Error("One or more widgets could not be removed during reset.");}
      for(const path of storagePaths){await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${path}`,{method:"DELETE",headers:headers(accessToken)}).catch(()=>undefined);}
      const canvasResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({canvas_width:960,canvas_height:1200,background:"#fffafc",background_image_url:null,background_storage_path:null,grid_enabled:true,snap_enabled:true,updated_at:new Date().toISOString()})});
      if(!canvasResponse.ok)throw new Error("Widgets were removed, but the canvas defaults could not be restored.");
      setBackgroundPath("");setBackgroundUrl("");setRevision(value=>value+1);refreshStudio();window.dispatchEvent(new CustomEvent("hanami-profile-canvas-reset",{detail:{characterId}}));setNotice("Canvas reset complete. You now have a blank 960 × 1200 canvas with the default Hanami background, grid, and snapping restored.");
    }catch(error){setNotice(error instanceof Error?error.message:"The canvas could not be fully reset.");refreshStudio();}
    finally{setResetting(false);}
  }

  async function uploadBackground(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(!file)return;if(!["image/jpeg","image/png","image/gif","image/webp"].includes(file.type)){setNotice("Profile backgrounds support JPEG, PNG, GIF, or WebP images.");return;}if(file.size>5*1024*1024){setNotice("Profile background images must be 5 MB or smaller.");return;}setUploadingBackground(true);setNotice("Uploading private profile background…");const ext=file.type==="image/jpeg"?"jpg":file.type.split("/")[1];const path=`${characterId}/background-${crypto.randomUUID()}.${ext}`;try{const upload=await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${path}`,{method:"POST",headers:headers(accessToken,{"Content-Type":file.type,"x-upsert":"false"}),body:file});if(!upload.ok)throw new Error("Background image could not be uploaded.");const patch=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({background_storage_path:path,background_image_url:null,updated_at:new Date().toISOString()})});if(!patch.ok)throw new Error("Background image could not be attached to the profile canvas.");if(backgroundPath)await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${backgroundPath}`,{method:"DELETE",headers:headers(accessToken)}).catch(()=>undefined);setBackgroundPath(path);setRevision(value=>value+1);refreshStudio();setNotice("Profile background uploaded and applied.");}catch(error){setNotice(error instanceof Error?error.message:"Background image could not be uploaded.");}finally{setUploadingBackground(false);}}

  async function clearBackground(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({background_storage_path:null,background_image_url:null,updated_at:new Date().toISOString()})});if(!response.ok)throw new Error("Background could not be cleared.");if(backgroundPath)await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${backgroundPath}`,{method:"DELETE",headers:headers(accessToken)}).catch(()=>undefined);setBackgroundPath("");setBackgroundUrl("");setRevision(value=>value+1);refreshStudio();setNotice("Background image cleared. Canvas color is active again.");}catch(error){setNotice(error instanceof Error?error.message:"Background could not be cleared.");}}

  const studioStyle=(backgroundUrl?{"--hanami-profile-background-image":`url(${JSON.stringify(backgroundUrl)})`}: {}) as CSSProperties;
  return <>
    <ProfileTemplateGallery accessToken={accessToken} characterId={characterId}/>
    <ProfileDecorativePresetGallery accessToken={accessToken} characterId={characterId} onAdded={()=>refreshStudio()}/>
    <GlitterDividerPresetGallery accessToken={accessToken} characterId={characterId} onAdded={()=>refreshStudio()}/>
    <section style={{marginTop:12,padding:"10px 12px",border:"1px solid #c8b5bf",background:"#fff8fb",display:"grid",gap:10}} aria-label="Profile Studio workspace controls">
      <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}><div><strong style={{display:"block",fontSize:9,color:"#8e4364",letterSpacing:".06em"}}>PROFILE BACKGROUND</strong><span style={{fontSize:9,color:"#6a6470"}}>Upload a background directly from your device. Image URLs are no longer required.</span></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><label style={{minHeight:32,padding:"7px 10px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{uploadingBackground?"Uploading…":"Upload background"}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadBackground} disabled={uploadingBackground} style={{display:"none"}}/></label>{(backgroundPath||backgroundUrl)&&<button type="button" onClick={clearBackground} style={{minHeight:32,padding:"6px 10px",border:"1px solid #983845",background:"#fff",color:"#8b2632",fontSize:8,fontWeight:700,cursor:"pointer"}}>Clear background</button>}</div></div>
      <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}><div><strong style={{display:"block",fontSize:9,color:"#8e4364",letterSpacing:".06em"}}>PROFILE STUDIO V2</strong><span style={{fontSize:9,color:"#6a6470"}}>Enhanced editor: zoom, layers, keyboard nudging, border/shadow tools, corner presets, image fitting, style copy/paste, and private uploads.</span>{notice&&<div style={{marginTop:4,fontSize:8,color:"#5d6d80"}}>{notice}</div>}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button type="button" onClick={unlockAll} disabled={unlocking||resetting} style={{minHeight:32,padding:"6px 10px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{unlocking?"Unlocking…":"Unlock all widgets"}</button><button type="button" onClick={resetCanvas} disabled={resetting||unlocking} style={{minHeight:32,padding:"6px 10px",border:"1px solid #983845",background:"#fff3f4",color:"#8b2632",fontSize:8,fontWeight:700,cursor:"pointer"}}>{resetting?"Resetting canvas…":"Reset canvas"}</button></div></div>
    </section>
    <div style={studioStyle}><ProfileStudioV2Panel accessToken={accessToken} characterId={characterId}/></div>
  </>;
}
