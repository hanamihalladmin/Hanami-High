"use client";

import {useCallback,useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Flag={key:string;enabled:boolean};
type Maintenance={enabled?:boolean;message?:string};

function portalHref(target:"owner"|"admin"){
 if(typeof window==="undefined")return target==="owner"?"./portal/owner/":"./portal/?maintenanceTarget=admin";
 const base=window.location.pathname.startsWith("/Hanami-High/")?"/Hanami-High":"";
 return target==="owner"?`${base}/portal/owner/`:`${base}/portal/?maintenanceTarget=admin`;
}

export default function RuntimeOperationsBridge(){
 const [maintenance,setMaintenance]=useState<Maintenance>({enabled:false});const [loaded,setLoaded]=useState(false);
 const load=useCallback(async()=>{try{const [flagsResponse,runtimeResponse]=await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/feature_flags?select=key,enabled`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}}),fetch(`${SUPABASE_URL}/rest/v1/site_runtime_config?select=value&key=eq.maintenance&limit=1`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}})]);if(flagsResponse.ok){const flags=await flagsResponse.json() as Flag[];for(const flag of flags){document.documentElement.dataset[`feature${flag.key.replace(/[^a-z0-9]/gi,"")}`]=flag.enabled?"on":"off";}window.dispatchEvent(new CustomEvent("hanami-feature-flags",{detail:{flags}}));}if(runtimeResponse.ok){const rows=await runtimeResponse.json() as Array<{value:Maintenance}>;setMaintenance(rows[0]?.value??{enabled:false});}}catch{}finally{setLoaded(true);}},[]);
 useEffect(()=>{void load();const timer=window.setInterval(load,60000);return()=>window.clearInterval(timer);},[load]);
 if(!loaded||!maintenance.enabled)return null;
 const path=typeof window!=="undefined"?window.location.pathname:"";
 const privileged=/\/portal\/(?:owner|admin)(?:\/|$)/.test(path);
 const gateway=/\/portal\/?$/.test(path);
 if(privileged||gateway)return <div style={{position:"fixed",bottom:8,right:8,zIndex:10000,padding:"7px 10px",background:"#fff4d7",border:"1px solid #8e6b24",fontSize:10,color:"#5f4b1e"}}>MAINTENANCE MODE ACTIVE • {gateway?"sign-in gateway remains available":"privileged access remains available"}</div>;
 return <div role="alertdialog" aria-modal="true" aria-label="Hanami School Network maintenance" style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:24,background:"rgba(17,28,42,.94)"}}><section style={{maxWidth:620,width:"100%",padding:"28px",background:"#fffdf8",border:"4px double #8f365b",boxShadow:"0 18px 60px rgba(0,0,0,.35)",textAlign:"center"}}><p className="eyebrow">HANAMI SCHOOL NETWORK</p><h1 style={{margin:"6px 0 12px",font:"400 32px Georgia,serif",color:"#17375f"}}>School Network Maintenance</h1><p style={{lineHeight:1.6,color:"#536174"}}>{maintenance.message||"Hanami School Network maintenance is in progress."}</p><p style={{marginTop:16,fontSize:10,color:"#7a6872"}}>Student and Faculty portal activity is temporarily unavailable. Owner and Administration sign-in remains available for maintenance work.</p><div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:10,marginTop:18}}><a href={portalHref("owner")} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:40,padding:"0 16px",border:"1px solid #17375f",background:"#17375f",color:"#fff",fontSize:11,fontWeight:700,textDecoration:"none"}}>Owner Sign-In</a><a href={portalHref("admin")} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:40,padding:"0 16px",border:"1px solid #8f365b",background:"#fff",color:"#8f365b",fontSize:11,fontWeight:700,textDecoration:"none"}}>Administration Sign-In</a></div><p style={{marginTop:12,fontSize:9,lineHeight:1.5,color:"#897780"}}>Owner Sign-In now opens the Owner portal directly. If no Hanami session exists, that page starts Discord authentication itself and returns you straight to the Owner portal afterward.</p></section></div>;
}
