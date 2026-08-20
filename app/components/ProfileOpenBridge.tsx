"use client";

import {useEffect} from "react";

type ProfileOpenEvent=CustomEvent<{handle?:string}>;

export default function ProfileOpenBridge(){
 useEffect(()=>{
  function open(event:Event){
   const handle=(event as ProfileOpenEvent).detail?.handle?.trim().replace(/^@/,"").toLowerCase();
   if(!handle)return;
   const heading=document.getElementById("profile-search-title");
   const section=heading?.closest("section");
   if(!(section instanceof HTMLElement))return;
   const details=section.closest("details");
   if(details instanceof HTMLDetailsElement)details.open=true;
   const input=section.querySelector<HTMLInputElement>('input[placeholder="character_handle"]');
   const form=input?.closest("form");
   if(!input||!form)return;
   const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
   setter?.call(input,handle);
   input.dispatchEvent(new Event("input",{bubbles:true}));
   input.dispatchEvent(new Event("change",{bubbles:true}));
   window.requestAnimationFrame(()=>{
    section.scrollIntoView({behavior:"smooth",block:"start"});
    window.setTimeout(()=>form.requestSubmit(),0);
   });
  }
  window.addEventListener("hanami-open-profile",open as EventListener);
  return()=>window.removeEventListener("hanami-open-profile",open as EventListener);
 },[]);
 return null;
}
