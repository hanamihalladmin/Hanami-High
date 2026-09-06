"use client";

import styles from "./AdminSectionOverview.module.css";

type Props={siteAdmin:boolean;canEditContent:boolean;canModerate:boolean};
type Card={tool:"governance"|"economy"|"roleplay";title:string;description:string;allowed:boolean;label:string};

export default function AdminSettingsOverview({siteAdmin,canEditContent,canModerate}:Props){
 const cards:Card[]=[
  {tool:"governance",title:"Governance",description:"Manage administrative governance controls and high-trust school configuration reserved for site administrators.",allowed:siteAdmin,label:"Open governance"},
  {tool:"economy",title:"Economy & Exchange",description:"Manage Exchange catalog operations and school economy controls already established in the rewards system.",allowed:canEditContent,label:"Open economy settings"},
  {tool:"roleplay",title:"Roleplay Systems",description:"Configure school roleplay systems available to site administration and moderation roles without mixing them into daily moderation queues.",allowed:siteAdmin||canModerate,label:"Open roleplay systems"}
 ];
 const visible=cards.filter(card=>card.allowed);
 function open(tool:Card["tool"]){window.dispatchEvent(new CustomEvent("hanami-admin-command",{detail:{view:"settings",tool}}));}
 return <section className={styles.panel} aria-labelledby="admin-settings-title">
  <header><div><p>ADMINISTRATION · SETTINGS</p><h2 id="admin-settings-title">Administration settings</h2><span>Configuration and governance live here; operational queues stay in their owning People, Communications, Campus, Events, or Moderation sections.</span></div><b>{visible.length} AVAILABLE</b></header>
  <div className={styles.grid}>{visible.map(card=><article key={card.tool}><small>SETTINGS DESK</small><h3>{card.title}</h3><p>{card.description}</p><button type="button" onClick={()=>open(card.tool)}>{card.label}</button></article>)}</div>
  {!visible.length&&<p className={styles.empty}>No settings tools are available for this administration role.</p>}
 </section>;
}
