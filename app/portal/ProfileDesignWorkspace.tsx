"use client";

import {useEffect,useState} from "react";
import ProfileTemplateGallery from "./ProfileTemplateGallery";
import ProfileStudioPanel from "./ProfileStudioPanel";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string;characterId:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function ProfileDesignWorkspace({accessToken,characterId}:Props){
  const [revision,setRevision]=useState(0);
  const [notice,setNotice]=useState("");
  const [unlocking,setUnlocking]=useState(false);
  useEffect(()=>{
    function refresh(event:Event){
      const detail=(event as CustomEvent<{characterId?:string}>).detail;
      if(detail?.characterId===characterId)setRevision(value=>value+1);
    }
    window.addEventListener("hanami-profile-template-applied",refresh);
    return()=>window.removeEventListener("hanami-profile-template-applied",refresh);
  },[characterId]);
  async function unlockAll(){
    if(unlocking)return;
    setUnlocking(true);setNotice("Unlocking every widget on this character page…");
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?character_id=eq.${encodeURIComponent(characterId)}&locked=eq.true`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({locked:false,updated_at:new Date().toISOString()})});
      if(!response.ok)throw new Error("Locked widgets could not be recovered.");
      setRevision(value=>value+1);setNotice("All profile widgets are unlocked and editable again.");
    }catch(error){setNotice(error instanceof Error?error.message:"Locked widgets could not be recovered.");}
    finally{setUnlocking(false);}
  }
  return <>
    <ProfileTemplateGallery accessToken={accessToken} characterId={characterId}/>
    <section style={{marginTop:12,padding:"10px 12px",border:"1px solid #c8b5bf",background:"#fff8fb",display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}} aria-label="Profile Studio recovery controls"><div><strong style={{display:"block",fontSize:9,color:"#8e4364",letterSpacing:".06em"}}>PROFILE STUDIO RECOVERY</strong><span style={{fontSize:9,color:"#6a6470"}}>If a locked widget becomes difficult to select, unlock every widget here and continue editing.</span>{notice&&<div style={{marginTop:4,fontSize:8,color:"#5d6d80"}}>{notice}</div>}</div><button type="button" onClick={unlockAll} disabled={unlocking} style={{minHeight:32,padding:"6px 10px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{unlocking?"Unlocking…":"Unlock all widgets"}</button></section>
    <ProfileStudioPanel key={`${characterId}-${revision}`} accessToken={accessToken} characterId={characterId}/>
  </>;
}
