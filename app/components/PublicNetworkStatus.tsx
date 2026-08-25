"use client";

import {useEffect,useState} from "react";

export default function PublicNetworkStatus(){
 const [visits,setVisits]=useState<number|null>(null);
 useEffect(()=>{
  const key="hanami.public.local-visits.v1";
  try{
   const next=Math.max(1,Number(localStorage.getItem(key)??"0")+1);
   localStorage.setItem(key,String(next));
   setVisits(next);
  }catch{setVisits(1)}
 },[]);
 return <span aria-label="Hanami school network status">NETWORK: ONLINE · YOUR VISITS: {String(visits??1).padStart(6,"0")} · JST</span>;
}
