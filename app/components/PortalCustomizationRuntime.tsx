"use client";

import {useEffect} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
const CHARACTER_SESSION_KEY="hanami.portal.character.v1";
const IMAGE_TYPES=["image/jpeg","image/png","image/gif","image/webp"];
const MAX_IMAGE_SIZE=5*1024*1024;
const STORAGE_PREFIX="hanami-storage://profile-media/";

type Session={accessToken:string};
type PortalPreference={text_color:string;accent_color:string};
type Skin={sidebar?:string;surface?:string;accent?:string;text?:string};
type CharacterPreference={portal_skin?:Skin};

function readSession(){try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const value=JSON.parse(raw) as Partial<Session>;return typeof value.accessToken==="string"?{accessToken:value.accessToken}:null;}catch{return null;}}
function readCharacterId(){try{return localStorage.getItem(CHARACTER_SESSION_KEY)||"";}catch{return "";}}
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
function validCharacterId(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function isImageUrlField(input:HTMLInputElement){
 const placeholder=input.placeholder||"";
 const parentText=input.closest("label")?.textContent||input.parentElement?.textContent||"";
 const text=`${placeholder} ${parentText}`.replace(/\s+/g," ").toLowerCase();
 const imageWord=/(image|photo|portrait|picture|banner|logo|background|cover|sticker|thumbnail)/.test(text);
 const urlWord=/\burl\b/.test(text);
 return imageWord&&urlWord;
}
function setReactInputValue(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;if(setter)setter.call(input,value);else input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));}
function fileExtension(file:File){if(file.type==="image/jpeg")return "jpg";if(file.type==="image/png")return "png";if(file.type==="image/gif")return "gif";return "webp";}

export default function PortalCustomizationRuntime(){
 useEffect(()=>{
  let dead=false;
  const blobUrls=new Set<string>();
  const enhancedInputs=new WeakSet<HTMLInputElement>();
  const resolvingImages=new WeakSet<HTMLImageElement>();

  async function applyTheme(){
   const session=readSession();const characterId=readCharacterId();
   if(!session||!validCharacterId(characterId))return;
   try{
    const [portalResponse,characterResponse]=await Promise.all([
     fetch(`${SUPABASE_URL}/rest/v1/portal_ui_preferences?select=text_color,accent_color&limit=1`,{headers:headers(session.accessToken)}),
     fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?select=portal_skin&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(session.accessToken)})
    ]);
    if(dead)return;
    const portal=portalResponse.ok?((await portalResponse.json() as PortalPreference[])[0]??null):null;
    const character=characterResponse.ok?((await characterResponse.json() as CharacterPreference[])[0]??null):null;
    const accent=character?.portal_skin?.accent||portal?.accent_color||"#17375f";
    const text=character?.portal_skin?.text||portal?.text_color||"#2d3b45";
    const sidebar=character?.portal_skin?.sidebar||`color-mix(in srgb, ${accent} 80%, #fff 20%)`;
    const surface=character?.portal_skin?.surface||`color-mix(in srgb, ${accent} 4%, #fff 96%)`;
    const root=document.documentElement;
    root.style.setProperty("--hanami-custom-accent",accent);
    root.style.setProperty("--hanami-custom-text",text);
    root.style.setProperty("--hanami-custom-sidebar",sidebar);
    root.style.setProperty("--hanami-custom-surface",surface);
   }catch{}
  }

  async function resolveStoredImage(img:HTMLImageElement){
   const src=img.getAttribute("src")||"";
   if(!src.startsWith(STORAGE_PREFIX)||resolvingImages.has(img))return;
   const session=readSession();if(!session)return;
   const path=src.slice(STORAGE_PREFIX.length);if(!path)return;
   resolvingImages.add(img);
   try{
    const response=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(path)}`,{headers:headers(session.accessToken)});
    if(!response.ok)return;
    const url=URL.createObjectURL(await response.blob());blobUrls.add(url);img.src=url;
   }catch{}finally{resolvingImages.delete(img);}
  }

  function enhanceInput(input:HTMLInputElement){
   if(enhancedInputs.has(input)||!isImageUrlField(input))return;
   enhancedInputs.add(input);
   input.dataset.hanamiImageUrlSource="true";
   input.setAttribute("aria-hidden","true");
   input.tabIndex=-1;
   input.style.display="none";
   const picker=document.createElement("label");picker.className="hanami-device-image-picker";
   const text=document.createElement("span");text.textContent="Choose image from device";
   const file=document.createElement("input");file.type="file";file.accept="image/jpeg,image/png,image/gif,image/webp";
   picker.append(text,file);input.insertAdjacentElement("afterend",picker);
   file.addEventListener("change",async()=>{
    const selected=file.files?.[0];file.value="";if(!selected)return;
    const session=readSession();const characterId=readCharacterId();
    if(!session||!validCharacterId(characterId)){text.textContent="Open a character first";return;}
    if(!IMAGE_TYPES.includes(selected.type)){text.textContent="Use JPEG, PNG, GIF, or WebP";return;}
    if(selected.size>MAX_IMAGE_SIZE){text.textContent="Image must be 5 MB or smaller";return;}
    const old=text.textContent;text.textContent="Uploading…";file.disabled=true;
    const path=`${characterId}/device-${crypto.randomUUID()}.${fileExtension(selected)}`;
    try{
     const response=await fetch(`${SUPABASE_URL}/storage/v1/object/profile-media/${path}`,{method:"POST",headers:headers(session.accessToken,{"Content-Type":selected.type,"x-upsert":"false"}),body:selected});
     if(!response.ok)throw new Error();
     setReactInputValue(input,`${STORAGE_PREFIX}${path}`);
     text.textContent="Image selected";
    }catch{text.textContent="Upload failed — try again";}finally{file.disabled=false;window.setTimeout(()=>{if(text.textContent==="Image selected")text.textContent=old||"Choose image from device";},1800);}
   });
  }

  function scan(root:ParentNode=document){
   root.querySelectorAll?.("input").forEach(node=>{if(node instanceof HTMLInputElement)enhanceInput(node);});
   root.querySelectorAll?.("img").forEach(node=>{if(node instanceof HTMLImageElement)void resolveStoredImage(node);});
  }

  void applyTheme();scan();
  const observer=new MutationObserver(records=>{for(const record of records){if(record.type==="attributes"&&record.target instanceof HTMLImageElement){void resolveStoredImage(record.target);continue;}for(const node of record.addedNodes){if(node instanceof HTMLInputElement)enhanceInput(node);else if(node instanceof HTMLImageElement)void resolveStoredImage(node);else if(node instanceof HTMLElement)scan(node);}}});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});
  const refresh=()=>{void applyTheme();window.setTimeout(()=>scan(),0);};
  window.addEventListener("hanami-portal-theme-changed",refresh);
  window.addEventListener("hanami-character-identity-changed",refresh);
  window.addEventListener("storage",refresh);
  return()=>{dead=true;observer.disconnect();window.removeEventListener("hanami-portal-theme-changed",refresh);window.removeEventListener("hanami-character-identity-changed",refresh);window.removeEventListener("storage",refresh);for(const url of blobUrls)URL.revokeObjectURL(url);};
 },[]);
 return null;
}
