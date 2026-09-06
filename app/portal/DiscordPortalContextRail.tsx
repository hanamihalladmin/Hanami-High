"use client";

import styles from "./DiscordPortalContextRail.module.css";

type View="home"|"schedule"|"classes"|"calendar"|"messages"|"school"|"community"|"profile";
type Role="student"|"faculty";
type Props={
 role:Role;
 view:View;
 subView:string;
 displayName:string;
 handle:string;
 avatarUrl:string;
 pageTitle:string;
 sectionTitle:string;
 onNavigate:(view:View)=>void;
};

const viewCopy:Record<Exclude<View,"messages">,{label:string;detail:string}>={
 home:{label:"Portal home",detail:"Dashboard summaries, school notices, and your current Hanami school context."},
 schedule:{label:"Schedule context",detail:"The active character's weekly school or teaching schedule."},
 classes:{label:"Course context",detail:"Courses, classroom tools, assignments, grading, and academic workspaces for this character."},
 calendar:{label:"School calendar",detail:"Published Hanami school events and campus dates."},
 school:{label:"School life",detail:"Character-scoped school services, records, resources, support, and daily-life systems."},
 community:{label:"Community context",detail:"Hanami community spaces, activities, profiles, friends, and student-life participation."},
 profile:{label:"Character account",detail:"Identity, privacy, appearance, Profile Studio, preferences, and profile discovery."}
};

export default function DiscordPortalContextRail({role,view,subView,displayName,handle,avatarUrl,pageTitle,sectionTitle,onNavigate}:Props){
 if(view==="messages")return null;
 const context=viewCopy[view];
 const initial=displayName.trim().slice(0,1).toUpperCase()||"H";
 const quick:View[]=role==="student"?["classes","schedule","community","profile"]:["classes","schedule","school","profile"];
 return <aside className={styles.rail} aria-label={`${pageTitle} context`}>
  <section className={styles.identityCard}>
   <div className={styles.avatar}>{avatarUrl?<img src={avatarUrl} alt=""/>:<span>{initial}</span>}<i aria-hidden="true"/></div>
   <div><strong>{displayName}</strong><span>@{handle}</span><small>{role==="student"?"Student":"Faculty"} character</small></div>
  </section>
  <section className={styles.block}>
   <p className={styles.label}>CURRENT CONTEXT</p>
   <strong>{sectionTitle||context.label}</strong>
   <span>{context.detail}</span>
   <div className={styles.scope}><b>{pageTitle}</b><small>{subView.replaceAll("_"," ")}</small></div>
  </section>
  <section className={styles.block}>
   <p className={styles.label}>QUICK JUMP</p>
   <nav className={styles.quick} aria-label="Portal quick navigation">{quick.map(target=><button key={target} type="button" className={view===target?styles.active:""} onClick={()=>onNavigate(target)}><span>{target==="classes"?"#":target==="schedule"?"▦":target==="community"?"◎":target==="school"?"◆":"●"}</span>{target==="classes"?"Courses":target==="schedule"?"Schedule":target==="community"?"Community":target==="school"?"School":"Account"}</button>)}</nav>
  </section>
  <section className={styles.privateNote}><strong>HANAMI NETWORK</strong><span>This rail reflects the active portal character and current workspace. It does not expose private data from other users.</span></section>
 </aside>;
}
