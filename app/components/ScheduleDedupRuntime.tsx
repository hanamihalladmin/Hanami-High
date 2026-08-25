"use client";

import {useEffect} from "react";

function canonicalTitle(value:string){
 const clean=value.trim().toLowerCase().replace(/[()]/g," ").replace(/\s+/g," ");
 if(clean.includes("asa-no-kai")||clean.includes("morning homeroom"))return "morning homeroom";
 if(clean.includes("shoe change"))return "shoe change";
 if(clean==="arrival"||clean.startsWith("arrival "))return "arrival";
 if(clean==="lunch"||clean.startsWith("lunch "))return "lunch";
 return clean;
}

function normalizeTime(value:string){return value.replace(/\s+/g," ").trim().toLowerCase();}

function dedupeContainer(container:Element){
 const rows=[...container.children].filter((node):node is HTMLElement=>node instanceof HTMLElement);
 const seen=new Set<string>();
 rows.forEach(row=>{
  row.hidden=false;
  const time=normalizeTime(row.querySelector("time")?.textContent??"");
  const title=canonicalTitle(row.querySelector("strong")?.textContent??"");
  if(!time||!title)return;
  const key=`${time}|${title}`;
  if(seen.has(key))row.hidden=true;else seen.add(key);
 });
}

function run(){
 document.querySelectorAll('[class*="StudentDashboardOverview_timeline"],[class*="StudentDashboardSchedule_timeline"]').forEach(dedupeContainer);
}

export default function ScheduleDedupRuntime(){
 useEffect(()=>{
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});};
  queue();
  const observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  return()=>observer.disconnect();
 },[]);
 return null;
}
