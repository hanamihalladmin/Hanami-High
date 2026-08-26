"use client";

import {useEffect} from "react";

const CONTROL_TAGS=new Set(["BUTTON","INPUT","TEXTAREA","SELECT","OPTION","SUMMARY"]);

function parseRgb(value:string){
 const match=value.match(/rgba?\(([^)]+)\)/i);
 if(!match)return null;
 const parts=match[1].split(",").map(v=>Number.parseFloat(v.trim()));
 if(parts.length<3||parts.slice(0,3).some(Number.isNaN))return null;
 return {r:parts[0],g:parts[1],b:parts[2],a:parts.length>3&&Number.isFinite(parts[3])?parts[3]:1};
}

function channel(v:number){
 const s=Math.max(0,Math.min(255,v))/255;
 return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);
}

function luminance(r:number,g:number,b:number){return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b);}

function backgroundFor(element:HTMLElement){
 let current:HTMLElement|null=element;
 while(current){
  const style=getComputedStyle(current);
  const image=style.backgroundImage;
  const parsed=parseRgb(style.backgroundColor);
  if(image&&image!=="none"){
   if(parsed&&parsed.a>.08)return parsed;
   return {r:48,g:48,b:48,a:1};
  }
  if(parsed&&parsed.a>.08)return parsed;
  current=current.parentElement;
 }
 return {r:255,g:255,b:255,a:1};
}

function hasOwnText(element:HTMLElement){
 if(CONTROL_TAGS.has(element.tagName))return true;
 if(element.matches("a,[role='button'],[role='tab'],[role='link']"))return true;
 return Array.from(element.childNodes).some(node=>node.nodeType===Node.TEXT_NODE&&Boolean(node.textContent?.trim()));
}

function applyTextColor(element:HTMLElement,target:"black"|"white"){
 const value=target==="black"?"#000":"#fff";
 if(element.dataset.hanamiContrast!==target)element.dataset.hanamiContrast=target;
 element.style.setProperty("color",value,"important");
 element.style.setProperty("-webkit-text-fill-color",value,"important");
 element.style.setProperty("text-decoration-color",value,"important");
}

function applyContrast(root:ParentNode=document){
 const elements=root instanceof HTMLElement?[root,...Array.from(root.querySelectorAll<HTMLElement>("*"))]:Array.from(root.querySelectorAll<HTMLElement>("body *"));
 for(const element of elements){
  if(!hasOwnText(element))continue;
  if(element.closest("svg,script,style,noscript"))continue;
  const bg=backgroundFor(element);
  const target:"black"|"white"=luminance(bg.r,bg.g,bg.b)>.179?"black":"white";
  applyTextColor(element,target);
 }
}

export default function StrictTextContrastRuntime(){
 useEffect(()=>{
  let frame=0;
  const schedule=()=>{
   if(frame)return;
   frame=requestAnimationFrame(()=>{frame=0;applyContrast();});
  };
  applyContrast();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style","hidden"]});
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("load",schedule,{once:true});
  return()=>{
   observer.disconnect();
   window.removeEventListener("resize",schedule);
   window.removeEventListener("load",schedule);
   if(frame)cancelAnimationFrame(frame);
  };
 },[]);
 return null;
}
