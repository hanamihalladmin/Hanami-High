"use client";

import {useState} from "react";
import styles from "./ProfileTemplateGallery.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Props={accessToken:string;characterId:string};
type Widget={widget_type:"text"|"image"|"card"|"link"|"divider"|"sticker";x:number;y:number;width:number;height:number;z_index:number;rotation?:number;opacity?:number;content:Record<string,string>;style:Record<string,string|number>;locked?:boolean};
type Template={name:string;description:string;canvas:{canvas_width:number;canvas_height:number;background:string;background_image_url:null;grid_enabled:boolean;snap_enabled:boolean};widgets:Widget[]};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

const templates:Template[]=[
 {name:"Scrapbook",description:"Layered notes, stickers, photos, and diary-style blocks.",canvas:{canvas_width:960,canvas_height:1400,background:"#fff4f7",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:55,width:620,height:100,z_index:2,rotation:-1,content:{text:"MY HANAMI PAGE ✿"},style:{fontSize:44,fontFamily:"Georgia, serif",color:"#8f365b",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"sticker",x:760,y:50,width:120,height:120,z_index:4,rotation:8,content:{text:"花"},style:{fontSize:64,fontFamily:"Georgia, serif",color:"#9b315b",background:"#f7dce7",textAlign:"center",borderRadius:24}},
  {widget_type:"image",x:70,y:190,width:360,height:300,z_index:2,rotation:-2,content:{url:"",alt:"Profile photo"},style:{background:"#ffffff",borderRadius:8}},
  {widget_type:"card",x:470,y:210,width:390,height:250,z_index:3,rotation:2,content:{text:"Write a little introduction here. Favorite places, clubs, music, or whatever makes this character feel alive."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:16}},
  {widget_type:"divider",x:100,y:555,width:760,height:12,z_index:1,content:{},style:{background:"#d7a7bb",borderRadius:99}},
  {widget_type:"card",x:90,y:625,width:780,height:220,z_index:2,rotation:-1,content:{text:"CURRENT OBSESSIONS\n• Add a song\n• Add a quote\n• Add a club\n• Add a favorite place"},style:{fontSize:20,fontFamily:"Courier New, monospace",color:"#17375f",background:"#fffdf9",borderRadius:14}},
 ]},
 {name:"Student ID Board",description:"School-network profile inspired by notice boards and ID cards.",canvas:{canvas_width:960,canvas_height:1200,background:"#eef3f8",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"card",x:60,y:60,width:840,height:250,z_index:1,content:{text:"STUDENT PROFILE\nClass • Clubs • Homeroom • Status"},style:{fontSize:28,fontFamily:"Georgia, serif",color:"#17375f",background:"#ffffff",borderRadius:4}},
  {widget_type:"image",x:95,y:110,width:180,height:160,z_index:3,content:{url:"",alt:"Student portrait"},style:{background:"#f7dce7",borderRadius:2}},
  {widget_type:"text",x:330,y:115,width:500,height:70,z_index:4,content:{text:"CHARACTER NAME"},style:{fontSize:38,fontFamily:"Georgia, serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"card",x:60,y:360,width:400,height:320,z_index:2,content:{text:"ABOUT\nAdd biography, personality notes, or school-life details."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:4}},
  {widget_type:"card",x:500,y:360,width:400,height:320,z_index:2,content:{text:"SCHEDULE / CLUBS\nUse this space for classes, activities, and campus routines."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:4}},
 ]},
 {name:"Magazine Profile",description:"Editorial layout with large typography and image blocks.",canvas:{canvas_width:1200,canvas_height:1600,background:"#fffdf9",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:70,width:1000,height:150,z_index:3,content:{text:"THE HANAMI EDIT"},style:{fontSize:72,fontFamily:"Georgia, serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"divider",x:75,y:235,width:1040,height:8,z_index:2,content:{},style:{background:"#17375f",borderRadius:0}},
  {widget_type:"image",x:70,y:300,width:620,height:600,z_index:2,content:{url:"",alt:"Feature image"},style:{background:"#eef3f8",borderRadius:0}},
  {widget_type:"text",x:735,y:315,width:390,height:260,z_index:3,content:{text:"A CHARACTER\nIN THEIR\nOWN WORDS"},style:{fontSize:48,fontFamily:"Georgia, serif",color:"#8f365b",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"card",x:735,y:620,width:390,height:280,z_index:3,content:{text:"Add an editorial-style introduction, interview answers, or a character quote here."},style:{fontSize:20,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#f7eef2",borderRadius:0}},
  {widget_type:"card",x:70,y:980,width:1055,height:360,z_index:2,content:{text:"FEATURE STORY\nUse this wide section for a longer biography, relationships, lore, playlist notes, or roleplay hooks."},style:{fontSize:22,fontFamily:"Georgia, serif",color:"#17375f",background:"#ffffff",borderRadius:0}},
 ]},
 {name:"Minimal Desktop",description:"Clean personal homepage with compact cards and links.",canvas:{canvas_width:960,canvas_height:1200,background:"#f8fafc",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:70,width:820,height:90,z_index:2,content:{text:"hello, i'm your character."},style:{fontSize:42,fontFamily:"Arial, sans-serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"card",x:70,y:205,width:820,height:190,z_index:2,content:{text:"A simple biography or status area. Keep it minimal, or turn it into something completely different."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:18}},
  {widget_type:"link",x:70,y:455,width:250,height:58,z_index:2,content:{text:"messages",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#17375f",textAlign:"center",borderRadius:14}},
  {widget_type:"link",x:355,y:455,width:250,height:58,z_index:2,content:{text:"playlist",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#8f365b",textAlign:"center",borderRadius:14}},
  {widget_type:"link",x:640,y:455,width:250,height:58,z_index:2,content:{text:"favorites",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#f7dce7",textAlign:"center",borderRadius:14}},
 ]},
];

export default function ProfileTemplateGallery({accessToken,characterId}:Props){
 const [status,setStatus]=useState("Templates are optional starting points. Applying one replaces the current Profile Studio canvas and widgets.");
 const [applying,setApplying]=useState("");
 async function applyTemplate(template:Template){
  if(applying)return;
  if(!window.confirm(`Apply the ${template.name} template? This replaces the current Profile Studio widgets for this character.`))return;
  setApplying(template.name);setStatus(`Applying ${template.name}…`);
  try{
   const deleteResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?character_id=eq.${encodeURIComponent(characterId)}`,{method:"DELETE",headers:headers(accessToken)});
   if(!deleteResponse.ok)throw new Error("Existing profile widgets could not be cleared.");
   const canvasResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}),body:JSON.stringify({character_id:characterId,...template.canvas,updated_at:new Date().toISOString()})});
   if(!canvasResponse.ok)throw new Error("The template canvas could not be saved.");
   if(template.widgets.length){
    const widgetResponse=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify(template.widgets.map(widget=>({character_id:characterId,rotation:0,opacity:1,locked:false,...widget})))});
    if(!widgetResponse.ok)throw new Error("The template widgets could not be saved.");
   }
   setStatus(`${template.name} applied. Refresh Profile Studio to continue customizing every element.`);
   window.dispatchEvent(new CustomEvent("hanami-profile-template-applied",{detail:{characterId}}));
  }catch(error){setStatus(error instanceof Error?error.message:"The template could not be applied.");}
  finally{setApplying("");}
 }
 return <section className={styles.gallery} aria-labelledby="profile-templates-title"><div className={styles.heading}><div><p className="eyebrow">PROFILE TEMPLATES</p><h4 id="profile-templates-title">Start from a design</h4></div><span>OPTIONAL • FULLY EDITABLE</span></div><div className={styles.status} aria-live="polite">{status}</div><div className={styles.grid}>{templates.map(template=><article key={template.name}><div className={styles.preview} data-template={template.name.toLowerCase().replaceAll(" ","-")}><span>花</span><b>{template.name}</b></div><h5>{template.name}</h5><p>{template.description}</p><button type="button" onClick={()=>applyTemplate(template)} disabled={Boolean(applying)}>{applying===template.name?"Applying…":"Use template"}</button></article>)}</div><div className={styles.note}><strong>CANVA-INSPIRED, NOT TEMPLATE-LOCKED</strong><span>Templates only create a starting arrangement. Every widget remains movable, resizable, restylable, duplicable, and removable in Profile Studio.</span></div></section>;
}
