"use client";

import Link from "next/link";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import styles from "./MaintenanceGate.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
type Session={accessToken?:string;expiresAt?:number};
function headers(token:string){return {apikey:K,Authorization:`Bearer ${token}`,"Content-Type":"application/json"};}
function normalizedPath(){const raw=window.location.pathname.replace(/\/+$/,"/");return raw.replace(/^\/Hanami-High(?=\/|$)/,"")||"/";}
function isOwnerAccessPath(path:string){return path==="/portal/"||path.startsWith("/portal/owner/");}

export default function MaintenanceGate({children}:{children:ReactNode}){
 const [state,setState]=useState<"checking"|"allowed"|"maintenance">("checking");
 const [path,setPath]=useState("/");
 useEffect(()=>{let dead=false;void(async()=>{const current=normalizedPath();if(!dead)setPath(current);if(isOwnerAccessPath(current)){if(!dead)setState("allowed");return;}try{const raw=localStorage.getItem(SESSION_KEY);if(!raw){if(!dead)setState("maintenance");return;}const session=JSON.parse(raw) as Session;if(!session.accessToken||!session.expiresAt||session.expiresAt<=Date.now()){if(!dead)setState("maintenance");return;}const [ownerR,privilegedR]=await Promise.all([
   fetch(`${U}/rest/v1/rpc/current_owner_status`,{method:"POST",headers:headers(session.accessToken),body:"{}",cache:"no-store"}),
   fetch(`${U}/rest/v1/rpc/has_privileged_portal_session`,{method:"POST",headers:headers(session.accessToken),body:JSON.stringify({requested_portal:"owner"}),cache:"no-store"})
  ]);
  const allowed=ownerR.ok&&privilegedR.ok&&Boolean(await ownerR.json())&&Boolean(await privilegedR.json());
  if(!dead)setState(allowed?"allowed":"maintenance");
 }catch{if(!dead)setState("maintenance");}})();return()=>{dead=true};},[]);
 const isGateway=useMemo(()=>path==="/portal/",[path]);
 if(state==="allowed")return <>{children}</>;
 if(state==="checking")return <main className={styles.screen}><section className={styles.window}><div className={styles.titleBar}><strong>HANAMI HIGH SCHOOL NETWORK</strong><span>MAINTENANCE</span></div><div className={styles.body}><p className={styles.eyebrow}>SYSTEM NOTICE</p><h1>Checking website access…</h1><p>Please wait while Hanami verifies the current session.</p></div></section></main>;
 return <main className={styles.screen}><section className={styles.window} aria-labelledby="maintenance-title"><div className={styles.titleBar}><strong>HANAMI HIGH SCHOOL NETWORK</strong><span>EST. 2006</span></div><div className={styles.banner}>WEBSITE TEMPORARILY DOWN FOR MAINTENANCE</div><div className={styles.body}><p className={styles.eyebrow}>HANAMI WEBMASTER NOTICE</p><h1 id="maintenance-title">Hanami High is currently under maintenance.</h1><p>The school network is being updated and is temporarily unavailable to students, faculty, and visitors. Please check back after maintenance is complete.</p><div className={styles.statusBox}><strong>NETWORK STATUS</strong><span>Public access: OFFLINE</span><span>Student & Faculty access: OFFLINE</span><span>Owner maintenance access: AVAILABLE</span></div><div className={styles.actions}>{isGateway?<Link href="/portal/owner/">Continue to Owner access</Link>:<><Link href="/portal/owner/">Owner access</Link><Link href="/portal/">Portal sign-in</Link></>}</div><small>Only the configured Hanami Owner account with an active privileged Owner session can open the website during maintenance.</small></div><footer>HANAMI HIGH SCHOOL · PRIVATE MAINTENANCE WINDOW</footer></section></main>;
}
