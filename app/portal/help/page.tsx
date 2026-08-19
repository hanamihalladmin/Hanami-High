"use client";

import {useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
const CHARACTER_SESSION_KEY="hanami.portal.character.v1";

type StoredSession={accessToken?:string};
type CharacterRow={id:string;role:"student"|"faculty";is_active:boolean};
function basePath(){return window.location.pathname.startsWith("/Hanami-High/")?"/Hanami-High":"";}

export default function PortalHelpPage(){
 const [message,setMessage]=useState("Opening Hanami Help…");
 useEffect(()=>{let cancelled=false;async function route(){try{const sessionRaw=localStorage.getItem(SESSION_KEY);const characterId=localStorage.getItem(CHARACTER_SESSION_KEY);if(!sessionRaw||!characterId){window.location.replace(`${basePath()}/portal/#portal-main`);return;}const session=JSON.parse(sessionRaw) as StoredSession;if(!session.accessToken){window.location.replace(`${basePath()}/portal/#portal-main`);return;}const response=await fetch(`${SUPABASE_URL}/rest/v1/characters?select=id,role,is_active&id=eq.${encodeURIComponent(characterId)}&limit=1`,{cache:"no-store",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.accessToken}`}});if(!response.ok)throw new Error();const row=(await response.json() as CharacterRow[])[0];if(!row?.is_active){window.location.replace(`${basePath()}/portal/#portal-main`);return;}if(cancelled)return;const destination=row.role==="faculty"?"/portal/faculty/#help":"/portal/student/#help";window.location.replace(`${basePath()}${destination}`);}catch{if(!cancelled){setMessage("Your session could not be restored automatically. Opening the Account Gateway…");window.location.replace(`${basePath()}/portal/#portal-main`);}}}void route();return()=>{cancelled=true;};},[]);
 return <main className="site-page"><section style={{maxWidth:720,margin:"64px auto",padding:24,border:"1px solid #b7c5d1",background:"#fff"}}><p className="eyebrow">HANAMI SUPPORT</p><h1 style={{font:"400 28px Georgia,serif",color:"#17375f"}}>Help Center</h1><p>{message}</p></section></main>;
}
