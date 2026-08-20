"use client";

import {useEffect} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";

type PortalSession={accessToken?:string};
type Preference={text_color:string;accent_color:string};

function applyTheme(text="#2d3b45",accent="#17375f"){
 document.documentElement.style.setProperty("--hanami-portal-text",text);
 document.documentElement.style.setProperty("--hanami-portal-accent",accent);
 document.documentElement.style.setProperty("--hanami-portal-accent-soft",`${accent}18`);
}

export default function PortalThemeRuntime(){
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   try{
    const raw=localStorage.getItem(SESSION_KEY);if(!raw){applyTheme();return;}
    const session=JSON.parse(raw) as PortalSession;if(!session.accessToken){applyTheme();return;}
    const response=await fetch(`${SUPABASE_URL}/rest/v1/portal_ui_preferences?select=text_color,accent_color&limit=1`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.accessToken}`}});
    if(!response.ok){applyTheme();return;}
    const row=(await response.json() as Preference[])[0];if(!cancelled)applyTheme(row?.text_color,row?.accent_color);
   }catch{if(!cancelled)applyTheme();}
  }
  void load();
  function refresh(){void load();}
  window.addEventListener("hanami-portal-theme-changed",refresh);
  return()=>{cancelled=true;window.removeEventListener("hanami-portal-theme-changed",refresh);};
 },[]);
 return null;
}
