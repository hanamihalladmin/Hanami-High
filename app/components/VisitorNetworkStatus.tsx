"use client";

import {useEffect,useState} from "react";

type Props={className?:string};
const KEY="hanami.public.visitor-count.v1";

export default function VisitorNetworkStatus({className}:Props){
 const [visits,setVisits]=useState<number|null>(null);
 const [online,setOnline]=useState(true);
 useEffect(()=>{
  function sync(){setOnline(navigator.onLine)}
  sync();window.addEventListener("online",sync);window.addEventListener("offline",sync);
  try{const next=Math.max(1,Number(localStorage.getItem(KEY)??"0")+1);localStorage.setItem(KEY,String(next));setVisits(next)}catch{setVisits(1)}
  return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync)};
 },[]);
 return <div className={className} aria-label="Hanami network status" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap",padding:"6px 10px",border:"1px solid var(--hh-line)",background:"#e9ece3",color:"var(--hh-muted)",font:"700 8px var(--hh-font-ui)",letterSpacing:".08em"}}>
  <span><b style={{color:"var(--hh-navy)"}}>VISITOR</b> {String(visits??0).padStart(6,"0")}</span>
  <span><b style={{color:"var(--hh-navy)"}}>NETWORK</b> {online?"ONLINE":"OFFLINE"}</span>
  <span><b style={{color:"var(--hh-navy)"}}>EDITION</b> 2006</span>
 </div>;
}
