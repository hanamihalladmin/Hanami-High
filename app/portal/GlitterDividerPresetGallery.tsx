"use client";

import {useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}

type Props={accessToken:string;characterId:string;onAdded:()=>void};
type GlitterPreset={name:string;text:string;color:string;shadow:string;fontSize:number};

const presets:GlitterPreset[]=[
 {name:"Pink Glitter",text:"✦･ﾟ: *✧･ﾟ:* ───────── *:･ﾟ✧*:･ﾟ✦",color:"#f08fbd",shadow:"0 0 5px #ffd7eb, 0 0 10px rgba(240,143,189,.75)",fontSize:22},
 {name:"Silver Glitter",text:"⋆｡°✩ ──── ✦ ──── ✩°｡⋆",color:"#d9e1eb",shadow:"0 0 4px #ffffff, 0 0 9px rgba(161,180,203,.9)",fontSize:23},
 {name:"Gold Glitter",text:"✧ ✦ ✧ ───────── ✧ ✦ ✧",color:"#e4b94c",shadow:"0 0 5px #fff0a6, 0 0 10px rgba(228,185,76,.8)",fontSize:23},
 {name:"Lavender Glitter",text:"⋆ ˚｡⋆୨୧˚ ─────── ˚୨୧⋆｡˚ ⋆",color:"#b89de8",shadow:"0 0 5px #eadfff, 0 0 10px rgba(184,157,232,.8)",fontSize:22},
 {name:"Blue Glitter",text:"✦ ⋆｡°✩ ───── ✩°｡⋆ ✦",color:"#8cb9e8",shadow:"0 0 5px #d9efff, 0 0 10px rgba(77,143,211,.8)",fontSize:23},
 {name:"Rainbow Glitter",text:"✧･ﾟ:* ✦ *:･ﾟ✧ ───── ✧･ﾟ:* ✦ *:･ﾟ✧",color:"#d87fc2",shadow:"2px 0 4px #78b9ff, -2px 0 4px #ffd36e, 0 0 9px rgba(216,127,194,.8)",fontSize:21},
 {name:"Heart Glitter",text:"♡ ✧ ♡ ✦ ♡ ───── ♡ ✦ ♡ ✧ ♡",color:"#ef7fa9",shadow:"0 0 5px #ffd4e4, 0 0 10px rgba(239,127,169,.85)",fontSize:22},
 {name:"Star Dust",text:"⋆ ˚ ✦ ｡ ⋆ ˚ ✧ ｡ ───── ｡ ✧ ˚ ⋆ ｡ ✦ ˚ ⋆",color:"#f5d36f",shadow:"0 0 4px #fff5c6, 0 0 10px rgba(245,211,111,.85)",fontSize:20}
];

export default function GlitterDividerPresetGallery({accessToken,characterId,onAdded}:Props){
 const [adding,setAdding]=useState("");
 const [status,setStatus]=useState("Transparent glitter dividers layer directly over your profile background.");
 async function addPreset(preset:GlitterPreset){
  if(adding)return;setAdding(preset.name);setStatus(`Adding ${preset.name}…`);
  try{
   const maxResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?select=z_index&character_id=eq.${encodeURIComponent(characterId)}&order=z_index.desc&limit=1`,{headers:headers(accessToken)});
   const maxRows=maxResponse.ok?await maxResponse.json() as Array<{z_index:number}>:[];
   const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"return=representation"}),body:JSON.stringify({character_id:characterId,widget_type:"sticker",x:80,y:120,width:560,height:58,z_index:(maxRows[0]?.z_index??0)+1,rotation:0,opacity:1,content:{text:preset.text},style:{fontSize:preset.fontSize,fontFamily:"Georgia, serif",color:preset.color,background:"transparent",borderRadius:0,textAlign:"center",borderWidth:0,borderColor:"transparent",borderStyle:"solid",boxShadow:"none",textShadow:preset.shadow},locked:false})});
   if(!response.ok)throw new Error("Glitter divider could not be added.");
   setStatus(`${preset.name} added with a transparent background.`);onAdded();
  }catch(error){setStatus(error instanceof Error?error.message:"Glitter divider could not be added.");}
  finally{setAdding("");}
 }
 return <section style={{marginTop:12,border:"1px solid #c8b5bf",background:"#fff",padding:12}} aria-label="Glitter divider presets">
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:10}}><div><p className="eyebrow">GLITTER DIVIDERS</p><h4 style={{margin:"3px 0 4px",font:"400 20px Georgia,serif"}}>Transparent sparkle lines</h4><p style={{margin:0,color:"#687789",fontSize:9}}>No white boxes. Each divider stays transparent so custom backgrounds show through.</p></div><span style={{fontSize:8,color:"#7a6780"}}>{status}</span></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>{presets.map(preset=><button key={preset.name} type="button" onClick={()=>addPreset(preset)} disabled={Boolean(adding)} style={{minHeight:74,padding:"10px 9px",border:"1px solid #d6c4cd",background:"linear-gradient(135deg,#fff,#faf7fb)",cursor:adding?"wait":"pointer",textAlign:"left"}}><strong style={{display:"block",fontSize:9,color:"#17375f",marginBottom:7}}>{preset.name}</strong><span style={{display:"block",overflow:"hidden",whiteSpace:"nowrap",fontSize:preset.fontSize,color:preset.color,textShadow:preset.shadow,background:"transparent"}}>{preset.text}</span></button>)}</div>
 </section>;
}
