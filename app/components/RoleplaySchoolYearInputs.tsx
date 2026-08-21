"use client";

import {useEffect} from "react";

export default function RoleplaySchoolYearInputs(){
 useEffect(()=>{
  function apply(root:ParentNode=document){root.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]').forEach(input=>{
   if(!input.closest('section[aria-labelledby="dashboard-title"]'))return;
   input.min="2006-04-01T00:00";
   input.max="2007-03-31T23:59";
   input.dataset.schoolYear="2006-2007";
  });}
  apply();
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of Array.from(record.addedNodes))if(node instanceof HTMLElement)apply(node);});
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 return null;
}
