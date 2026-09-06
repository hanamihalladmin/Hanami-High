"use client";

import styles from "./AdminReportsOverview.module.css";

type Props={siteAdmin:boolean;canEditContent:boolean};
type ReportCard={tool:"analytics"|"continuity"|"roadmapOps";title:string;description:string;permission:boolean;label:string};

export default function AdminReportsOverview({siteAdmin,canEditContent}:Props){
 const cards:ReportCard[]=[
  {tool:"analytics",title:"Staff Analytics",description:"Review staff-facing operational analytics and school-management signals without mixing them into the dashboard.",permission:siteAdmin,label:"Open staff analytics"},
  {tool:"continuity",title:"Continuity Archive",description:"Inspect continuity records and archived school-state information used to keep long-running roleplay systems consistent.",permission:siteAdmin,label:"Open continuity archive"},
  {tool:"roadmapOps",title:"Roadmap Operations",description:"Review roadmap execution, moderation-aware operational status, and implementation progress for managed school systems.",permission:canEditContent,label:"Open roadmap operations"}
 ];
 function open(tool:ReportCard["tool"]){window.dispatchEvent(new CustomEvent("hanami-admin-command",{detail:{view:"reports",tool}}));}
 const visible=cards.filter(card=>card.permission);
 return <section className={styles.panel} aria-labelledby="admin-reports-title">
  <header><div><p>ADMINISTRATION · REPORTS</p><h2 id="admin-reports-title">Reports & operational review</h2><span>Reporting is separated from daily action queues so review tools do not compete with People, Academics, Campus, or Moderation work.</span></div><b>{visible.length} AVAILABLE</b></header>
  <div className={styles.grid}>{visible.map(card=><article key={card.tool}><small>REPORT DESK</small><h3>{card.title}</h3><p>{card.description}</p><button type="button" onClick={()=>open(card.tool)}>{card.label}</button></article>)}</div>
  {!visible.length&&<p className={styles.empty}>No reporting tools are available for this administration role.</p>}
 </section>;
}
