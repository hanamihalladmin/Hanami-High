"use client";

import {useCallback,useEffect,useState} from "react";
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Mode={enabled:boolean;title:string;starts_on:string|null;ends_on:string|null;temporary_style:string;announcement:string};
export default function ExamWeekRuntime(){
 const [mode,setMode]=useState<Mode|null>(null);
 const load=useCallback(async()=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_exam_week_mode`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:"{}"});if(!r.ok)return;const row=(await r.json() as Mode[])[0]??null;setMode(row);document.documentElement.dataset.hanamiExamWeek=row?.enabled?"on":"off";}catch{}},[]);
 useEffect(()=>{void load();const timer=window.setInterval(load,60000);return()=>{window.clearInterval(timer);delete document.documentElement.dataset.hanamiExamWeek;};},[load]);
 if(!mode?.enabled)return null;
 return <div role="status" style={{position:"sticky",top:0,zIndex:9990,padding:"6px 12px",textAlign:"center",background:"#fff7d6",borderBottom:"2px solid #8f365b",color:"#17375f",fontSize:10,fontWeight:700,letterSpacing:".04em"}}>📚 {mode.title.toUpperCase()}{mode.starts_on||mode.ends_on?` • ${mode.starts_on??"TBA"} – ${mode.ends_on??"TBA"}`:""}{mode.announcement?` • ${mode.announcement}`:""}</div>;
}
