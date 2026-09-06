"use client";

import styles from "./AdminSectionOverview.module.css";

type Props={canEditContent:boolean};
type Card={tool:"publishing"|"roadmap"|"lore";title:string;description:string;allowed:boolean;label:string};

export default function AdminWebsiteOverview({canEditContent}:Props){
 const cards:Card[]=[
  {tool:"publishing",title:"School Publishing",description:"Open the unified publishing hub for announcements, Chronicle, Yearbook, clubs, events, and opportunities.",allowed:canEditContent,label:"Open publishing hub"},
  {tool:"roadmap",title:"Website Roadmap",description:"Manage planned website work and keep implementation priorities separate from day-to-day content publishing.",allowed:canEditContent,label:"Open website roadmap"},
  {tool:"lore",title:"Lore & Canon",description:"Edit school-owned lore and canon material that powers public and roleplay-facing website content.",allowed:canEditContent,label:"Open lore & canon"}
 ];
 const visible=cards.filter(card=>card.allowed);
 function open(tool:Card["tool"]){window.dispatchEvent(new CustomEvent("hanami-admin-command",{detail:{view:"website",tool}}));}
 return <section className={styles.panel} aria-labelledby="admin-website-title">
  <header><div><p>ADMINISTRATION · WEBSITE</p><h2 id="admin-website-title">Website operations</h2><span>School-owned publishing, roadmap work, and canon editing stay grouped here without duplicating the editors that already own those systems.</span></div><b>{visible.length} AVAILABLE</b></header>
  <div className={styles.grid}>{visible.map(card=><article key={card.tool}><small>WEBSITE DESK</small><h3>{card.title}</h3><p>{card.description}</p><button type="button" onClick={()=>open(card.tool)}>{card.label}</button></article>)}</div>
  {!visible.length&&<p className={styles.empty}>No website tools are available for this administration role.</p>}
 </section>;
}
