"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Theme={theme_key:string;title:string;starts_on:string;ends_on:string};

function tokyoMonth(){
 const value=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"numeric"}).format(new Date());
 return Number(value);
}
function seasonalFallback(){
 const month=tokyoMonth();
 if(month===3||month===4)return "sakura";
 if(month===6||month===7)return "rainy-season";
 if(month===9||month===10)return "culture-festival";
 if(month===12||month===1||month===2)return "winter";
 return "school-default";
}

export default function SiteThemeRuntime(){
 const [theme,setTheme]=useState<Theme|null>(null);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{void(async()=>{try{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_school_theme`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:"{}"});if(response.ok){const rows=await response.json() as Theme[];setTheme(rows[0]??null);}}catch{}finally{setLoaded(true)}})();},[]);
 useEffect(()=>{if(!loaded)return;const root=document.documentElement;delete root.dataset.hanamiWebMode;const key=theme?.theme_key||seasonalFallback();if(key&&key!=="school-default")root.dataset.hanamiSchoolTheme=key;else delete root.dataset.hanamiSchoolTheme;try{localStorage.removeItem("hanami.web-mode.v1");}catch{}},[theme,loaded]);
 return null;
}
