"use client";

import {useEffect,useState} from "react";
import styles from "./StudentAcceptanceExperience.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Props={accessToken:string;characterId:string;displayName:string};
type LetterRow={character_id:string;accepted_at:string;viewed_at:string|null};
type AcceptanceLetterProps={displayName:string;dateText:string;archived:boolean;storedNotice:boolean;onStore:()=>void;onEnter:()=>void;onClose:()=>void};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

function AcceptanceLetter({displayName,dateText,archived,storedNotice,onStore,onEnter,onClose}:AcceptanceLetterProps){return <div className={styles.letterWrap}><article className={styles.letter}>
 <img className={styles.crest} src="/Hanami-High/hanami-high-portal-icon.png?v=20260825c" alt="Hanami High crest"/>
 <p className={styles.schoolName}>Hanami High School</p>
 <p className={styles.office}>OFFICE OF ADMISSIONS · HANAMI CITY · JAPAN</p>
 <h2>Notice of Acceptance</h2>
 <p>Dear <strong>{displayName}</strong>,</p>
 <p>On behalf of the faculty and administration of <strong>Hanami High School</strong>, we are pleased to formally confirm your enrollment for the 2006 academic year. Your student record has been activated and your place within the Hanami High community has been reserved.</p>
 <p>This letter serves as your official notice of admission. Your school desk is now your central access point for classes, schedules, announcements, messages, activities, academic records, school services, and the everyday life of Hanami High.</p>
 <div className={styles.detailGrid}>
  <div className={styles.detail}><b>STUDENT</b><span>{displayName}</span></div>
  <div className={styles.detail}><b>STATUS</b><span>Accepted · Active</span></div>
  <div className={styles.detail}><b>TERM</b><span>Academic Year 2006</span></div>
  <div className={styles.detail}><b>ISSUED</b><span>{dateText}</span></div>
  <div className={styles.detail}><b>OFFICE</b><span>Admissions</span></div>
  <div className={styles.detail}><b>RECORD</b><span>Student Portal Active</span></div>
 </div>
 <h3 className={styles.sectionTitle}>Your first school day</h3>
 <p>Please review your assigned homeroom and weekly timetable before classes begin. Your official homeroom, course sections, classroom locations, and future schedule changes are maintained in your student portal and remain tied to Hanami&apos;s enrollment records.</p>
 <p>When you arrive, report to your assigned homeroom first. From there, follow your published daily schedule, check school notices for any temporary changes, and use the portal inbox for school-based communication.</p>
 <h3 className={styles.sectionTitle}>Before entering campus</h3>
 <ul className={styles.checklist}>
  <li>Review your homeroom and class schedule.</li>
  <li>Confirm your student profile and privacy settings.</li>
  <li>Read current school notices, rules, and calendar updates.</li>
  <li>Check your inbox for any faculty or administration messages.</li>
  <li>Keep this acceptance letter available in your student documents.</li>
 </ul>
 <p>Hanami High is built from the ordinary moments students create together: lessons, clubs, friendships, school events, responsibilities, mistakes, and the memories that follow. We hope you will take part fully in the life of the school and make your time here distinctly your own.</p>
 <p>We look forward to welcoming you through the school gates. <strong>Welcome to Hanami High.</strong></p>
 <p><em>Delivery note: no owls were inconvenienced in the arrival of this letter.</em></p>
 <div className={styles.signature}><div className={styles.signatureText}><strong>Office of Admissions</strong><span>HANAMI HIGH SCHOOL · {dateText.toUpperCase()}</span></div><div className={styles.wax}>HH</div></div>
 {storedNotice&&<p className={styles.office} role="status">STORED IN STUDENT DOCUMENTS · YOU CAN REOPEN THIS LETTER FROM YOUR PORTAL AT ANY TIME</p>}
 <div className={styles.actions}>
  {!archived&&<button className={styles.secondary} type="button" onClick={onStore}>Store in Student Documents</button>}
  <button type="button" onClick={onEnter}>{archived?"Return to Hanami High →":"Enter Hanami High →"}</button>
  {archived&&<button className={styles.secondary} type="button" onClick={onClose}>Close letter</button>}
 </div>
</article></div>}

export default function StudentAcceptanceExperience({accessToken,characterId,displayName}:Props){
 const [state,setState]=useState<"loading"|"closed"|"envelope"|"letter">("loading");
 const [acceptedAt,setAcceptedAt]=useState<string|null>(null);
 const [archived,setArchived]=useState(false);
 const [storedNotice,setStoredNotice]=useState(false);
 useEffect(()=>{let cancelled=false;async function load(){
  try{
   const query=await fetch(`${SUPABASE_URL}/rest/v1/student_acceptance_letters?select=character_id,accepted_at,viewed_at&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)});
   if(!query.ok)throw new Error("lookup failed");
   let row=(await query.json() as LetterRow[])[0]??null;
   if(!row){
    const create=await fetch(`${SUPABASE_URL}/rest/v1/student_acceptance_letters`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json","Prefer":"return=representation"}),body:JSON.stringify({character_id:characterId})});
    if(!create.ok)throw new Error("create failed");
    row=(await create.json() as LetterRow[])[0]??null;
   }
   if(cancelled||!row)return;
   setAcceptedAt(row.accepted_at);
   setArchived(Boolean(row.viewed_at));
   setState(row.viewed_at?"closed":"envelope");
  }catch{
   if(!cancelled){
    const key=`hanami.acceptance-fallback.v1.${characterId}`;
    let seen=false;try{seen=localStorage.getItem(key)==="done"}catch{}
    setArchived(seen);
    setState(seen?"closed":"envelope");
   }
  }
 }
 void load();return()=>{cancelled=true};},[accessToken,characterId]);
 async function persistArchive(){
  if(!archived){
   try{
    await fetch(`${SUPABASE_URL}/rest/v1/student_acceptance_letters?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({viewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
   }catch{}
   try{localStorage.setItem(`hanami.acceptance-fallback.v1.${characterId}`,"done")}catch{}
   setArchived(true);
   window.dispatchEvent(new CustomEvent("hanami-acceptance-complete",{detail:{characterId}}));
  }
 }
 async function storeLetter(){await persistArchive();setStoredNotice(true);setState("letter");}
 async function enterSchool(){await persistArchive();setStoredNotice(false);setState("closed");}
 function dateLabel(){if(!acceptedAt)return "Academic Year 2006";const d=new Date(acceptedAt);return Number.isNaN(d.valueOf())?"Academic Year 2006":d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});}
 if(state==="loading")return <span className={styles.loading}>Preparing student documents…</span>;
 if(state==="closed")return <button className={styles.archiveButton} type="button" onClick={()=>{setStoredNotice(false);setState("letter")}}>Student Documents · Acceptance Letter</button>;
 return <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Hanami High acceptance letter">
  <section className={styles.stage}>
   {state==="envelope"?<div className={styles.envelope}><button className={styles.sealButton} type="button" onClick={()=>setState("letter")}><span className={styles.seal}>HH</span><strong>Hanami High School</strong><span>OPEN YOUR ACCEPTANCE LETTER</span></button></div>:<AcceptanceLetter displayName={displayName} dateText={dateLabel()} archived={archived} storedNotice={storedNotice} onStore={storeLetter} onEnter={enterSchool} onClose={()=>setState("closed")}/>} 
  </section>
 </div>;
}
