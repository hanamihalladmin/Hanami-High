"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const MODE_KEY="hanami.web-mode.v1";
type Theme={theme_key:string;title:string;starts_on:string;ends_on:string};
export default function SiteThemeRuntime(){const [mode,setMode]=useState<"standard"|"2006">("standard");const [theme,setTheme]=useState<Theme|null>(null);useEffect(()=>{try{const saved=localStorage.getItem(MODE_KEY);if(saved==="2006")setMode("2006");}catch{}void(async()=>{try{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_school_theme`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:"{}"});if(response.ok){const rows=await response.json() as Theme[];setTheme(rows[0]??null);}}catch{}})();},[]);useEffect(()=>{const root=document.documentElement;root.dataset.hanamiWebMode=mode;if(theme?.theme_key)root.dataset.hanamiSchoolTheme=theme.theme_key;else delete root.dataset.hanamiSchoolTheme;try{localStorage.setItem(MODE_KEY,mode);}catch{}},[mode,theme]);return <button type="button" onClick={()=>setMode(value=>value==="standard"?"2006":"standard")} title={theme?`Scheduled theme: ${theme.title}`:"No scheduled seasonal theme"} style={{position:"fixed",left:14,bottom:14,zIndex:44,minHeight:30,padding:"6px 9px",border:"1px solid #17375f",background:"#fff",color:"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>{mode==="2006"?"Use standard web":"Use 2006 web mode"}</button>}
