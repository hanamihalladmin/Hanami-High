"use client";

import {useEffect,useState} from "react";
import styles from "./AdminPublishingHub.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Capabilities={chronicle_publish:boolean;yearbook_manage:boolean;announcement_publish:boolean;event_publish:boolean;club_manage:boolean;opportunity_publish:boolean};
type Route={view:string;tool:string};
type Card={key:keyof Capabilities;title:string;description:string;route?:Route;href?:string;action:string};

const cards:Card[]=[
 {key:"announcement_publish",title:"Announcements",description:"Publish schoolwide notices, urgent updates, and featured announcements through the existing communications manager.",route:{view:"home",tool:"announcements"},action:"Manage announcements"},
 {key:"event_publish",title:"Events",description:"Create and publish school calendar events while keeping the existing event workflow and school schedule data intact.",route:{view:"content",tool:"events"},action:"Manage events"},
 {key:"chronicle_publish",title:"Hanami Chronicle",description:"Write, review, publish, and archive Chronicle stories. Public readers only see published articles.",href:"../../newspaper",action:"Open Chronicle desk"},
 {key:"yearbook_manage",title:"Yearbook",description:"Review student-created yearbook pages, control approval, and lock completed pages into the school archive.",href:"../../yearbook",action:"Open Yearbook desk"},
 {key:"club_manage",title:"Clubs",description:"Publish club recruitment windows without granting festival, sports, volunteer, or other Campus Operations authority.",route:{view:"content",tool:"clubs"},action:"Manage club publishing"},
 {key:"opportunity_publish",title:"Opportunities",description:"Create, edit, publish, and retire school jobs, internships, and participation opportunities from the live campus feed.",route:{view:"content",tool:"opportunities"},action:"Manage opportunities"}
];

function routeTo(route:Route){window.dispatchEvent(new CustomEvent("hanami-admin-command",{detail:route}));}

export default function AdminPublishingHub({accessToken}:{accessToken:string}){
 const [capabilities,setCapabilities]=useState<Capabilities|null>(null);
 const [status,setStatus]=useState("Checking publishing capabilities…");
 useEffect(()=>{let cancelled=false;void(async()=>{try{const r=await fetch(`${U}/rest/v1/rpc/current_publishing_capabilities`,{method:"POST",headers:{apikey:K,Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:"{}",cache:"no-store"});if(!r.ok)throw new Error("Publishing capabilities could not be loaded.");const data=await r.json() as Capabilities[];if(cancelled)return;setCapabilities(data[0]??null);setStatus(data[0]?"Publishing authority is synced with Hanami capabilities.":"No publishing capability record was returned.");}catch(e){if(!cancelled)setStatus(e instanceof Error?e.message:"Publishing capabilities could not be loaded.")}})();return()=>{cancelled=true}},[accessToken]);
 return <section className={styles.hub} aria-label="School Publishing Hub">
  <div className={styles.intro}><small>SCHOOL-OWNED CONTENT · PHASE 8</small><h2>School Publishing</h2><p>Announcements, events, Chronicle, Yearbook, clubs, and opportunities now share one capability model. Each editor keeps its existing workflow; this hub shows exactly which publishing desks the signed-in account can use.</p></div>
  <div className={styles.grid}>{cards.map(card=>{const allowed=Boolean(capabilities?.[card.key]);return <article className={styles.card} key={card.key}><div className={styles.cardHead}><h3>{card.title}</h3><span className={`${styles.badge} ${allowed?"":styles.badgeOff}`}>{allowed?"AUTHORIZED":"NO ACCESS"}</span></div><p>{card.description}</p><div className={styles.actions}>{card.href?allowed?<a href={card.href}>{card.action}</a>:<button type="button" disabled>{card.action}</button>:<button type="button" disabled={!allowed} onClick={()=>card.route&&routeTo(card.route)}>{card.action}</button>}</div></article>})}</div>
  <div className={styles.footnote}>{status} Draft scheduling remains in the existing Draft Workspace; Chronicle and Yearbook publication state remains server-owned.</div>
 </section>;
}
