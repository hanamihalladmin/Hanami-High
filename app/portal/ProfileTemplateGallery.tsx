"use client";

import {useState} from "react";
import styles from "./ProfileTemplateGallery.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Props={accessToken:string;characterId:string};
type WidgetType="text"|"image"|"card"|"link"|"divider"|"sticker"|"quote"|"playlist"|"photo_strip"|"badge"|"marquee"|"guestbook";
type Widget={widget_type:WidgetType;x:number;y:number;width:number;height:number;z_index:number;rotation?:number;opacity?:number;content:Record<string,string>;style:Record<string,string|number>;locked?:boolean};
type Template={name:string;description:string;canvas:{canvas_width:number;canvas_height:number;background:string;background_image_url:null;grid_enabled:boolean;snap_enabled:boolean};widgets:Widget[]};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

const templates:Template[]=[
 {name:"Scrapbook",description:"Layered notes, stickers, photos, and diary-style blocks.",canvas:{canvas_width:960,canvas_height:1400,background:"#fff4f7",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:55,width:620,height:100,z_index:2,rotation:-1,content:{text:"MY HANAMI PAGE ✿"},style:{fontSize:44,fontFamily:"Georgia, serif",color:"#8f365b",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"sticker",x:760,y:50,width:120,height:120,z_index:4,rotation:8,content:{text:"H"},style:{fontSize:64,fontFamily:"Georgia, serif",color:"#9b315b",background:"#f7dce7",textAlign:"center",borderRadius:24}},
  {widget_type:"image",x:70,y:190,width:360,height:300,z_index:2,rotation:-2,content:{url:"",alt:"Profile photo"},style:{background:"#ffffff",borderRadius:8}},
  {widget_type:"card",x:470,y:210,width:390,height:250,z_index:3,rotation:2,content:{text:"Write a little introduction here. Favorite places, clubs, music, or whatever makes this character feel alive."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:16}},
  {widget_type:"divider",x:100,y:555,width:760,height:12,z_index:1,content:{},style:{background:"#d7a7bb",borderRadius:99}},
  {widget_type:"photo_strip",x:120,y:620,width:720,height:210,z_index:2,rotation:-1,content:{text:"PHOTO STRIP",photo_paths:"[]",alt:"School memories"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:8,textAlign:"center"}},
  {widget_type:"playlist",x:100,y:895,width:760,height:300,z_index:2,content:{text:"NOW PLAYING\n01. Track title — Artist\n02. Track title — Artist\n03. Track title — Artist"},style:{fontSize:18,fontFamily:"Courier New, monospace",color:"#17375f",background:"#fffdf9",borderRadius:14}}
 ]},
 {name:"Student ID Board",description:"School-network profile inspired by notice boards and ID cards.",canvas:{canvas_width:960,canvas_height:1200,background:"#eef3f8",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"card",x:60,y:60,width:840,height:250,z_index:1,content:{text:"STUDENT PROFILE\nClass • Clubs • Homeroom • Status"},style:{fontSize:28,fontFamily:"Georgia, serif",color:"#17375f",background:"#ffffff",borderRadius:4}},
  {widget_type:"image",x:95,y:110,width:180,height:160,z_index:3,content:{url:"",alt:"Student portrait"},style:{background:"#f7dce7",borderRadius:2}},
  {widget_type:"text",x:330,y:115,width:500,height:70,z_index:4,content:{text:"CHARACTER NAME"},style:{fontSize:38,fontFamily:"Georgia, serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"badge",x:330,y:205,width:190,height:58,z_index:5,content:{text:"HOMEROOM A"},style:{fontSize:15,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#8f365b",borderRadius:99,textAlign:"center"}},
  {widget_type:"card",x:60,y:360,width:400,height:320,z_index:2,content:{text:"ABOUT\nAdd biography, personality notes, or school-life details."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:4}},
  {widget_type:"card",x:500,y:360,width:400,height:320,z_index:2,content:{text:"SCHEDULE / CLUBS\nUse this space for classes, activities, and campus routines."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:4}},
  {widget_type:"guestbook",x:60,y:735,width:840,height:300,z_index:2,content:{text:"GUESTBOOK / LINK BOARD\nLeave shout-outs, character links, and profile navigation here."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:4}}
 ]},
 {name:"Magazine Profile",description:"Editorial layout with large typography, quotes, and image blocks.",canvas:{canvas_width:1200,canvas_height:1600,background:"#fffdf9",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:70,width:1000,height:150,z_index:3,content:{text:"THE HANAMI EDIT"},style:{fontSize:72,fontFamily:"Georgia, serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"divider",x:75,y:235,width:1040,height:8,z_index:2,content:{},style:{background:"#17375f",borderRadius:0}},
  {widget_type:"image",x:70,y:300,width:620,height:600,z_index:2,content:{url:"",alt:"Feature image"},style:{background:"#eef3f8",borderRadius:0}},
  {widget_type:"text",x:735,y:315,width:390,height:260,z_index:3,content:{text:"A CHARACTER\nIN THEIR\nOWN WORDS"},style:{fontSize:48,fontFamily:"Georgia, serif",color:"#8f365b",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"quote",x:735,y:620,width:390,height:280,z_index:3,content:{text:"“Put an interview pull-quote or favorite saying here.”",credit:"— Character name"},style:{fontSize:25,fontFamily:"Georgia, serif",color:"#17375f",background:"#f7eef2",borderRadius:0}},
  {widget_type:"card",x:70,y:980,width:1055,height:360,z_index:2,content:{text:"FEATURE STORY\nUse this wide section for a longer biography, relationships, lore, playlist notes, or roleplay hooks."},style:{fontSize:22,fontFamily:"Georgia, serif",color:"#17375f",background:"#ffffff",borderRadius:0}}
 ]},
 {name:"Minimal Desktop",description:"Clean personal homepage with compact cards and links.",canvas:{canvas_width:960,canvas_height:1200,background:"#f8fafc",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:70,width:820,height:90,z_index:2,content:{text:"hello, i'm your character."},style:{fontSize:42,fontFamily:"Arial, sans-serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"marquee",x:70,y:165,width:820,height:54,z_index:2,content:{text:"★ welcome to my hanami page ★"},style:{fontSize:16,fontFamily:"Courier New, monospace",color:"#8f365b",background:"#fff4f7",borderRadius:4,textAlign:"center"}},
  {widget_type:"card",x:70,y:260,width:820,height:190,z_index:2,content:{text:"A simple biography or status area. Keep it minimal, or turn it into something completely different."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:18}},
  {widget_type:"link",x:70,y:510,width:250,height:58,z_index:2,content:{text:"messages",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#17375f",textAlign:"center",borderRadius:14}},
  {widget_type:"link",x:355,y:510,width:250,height:58,z_index:2,content:{text:"playlist",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#8f365b",textAlign:"center",borderRadius:14}},
  {widget_type:"link",x:640,y:510,width:250,height:58,z_index:2,content:{text:"favorites",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#f7dce7",textAlign:"center",borderRadius:14}}
 ]},
 {name:"Yearbook Page",description:"A 2006 school yearbook spread with portrait, quote, memories, and signatures.",canvas:{canvas_width:1100,canvas_height:1500,background:"#f5efe4",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"text",x:70,y:55,width:960,height:90,z_index:3,content:{text:"HANAMI HIGH • CLASS OF 2006"},style:{fontSize:42,fontFamily:"Georgia, serif",color:"#24344d",background:"transparent",textAlign:"center",borderRadius:0}},
  {widget_type:"divider",x:90,y:155,width:920,height:5,z_index:2,content:{},style:{background:"#24344d",borderRadius:0}},
  {widget_type:"image",x:90,y:220,width:360,height:450,z_index:3,content:{url:"",alt:"Yearbook portrait"},style:{background:"#ffffff",borderRadius:0,borderWidth:8,borderColor:"#ffffff",borderStyle:"solid"}},
  {widget_type:"text",x:500,y:235,width:500,height:90,z_index:4,content:{text:"CHARACTER NAME"},style:{fontSize:44,fontFamily:"Georgia, serif",color:"#8f365b",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"badge",x:500,y:345,width:210,height:62,z_index:4,content:{text:"HOMEROOM • CLUB"},style:{fontSize:15,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#24344d",borderRadius:99,textAlign:"center"}},
  {widget_type:"quote",x:500,y:445,width:500,height:220,z_index:3,content:{text:"“Add a yearbook quote here.”",credit:"— Spring 2006"},style:{fontSize:27,fontFamily:"Georgia, serif",color:"#24344d",background:"#fffdf8",borderRadius:0}},
  {widget_type:"photo_strip",x:90,y:760,width:920,height:220,z_index:3,content:{text:"MEMORIES",photo_paths:"[]",alt:"Yearbook memories"},style:{fontSize:17,fontFamily:"Arial, sans-serif",color:"#24344d",background:"#ffffff",borderRadius:0,textAlign:"center"}},
  {widget_type:"guestbook",x:90,y:1040,width:920,height:320,z_index:2,content:{text:"SIGNATURES & NOTES\nFriends can inspire the notes you collect here."},style:{fontSize:19,fontFamily:"Courier New, monospace",color:"#24344d",background:"#fffdf8",borderRadius:0}}
 ]},
 {name:"Club Spotlight",description:"A club-centered profile with roster badge, recruitment message, playlist, and meeting board.",canvas:{canvas_width:1000,canvas_height:1400,background:"#edf4f1",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"badge",x:65,y:55,width:230,height:70,z_index:4,content:{text:"HANAMI CLUB"},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#285d50",borderRadius:99,textAlign:"center"}},
  {widget_type:"text",x:65,y:155,width:870,height:115,z_index:3,content:{text:"CLUB SPOTLIGHT"},style:{fontSize:58,fontFamily:"Georgia, serif",color:"#17375f",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"image",x:65,y:315,width:520,height:390,z_index:3,content:{url:"",alt:"Club group photo"},style:{background:"#ffffff",borderRadius:6}},
  {widget_type:"card",x:620,y:315,width:315,height:390,z_index:3,content:{text:"ABOUT THE CLUB\nWhat we do, when we meet, what new members should know, and current goals."},style:{fontSize:19,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:6}},
  {widget_type:"marquee",x:65,y:760,width:870,height:58,z_index:3,content:{text:"★ NOW RECRUITING • VISIT US AFTER SCHOOL ★"},style:{fontSize:18,fontFamily:"Courier New, monospace",color:"#285d50",background:"#dcece6",borderRadius:4,textAlign:"center"}},
  {widget_type:"playlist",x:65,y:875,width:410,height:300,z_index:2,content:{text:"CLUB PLAYLIST\n01. Track — Artist\n02. Track — Artist\n03. Track — Artist"},style:{fontSize:17,fontFamily:"Courier New, monospace",color:"#17375f",background:"#ffffff",borderRadius:8}},
  {widget_type:"guestbook",x:525,y:875,width:410,height:300,z_index:2,content:{text:"MEETING BOARD\nClub links, notices, member shout-outs, and roleplay hooks."},style:{fontSize:17,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:8}}
 ]},
 {name:"Spring Festival",description:"Cherry-blossom seasonal page for Cultural Festival and spring school events.",canvas:{canvas_width:1000,canvas_height:1450,background:"#fff0f5",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"marquee",x:60,y:55,width:880,height:62,z_index:4,content:{text:"✿ HANAMI HIGH SPRING FESTIVAL 2006 ✿"},style:{fontSize:20,fontFamily:"Courier New, monospace",color:"#8f365b",background:"#ffffff",borderRadius:4,textAlign:"center"}},
  {widget_type:"text",x:70,y:165,width:760,height:120,z_index:3,rotation:-1,content:{text:"SPRING MEMORIES"},style:{fontSize:60,fontFamily:"Georgia, serif",color:"#8f365b",background:"transparent",textAlign:"left",borderRadius:0}},
  {widget_type:"sticker",x:830,y:160,width:100,height:100,z_index:5,rotation:8,content:{text:"🌸"},style:{fontSize:54,fontFamily:"Georgia, serif",color:"#9b315b",background:"#f8d9e6",textAlign:"center",borderRadius:50}},
  {widget_type:"photo_strip",x:70,y:335,width:860,height:230,z_index:3,content:{text:"FESTIVAL PHOTO STRIP",photo_paths:"[]",alt:"Festival memories"},style:{fontSize:17,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:8,textAlign:"center"}},
  {widget_type:"card",x:70,y:635,width:410,height:310,z_index:2,rotation:-1,content:{text:"MY FESTIVAL DAY\nBooth plans, performances, club duties, food stalls, and favorite memories."},style:{fontSize:20,fontFamily:"Georgia, serif",color:"#17375f",background:"#ffffff",borderRadius:12}},
  {widget_type:"quote",x:520,y:635,width:410,height:310,z_index:2,rotation:1,content:{text:"“Write the line that defined this festival day.”",credit:"— Hanami High, 2006"},style:{fontSize:25,fontFamily:"Georgia, serif",color:"#8f365b",background:"#fff8fb",borderRadius:12}},
  {widget_type:"guestbook",x:70,y:1030,width:860,height:280,z_index:2,content:{text:"FESTIVAL GUESTBOOK\nCollect character shout-outs and event memories here."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:12}}
 ]},
 {name:"2006 Web Profile",description:"A deliberately nostalgic early-social-web profile using marquees, badges, links, and playlists.",canvas:{canvas_width:960,canvas_height:1350,background:"#eef0ff",background_image_url:null,grid_enabled:true,snap_enabled:true},widgets:[
  {widget_type:"marquee",x:55,y:45,width:850,height:58,z_index:4,content:{text:"★ WELCOME 2 MY HANAMI PAGE ★"},style:{fontSize:18,fontFamily:"Courier New, monospace",color:"#5f2e91",background:"#fff7ff",borderRadius:0,textAlign:"center"}},
  {widget_type:"text",x:55,y:145,width:850,height:85,z_index:3,content:{text:"~* character_name *~"},style:{fontSize:46,fontFamily:"Arial, sans-serif",color:"#17375f",background:"transparent",textAlign:"center",borderRadius:0}},
  {widget_type:"image",x:65,y:280,width:330,height:300,z_index:3,content:{url:"",alt:"Profile picture"},style:{background:"#ffffff",borderRadius:0,borderWidth:4,borderColor:"#5f2e91",borderStyle:"solid"}},
  {widget_type:"card",x:435,y:280,width:460,height:300,z_index:2,content:{text:"ABOUT ME\nstatus: online\nhomeroom: ?\nclub: ?\nlikes: ?\ndislikes: ?"},style:{fontSize:18,fontFamily:"Courier New, monospace",color:"#17375f",background:"#ffffff",borderRadius:0}},
  {widget_type:"playlist",x:65,y:650,width:400,height:300,z_index:2,content:{text:"PROFILE SONGS\n01. Track — Artist\n02. Track — Artist\n03. Track — Artist"},style:{fontSize:17,fontFamily:"Courier New, monospace",color:"#17375f",background:"#f9f6ff",borderRadius:0}},
  {widget_type:"guestbook",x:505,y:650,width:390,height:300,z_index:2,content:{text:"COMMENTS / GUESTBOOK\nLeave shout-outs and character links here."},style:{fontSize:17,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:0}},
  {widget_type:"link",x:65,y:1030,width:250,height:58,z_index:3,content:{text:"MESSAGE ME",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#5f2e91",textAlign:"center",borderRadius:0}},
  {widget_type:"link",x:355,y:1030,width:250,height:58,z_index:3,content:{text:"MY FRIENDS",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#17375f",textAlign:"center",borderRadius:0}},
  {widget_type:"link",x:645,y:1030,width:250,height:58,z_index:3,content:{text:"MY CLUB",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#8f365b",textAlign:"center",borderRadius:0}}
 ]}
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
   setStatus(`${template.name} applied. Open Canvas to continue customizing every element.`);
   window.dispatchEvent(new CustomEvent("hanami-profile-template-applied",{detail:{characterId}}));
  }catch(error){setStatus(error instanceof Error?error.message:"The template could not be applied.");}
  finally{setApplying("");}
 }
 return <section className={styles.gallery} aria-labelledby="profile-templates-title"><div className={styles.heading}><div><p className="eyebrow">PROFILE TEMPLATES</p><h4 id="profile-templates-title">Start from a design</h4></div><span>OPTIONAL • FULLY EDITABLE</span></div><div className={styles.status} aria-live="polite">{status}</div><div className={styles.grid}>{templates.map(template=><article key={template.name}><div className={styles.preview} data-template={template.name.toLowerCase().replaceAll(" ","-")}><span>H</span><b>{template.name}</b></div><h5>{template.name}</h5><p>{template.description}</p><button type="button" onClick={()=>applyTemplate(template)} disabled={Boolean(applying)}>{applying===template.name?"Applying…":"Use template"}</button></article>)}</div><div className={styles.note}><strong>CANVA-INSPIRED, NOT TEMPLATE-LOCKED</strong><span>Templates only create a starting arrangement. Every widget remains movable, resizable, restylable, duplicable, and removable in Profile Studio.</span></div></section>;
}