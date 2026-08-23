"use client";

import {useEffect} from "react";
import {hanamiRoleplayNow} from "./roleplay-date";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";

type PortalSession={accessToken?:string};
type Preference={text_color:string;accent_color:string};
type SchoolState={seasonal_state:string};
type ThemeSchedule={theme_key:string;title:string};

function applyTheme(text="#2d3b45",accent="#17375f",season="spring"){
 document.documentElement.style.setProperty("--hanami-portal-text",text);
 document.documentElement.style.setProperty("--hanami-portal-accent",accent);
 document.documentElement.style.setProperty("--hanami-portal-accent-soft",`${accent}18`);
 document.documentElement.dataset.hanamiSeason=season||"spring";
 const palette:Record<string,{seasonAccent:string;seasonSoft:string}>={
  spring:{seasonAccent:"#b95f83",seasonSoft:"#fff1f6"},rainy:{seasonAccent:"#506f96",seasonSoft:"#eef5fb"},summer:{seasonAccent:"#a56a24",seasonSoft:"#fff6df"},festival:{seasonAccent:"#9b315b",seasonSoft:"#fff0f5"},autumn_sports:{seasonAccent:"#9a512d",seasonSoft:"#fff1e9"},winter:{seasonAccent:"#486a8a",seasonSoft:"#eef6fb"},exams:{seasonAccent:"#5d6170",seasonSoft:"#f3f3f6"},graduation:{seasonAccent:"#6f4d7d",seasonSoft:"#f7f0fb"}
 };
 const selected=palette[season]??palette.spring;
 document.documentElement.style.setProperty("--hanami-season-accent",selected.seasonAccent);
 document.documentElement.style.setProperty("--hanami-season-soft",selected.seasonSoft);
}
function roleplayDate(){const value=hanamiRoleplayNow();const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",month:"2-digit",day:"2-digit"}).formatToParts(value);return `2006-${parts.find(x=>x.type==="month")?.value??"01"}-${parts.find(x=>x.type==="day")?.value??"01"}`;}

export default function PortalThemeRuntime(){
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   try{
    const raw=localStorage.getItem(SESSION_KEY);if(!raw){applyTheme();return;}
    const session=JSON.parse(raw) as PortalSession;if(!session.accessToken){applyTheme();return;}
    const auth={apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.accessToken}`};const today=roleplayDate();
    const [preferenceResponse,stateResponse,scheduleResponse]=await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/portal_ui_preferences?select=text_color,accent_color&limit=1`,{headers:auth}),
      fetch(`${SUPABASE_URL}/rest/v1/school_state_config?select=seasonal_state&id=eq.1&limit=1`,{headers:auth}),
      fetch(`${SUPABASE_URL}/rest/v1/school_theme_schedule?select=theme_key,title&enabled=eq.true&starts_on=lte.${today}&ends_on=gte.${today}&order=starts_on.desc&limit=1`,{headers:auth})
    ]);
    const preference=preferenceResponse.ok?(await preferenceResponse.json() as Preference[])[0]:undefined;
    const schoolState=stateResponse.ok?(await stateResponse.json() as SchoolState[])[0]:undefined;
    const scheduled=scheduleResponse.ok?(await scheduleResponse.json() as ThemeSchedule[])[0]:undefined;
    if(!cancelled)applyTheme(preference?.text_color,preference?.accent_color,scheduled?.theme_key||schoolState?.seasonal_state||"spring");
   }catch{if(!cancelled)applyTheme();}
  }
  void load();
  function refresh(){void load();}
  window.addEventListener("hanami-portal-theme-changed",refresh);
  window.addEventListener("hanami-school-state-changed",refresh);
  const timer=window.setInterval(()=>void load(),120000);
  return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener("hanami-portal-theme-changed",refresh);window.removeEventListener("hanami-school-state-changed",refresh);};
 },[]);
 return null;
}
