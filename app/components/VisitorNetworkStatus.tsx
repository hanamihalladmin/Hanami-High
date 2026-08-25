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
 return <div className={className} aria-label="Hanami network status">
  <span><b>VISITOR</b> {String(visits??0).padStart(6,"0")}</span>
  <span><b>NETWORK</b> {online?"ONLINE":"OFFLINE"}</span>
  <span><b>EDITION</b> 2006</span>
 </div>;
}
