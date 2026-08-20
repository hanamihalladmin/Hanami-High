"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Theme={theme_key:string;title:string;starts_on:string;ends_on:string};

export default function SiteThemeRuntime(){
 const [theme,setTheme]=useState<Theme|null>(null);
 useEffect(()=>{void(async()=>{try{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_school_theme`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:"{}"});if(response.ok){const rows=await response.json() as Theme[];setTheme(rows[0]??null);}}catch{}})();},[]);
 useEffect(()=>{const root=document.documentElement;delete root.dataset.hanamiWebMode;if(theme?.theme_key)root.dataset.hanamiSchoolTheme=theme.theme_key;else delete root.dataset.hanamiSchoolTheme;try{localStorage.removeItem("hanami.web-mode.v1");}catch{}},[theme]);
 return null;
}
