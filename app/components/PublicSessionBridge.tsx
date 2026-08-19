"use client";

import {useEffect} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
const CHARACTER_SESSION_KEY="hanami.portal.character.v1";

type PortalSession={accessToken:string;refreshToken:string;expiresAt:number;tokenType?:string;providerToken?:string};
type CharacterRow={id:string;role:"student"|"faculty";display_name:string;is_active:boolean};

function readSession():PortalSession|null{
  try{
    const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;
    const value=JSON.parse(raw) as Partial<PortalSession>;
    if(typeof value.accessToken!=="string"||typeof value.refreshToken!=="string"||typeof value.expiresAt!=="number")return null;
    return {accessToken:value.accessToken,refreshToken:value.refreshToken,expiresAt:value.expiresAt,tokenType:value.tokenType,providerToken:value.providerToken};
  }catch{return null;}
}

async function refreshSession(session:PortalSession):Promise<PortalSession|null>{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refreshToken})});
  if(!response.ok)return null;
  const data=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;token_type?:string};
  if(!data.access_token||!data.refresh_token)return null;
  const next={accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+(data.expires_in??3600)*1000,tokenType:data.token_type??"bearer",providerToken:session.providerToken};
  localStorage.setItem(SESSION_KEY,JSON.stringify(next));
  return next;
}

function basePath(){return window.location.pathname.startsWith("/Hanami-High/")?"/Hanami-High":"";}
function updateButtons(label:string,href:string,signedIn:boolean){
  document.querySelectorAll<HTMLAnchorElement>("a.portal-button").forEach(button=>{
    button.textContent=label;
    button.href=`${basePath()}${href}`;
    button.dataset.sessionActive=signedIn?"true":"false";
    button.setAttribute("aria-label",signedIn?"Return to your Hanami portal":"Login to Hanami portal");
  });
}

export default function PublicSessionBridge(){
  useEffect(()=>{let cancelled=false;
    async function sync(){
      let session=readSession();
      if(!session){updateButtons("↪ Login / Portal","/portal/",false);return;}
      if(session.expiresAt-Date.now()<5*60*1000){
        const refreshed=await refreshSession(session).catch(()=>null);
        if(refreshed)session=refreshed;
      }
      if(cancelled)return;
      const rememberedId=localStorage.getItem(CHARACTER_SESSION_KEY);
      if(!rememberedId){updateButtons("↪ My Hanami / Portal","/portal/",true);return;}
      try{
        const response=await fetch(`${SUPABASE_URL}/rest/v1/characters?select=id,role,display_name,is_active&id=eq.${encodeURIComponent(rememberedId)}&limit=1`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.accessToken}`}});
        if(!response.ok){updateButtons("↪ My Hanami / Portal","/portal/",true);return;}
        const row=(await response.json() as CharacterRow[])[0];
        if(!row?.is_active){updateButtons("↪ My Hanami / Portal","/portal/",true);return;}
        const destination=row.role==="faculty"?"/portal/faculty/":"/portal/student/";
        updateButtons(`↪ Return to ${row.role==="faculty"?"Faculty":"Student"} Portal`,destination,true);
      }catch{updateButtons("↪ My Hanami / Portal","/portal/",true);}
    }
    sync();
    const onStorage=(event:StorageEvent)=>{if(event.key===SESSION_KEY||event.key===CHARACTER_SESSION_KEY)sync();};
    window.addEventListener("storage",onStorage);
    return()=>{cancelled=true;window.removeEventListener("storage",onStorage);};
  },[]);
  return null;
}
