"use client";

import Link from "next/link";
import {useEffect,useState,type ReactNode} from "react";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
type Session={accessToken?:string;expiresAt?:number};
type AdminAccess={site_admin:boolean;content_editor:boolean;moderator:boolean};
function headers(token:string){return {apikey:K,Authorization:`Bearer ${token}`,"Content-Type":"application/json"};}

export default function AdminOwnerOnly({children,label="This network tool"}:{children:ReactNode;label?:string}){
 const [state,setState]=useState<"checking"|"allowed"|"denied">("checking");
 useEffect(()=>{let dead=false;void(async()=>{try{const raw=localStorage.getItem(SESSION_KEY);if(!raw){if(!dead)setState("denied");return;}const session=JSON.parse(raw) as Session;if(!session.accessToken||!session.expiresAt||session.expiresAt<=Date.now()){if(!dead)setState("denied");return;}const [adminR,ownerR]=await Promise.all([fetch(`${U}/rest/v1/rpc/current_account_admin_access`,{method:"POST",headers:headers(session.accessToken),body:"{}"}),fetch(`${U}/rest/v1/rpc/current_owner_status`,{method:"POST",headers:headers(session.accessToken),body:"{}"})]);let allowed=false;if(adminR.ok){const rows=await adminR.json() as AdminAccess[];const a=rows[0];allowed=Boolean(a?.site_admin);}if(ownerR.ok)allowed=allowed||Boolean(await ownerR.json());if(!dead)setState(allowed?"allowed":"denied");}catch{if(!dead)setState("denied");}})();return()=>{dead=true};},[]);
 if(state==="checking")return <section style={{padding:16,border:"1px solid #9ba891",background:"#fffdf8",color:"#17283c"}}>Checking administration access…</section>;
 if(state==="denied")return <section style={{padding:16,border:"1px solid #c58e93",background:"#fffdf8",color:"#17283c"}}><h2 style={{marginTop:0}}>Administration-only network tool</h2><p>{label} is available only to Hanami Administration and Owner accounts.</p><Link href="/portal/">Return to Portal Login</Link></section>;
 return <>{children}</>;
}
