"use client";

import {useCallback,useEffect,useState} from "react";
import styles from "./ProfileMemoryLibrary.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,...extra};}

type Props={accessToken:string;characterId:string;onAdded?:()=>void};
type Memory={id:string;entry_type:string;title:string;description:string|null;image_url:string|null;happened_on:string|null;visibility:string;created_at:string};
type Canvas={canvas_width:number;canvas_height:number};
type Widget={z_index:number};

export default function ProfileMemoryLibrary({accessToken,characterId,onAdded}:Props){
 const [memories,setMemories]=useState<Memory[]>([]);
 const [canvas,setCanvas]=useState<Canvas>({canvas_width:960,canvas_height:1200});
 const [maxZ,setMaxZ]=useState(0);
 const [status,setStatus]=useState("Loading school memories…");
 const [busyId,setBusyId]=useState("");

 const load=useCallback(async()=>{try{const [memoryResponse,canvasResponse,widgetResponse]=await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/memory_scrapbook_entries?select=id,entry_type,title,description,image_url,happened_on,visibility,created_at&character_id=eq.${encodeURIComponent(characterId)}&order=created_at.desc`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?select=canvas_width,canvas_height&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?select=z_index&character_id=eq.${encodeURIComponent(characterId)}&order=z_index.desc&limit=1`,{headers:headers(accessToken)})
 ]);if(!memoryResponse.ok)throw new Error("School memories could not be loaded.");const rows=await memoryResponse.json() as Memory[];setMemories(rows);if(canvasResponse.ok){const canvases=await canvasResponse.json() as Canvas[];if(canvases[0])setCanvas(canvases[0]);}if(widgetResponse.ok){const widgets=await widgetResponse.json() as Widget[];setMaxZ(widgets[0]?.z_index??0);}setStatus(rows.length?`${rows.length} scrapbook memor${rows.length===1?"y":"ies"} available.`:"No scrapbook memories yet. Add one from My Hanami Space → Scrapbook.");}catch(error){setStatus(error instanceof Error?error.message:"School memories could not be loaded.");}},[accessToken,characterId]);
 useEffect(()=>{void load();},[load]);

 async function addWidget(memory:Memory,kind:"image"|"card"){
  setBusyId(`${memory.id}:${kind}`);setStatus(`Adding ${memory.title} to your profile…`);
  try{const isImage=kind==="image";const width=isImage?320:360,height=isImage?220:180;const index=memories.findIndex(item=>item.id===memory.id);const x=Math.max(0,Math.min(canvas.canvas_width-width,70+(Math.max(index,0)*28)%280));const y=Math.max(0,Math.min(canvas.canvas_height-height,90+(Math.max(index,0)*34)%360));const content=isImage?{url:memory.image_url??"",storage_path:"",alt:memory.title,source_memory_id:memory.id,memory_title:memory.title}:{text:[memory.title,memory.description,memory.happened_on?`Date: ${memory.happened_on}`:null].filter(Boolean).join("\n\n"),source_memory_id:memory.id,memory_title:memory.title};const style=isImage?{background:"#eef3f8",borderRadius:12,borderWidth:3,borderColor:"#ffffff",borderStyle:"solid",boxShadow:"0 4px 14px rgba(23,55,95,.18)",objectFit:"cover",objectPosition:"50% 50%",flipX:1,flipY:1}:{fontSize:18,fontFamily:"Georgia, serif",color:"#17375f",background:"#fffafc",borderRadius:14,borderWidth:1,borderColor:"#d7b9c5",borderStyle:"solid",boxShadow:"0 3px 10px rgba(23,55,95,.08)"};const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"return=representation"}),body:JSON.stringify({character_id:characterId,widget_type:kind,x,y,width,height,z_index:maxZ+1,rotation:0,opacity:1,content,style,locked:false})});if(!response.ok)throw new Error("That memory could not be placed on the profile canvas.");setMaxZ(value=>value+1);setStatus(`${memory.title} added as a ${isImage?"photo":"memory card"}.`);window.dispatchEvent(new CustomEvent("hanami-profile-studio-refresh",{detail:{characterId}}));onAdded?.();}catch(error){setStatus(error instanceof Error?error.message:"That memory could not be added.");}finally{setBusyId("");}
 }

 return <section className={styles.library} aria-label="Scrapbook memory library"><header><div><strong>SCRAPBOOK → PROFILE</strong><span>Place saved school memories directly onto your Canva-style profile canvas.</span></div><small>{status}</small></header>{memories.length?<div className={styles.scroller}>{memories.map(memory=><article className={styles.memory} key={memory.id}>{memory.image_url?<img src={memory.image_url} alt=""/>:<div className={styles.placeholder}>✦</div>}<div className={styles.copy}><strong>{memory.title}</strong>{memory.description&&<p>{memory.description}</p>}<small>{memory.happened_on??new Date(memory.created_at).toLocaleDateString()} • {memory.visibility.replaceAll("_"," ")}</small></div><div className={styles.actions}>{memory.image_url&&<button type="button" disabled={Boolean(busyId)} onClick={()=>void addWidget(memory,"image")}>{busyId===`${memory.id}:image`?"Adding…":"Add photo"}</button>}<button type="button" disabled={Boolean(busyId)} onClick={()=>void addWidget(memory,"card")}>{busyId===`${memory.id}:card`?"Adding…":"Add memory card"}</button></div></article>)}</div>:null}</section>;
}
