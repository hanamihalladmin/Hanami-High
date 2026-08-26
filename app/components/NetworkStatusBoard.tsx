"use client";

import {useEffect,useState} from "react";
import styles from "../network-pages.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type State="checking"|"ok"|"warn";
export default function NetworkStatusBoard(){
 const [network,setNetwork]=useState<State>("checking"),[api,setApi]=useState<State>("checking");
 useEffect(()=>{
  const checkNetwork=()=>setNetwork(navigator.onLine?"ok":"warn");
  checkNetwork();window.addEventListener("online",checkNetwork);window.addEventListener("offline",checkNetwork);
  void fetch(`${SUPABASE_URL}/rest/v1/`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}}).then(r=>setApi(r.ok||r.status===404?"ok":"warn")).catch(()=>setApi("warn"));
  return()=>{window.removeEventListener("online",checkNetwork);window.removeEventListener("offline",checkNetwork)};
 },[]);
 const badge=(state:State)=><span className={state==="ok"?styles.okBadge:state==="warn"?styles.warnBadge:styles.badge}>{state==="ok"?"OPERATIONAL":state==="warn"?"CHECK SERVICE":"CHECKING"}</span>;
 const overall=network==="ok"&&api==="ok";
 return <div className={styles.page}>
  <section className={styles.hero}><div className={styles.heroHeader}>HANAMI SCHOOL NETWORK STATUS</div><div className={styles.heroBody}><h2>{overall?"All systems operational":"Network status check"}</h2><p>Live browser and school-network checks are shown below. Service labels that are part of the Hanami platform but do not expose a public health endpoint are marked as enabled rather than pretending to provide a live probe.</p></div></section>
  <section className={styles.panel}><div className={styles.panelHeader}>CURRENT SERVICES · JST</div><div className={styles.panelBody}>
   <div className={styles.statusLine}><span><b>Public website</b><br/><span className={styles.small}>Browser connection to Hanami High</span></span>{badge(network)}</div>
   <div className={styles.statusLine}><span><b>Supabase school data</b><br/><span className={styles.small}>Portal and public data service</span></span>{badge(api)}</div>
   <div className={styles.statusLine}><span><b>School clock sync</b><br/><span className={styles.small}>Roleplay date/time runtime · JST / 2006 school calendar</span></span><span className={styles.okBadge}>SYNCED</span></div>
   <div className={styles.statusLine}><span><b>Discord synchronization</b><br/><span className={styles.small}>Role and school-access integration</span></span><span className={styles.badge}>ENABLED</span></div>
   <div className={styles.statusLine}><span><b>Website messages</b><br/><span className={styles.small}>Internal Hanami messaging system</span></span><span className={styles.okBadge}>ENABLED</span></div>
   <div className={styles.statusLine}><span><b>Profile media</b><br/><span className={styles.small}>Character images, wallpapers, and portal customization</span></span><span className={styles.okBadge}>ENABLED</span></div>
  </div></section>
 </div>
}
