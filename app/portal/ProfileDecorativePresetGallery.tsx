"use client";

import {useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}

type Category="Dividers"|"Stickers"|"Badges"|"Cards";
type WidgetType="divider"|"sticker"|"badge"|"card";
type Preset={name:string;category:Category;widget_type:WidgetType;width:number;height:number;content:Record<string,string>;style:Record<string,string|number>};
type Props={accessToken:string;characterId:string;onAdded:()=>void};

const presets:Preset[]=[
 {name:"Sakura Line",category:"Dividers",widget_type:"divider",width:460,height:14,content:{},style:{background:"#e7a6c1",borderRadius:99,borderWidth:0,borderColor:"#e7a6c1",borderStyle:"solid",boxShadow:"none"}},
 {name:"Navy Rule",category:"Dividers",widget_type:"divider",width:460,height:6,content:{},style:{background:"#17375f",borderRadius:0,borderWidth:0,borderColor:"#17375f",borderStyle:"solid",boxShadow:"none"}},
 {name:"Double School Line",category:"Dividers",widget_type:"divider",width:460,height:12,content:{},style:{background:"transparent",borderRadius:0,borderWidth:3,borderColor:"#8e4364",borderStyle:"double",boxShadow:"none"}},
 {name:"Retro Dash",category:"Dividers",widget_type:"divider",width:460,height:12,content:{},style:{background:"transparent",borderRadius:0,borderWidth:3,borderColor:"#17375f",borderStyle:"dashed",boxShadow:"none"}},
 {name:"Sakura",category:"Stickers",widget_type:"sticker",width:110,height:110,content:{text:"🌸"},style:{fontSize:58,fontFamily:"Arial, sans-serif",color:"#9b315b",background:"#fff0f6",borderRadius:28,textAlign:"center",borderWidth:1,borderColor:"#efbdd1",borderStyle:"solid",boxShadow:"0 4px 10px rgba(23,55,95,.12)"}},
 {name:"Sparkle",category:"Stickers",widget_type:"sticker",width:110,height:110,content:{text:"✦"},style:{fontSize:68,fontFamily:"Georgia, serif",color:"#b07924",background:"#fff8d8",borderRadius:99,textAlign:"center",borderWidth:1,borderColor:"#e3ca7d",borderStyle:"solid",boxShadow:"0 3px 8px rgba(23,55,95,.12)"}},
 {name:"Heart",category:"Stickers",widget_type:"sticker",width:110,height:110,content:{text:"♥"},style:{fontSize:66,fontFamily:"Georgia, serif",color:"#b43f68",background:"#ffe8f0",borderRadius:24,textAlign:"center",borderWidth:0,borderColor:"#b43f68",borderStyle:"solid",boxShadow:"none"}},
 {name:"School Flower",category:"Stickers",widget_type:"sticker",width:120,height:120,content:{text:"花"},style:{fontSize:64,fontFamily:"Georgia, serif",color:"#ffffff",background:"#8e4364",borderRadius:99,textAlign:"center",borderWidth:5,borderColor:"#f3d4e0",borderStyle:"double",boxShadow:"0 8px 22px rgba(23,55,95,.22)"}},
 {name:"Hanami Club",category:"Badges",widget_type:"badge",width:190,height:66,content:{text:"HANAMI CLUB"},style:{fontSize:15,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#8e4364",borderRadius:99,textAlign:"center",borderWidth:0,borderColor:"#8e4364",borderStyle:"solid",boxShadow:"none"}},
 {name:"Honor Badge",category:"Badges",widget_type:"badge",width:180,height:66,content:{text:"★ HONOR ★"},style:{fontSize:15,fontFamily:"Georgia, serif",color:"#6a4a13",background:"#fff1b8",borderRadius:10,textAlign:"center",borderWidth:2,borderColor:"#c79e42",borderStyle:"double",boxShadow:"0 3px 8px rgba(23,55,95,.12)"}},
 {name:"Retro Label",category:"Badges",widget_type:"badge",width:190,height:62,content:{text:"MY HANAMI"},style:{fontSize:15,fontFamily:"Courier New, monospace",color:"#17375f",background:"#eef3f8",borderRadius:4,textAlign:"center",borderWidth:2,borderColor:"#17375f",borderStyle:"dashed",boxShadow:"4px 4px 0 rgba(23,55,95,.20)"}},
 {name:"Soft Ribbon",category:"Badges",widget_type:"badge",width:200,height:66,content:{text:"WELCOME ♡"},style:{fontSize:15,fontFamily:"Georgia, serif",color:"#8e4364",background:"#fff0f6",borderRadius:18,textAlign:"center",borderWidth:1,borderColor:"#e7b6ca",borderStyle:"solid",boxShadow:"none"}},
 {name:"Notebook Card",category:"Cards",widget_type:"card",width:360,height:180,content:{text:"Write a note, favorites list, mini bio, or profile section here."},style:{fontSize:18,fontFamily:"Courier New, monospace",color:"#17375f",background:"#fffdf4",borderRadius:4,borderWidth:1,borderColor:"#b9c7d6",borderStyle:"dashed",boxShadow:"4px 4px 0 rgba(23,55,95,.12)"}},
 {name:"Sakura Card",category:"Cards",widget_type:"card",width:360,height:180,content:{text:"Add a soft profile section here 🌸"},style:{fontSize:18,fontFamily:"Georgia, serif",color:"#8e4364",background:"#fff5f9",borderRadius:24,borderWidth:1,borderColor:"#e9bfd0",borderStyle:"solid",boxShadow:"0 8px 22px rgba(23,55,95,.14)"}},
 {name:"School Card",category:"Cards",widget_type:"card",width:360,height:180,content:{text:"HANAMI HIGH\nAdd your school-life details here."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#17375f",borderRadius:12,borderWidth:4,borderColor:"#d7a7bb",borderStyle:"double",boxShadow:"none"}},
 {name:"Minimal Card",category:"Cards",widget_type:"card",width:360,height:180,content:{text:"A clean block for anything you want to feature."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:0,borderWidth:1,borderColor:"#cbd4dd",borderStyle:"solid",boxShadow:"none"}}
];

export default function ProfileDecorativePresetGallery({accessToken,characterId,onAdded}:Props){
 const [category,setCategory]=useState<Category>("Dividers");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const categories:Category[]=["Dividers","Stickers","Badges","Cards"];
 async function addPreset(preset:Preset){if(busy)return;setBusy(true);setNotice(`Adding ${preset.name}…`);try{
   const zResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?select=z_index&character_id=eq.${encodeURIComponent(characterId)}&order=z_index.desc&limit=1`,{headers:headers(accessToken)});
   const rows=zResponse.ok?await zResponse.json() as Array<{z_index:number}>:[];const nextZ=(rows[0]?.z_index??0)+1;const offset=(nextZ%8)*18;
   const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"return=minimal"}),body:JSON.stringify({character_id:characterId,widget_type:preset.widget_type,x:50+offset,y:70+offset,width:preset.width,height:preset.height,z_index:nextZ,rotation:0,opacity:1,content:preset.content,style:preset.style,locked:false})});
   if(!response.ok)throw new Error(`${preset.name} could not be added.`);setNotice(`${preset.name} added to the canvas.`);onAdded();
 }catch(error){setNotice(error instanceof Error?error.message:"Decorative preset could not be added.");}finally{setBusy(false);}}
 return <section style={{marginTop:12,border:"1px solid #c4b2bd",background:"#fff",overflow:"hidden"}} aria-label="Decorative element preset library">
  <div style={{padding:"11px 13px",background:"#f8e9f1",borderBottom:"1px solid #d8b7c5"}}><strong style={{display:"block",fontSize:10,color:"#8e4364",letterSpacing:".06em"}}>DECORATIVE ELEMENT LIBRARY</strong><span style={{fontSize:9,color:"#6a6470"}}>Choose a ready-made divider, sticker, badge, or card. Every preset remains fully editable after it is added.</span></div>
  <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"9px 12px",borderBottom:"1px solid #d7dee6",background:"#f7f9fb"}}>{categories.map(item=><button key={item} type="button" onClick={()=>setCategory(item)} style={{minHeight:30,padding:"5px 9px",border:"1px solid #17375f",background:category===item?"#17375f":"#fff",color:category===item?"#fff":"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{item}</button>)}</div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,padding:12}}>{presets.filter(p=>p.category===category).map(preset=><button key={preset.name} type="button" disabled={busy} onClick={()=>addPreset(preset)} style={{minHeight:88,padding:10,border:"1px solid #c5ced8",background:"#fff",color:"#17375f",textAlign:"left",cursor:"pointer"}}><span style={{display:"block",fontSize:9,fontWeight:700,marginBottom:5}}>{preset.name}</span><span style={{display:"flex",alignItems:"center",justifyContent:"center",height:42,border:"1px solid #e0e5ea",background:String(preset.style.background??"#fff"),color:String(preset.style.color??preset.style.borderColor??"#17375f"),borderRadius:Number(preset.style.borderRadius??0),fontSize:preset.widget_type==="sticker"?28:10,overflow:"hidden"}}>{preset.widget_type==="divider"?"━━━━":preset.content.text??preset.name}</span></button>)}</div>
  {notice&&<div style={{padding:"8px 12px",borderTop:"1px solid #e0d5db",background:"#fffafc",fontSize:8,color:"#637184"}}>{notice}</div>}
 </section>;
}
