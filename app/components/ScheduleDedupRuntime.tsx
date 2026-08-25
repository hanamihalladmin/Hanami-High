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
function isGenericClassPeriod(row:HTMLElement){return /\bclass\s+period\b/i.test(row.textContent??"");}

function dedupeContainer(container:Element){
 const rows=[...container.children].filter((node):node is HTMLElement=>node instanceof HTMLElement);
 const byTime=new Map<string,HTMLElement>();
 const exactSeen=new Set<string>();
 rows.forEach(row=>{
  row.hidden=false;
  const time=normalizeTime(row.querySelector("time")?.textContent??"");
  const title=canonicalTitle(row.querySelector("strong")?.textContent??"");
  if(!time||!title)return;
  const exactKey=`${time}|${title}`;
  if(exactSeen.has(exactKey)){row.hidden=true;return;}
  exactSeen.add(exactKey);

  const previous=byTime.get(time);
  if(!previous){byTime.set(time,row);return;}
  const previousGeneric=isGenericClassPeriod(previous);
  const currentGeneric=isGenericClassPeriod(row);
  if(currentGeneric&&!previousGeneric){row.hidden=true;return;}
  if(previousGeneric&&!currentGeneric){previous.hidden=true;byTime.set(time,row);return;}
  // Different legitimate items can share a time (for example a club event and a school event).
  // Keep both unless one is the generic class-period mirror of the enrolled section meeting.
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
