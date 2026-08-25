"use client";

import {useEffect,useState} from "react";
import styles from "./StudentAcceptanceExperience.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Props={accessToken:string;characterId:string;displayName:string};
type LetterRow={character_id:string;accepted_at:string;viewed_at:string|null};
type AcceptanceLetterProps={displayName:string;dateText:string;archived:boolean;onEnter:()=>void;onClose:()=>void};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

function AcceptanceLetter({displayName,dateText,archived,onEnter,onClose}:AcceptanceLetterProps){return <div className={styles.letterWrap}><article className={styles.letter}>
 <img className={styles.crest} src="../../hanami-high-portal-icon-black.svg?v=20260823a" alt="Hanami High crest"/>
 <p className={styles.schoolName}>Hanami High School</p>
 <p className={styles.office}>OFFICE OF ADMISSIONS · HANAMI CITY · JAPAN</p>
 <h2>Notice of Acceptance</h2>
 <p>Dear <strong>{displayName}</strong>,</p>
 <p>We are pleased to confirm that your enrollment with <strong>Hanami High School</strong> has been accepted. Your student record is now active, and your place within the Hanami school community has been formally reserved.</p>
 <p>From this point forward, your school desk will serve as your home for classes, schedules, announcements, messages, activities, records, and the many ordinary moments that make up a school year.</p>
 <div className={styles.detailGrid}>
  <div className={styles.detail}><b>STUDENT</b><span>{displayName}</span></div>
  <div className={styles.detail}><b>STATUS</b><span>Accepted · Active</span></div>
  <div className={styles.detail}><b>TERM</b><span>Academic Year 2006</span></div>
 </div>
 <p>Please report to your assigned homeroom, review your schedule, and familiarize yourself with the school network before classes begin. Your homeroom and course assignments will continue to follow Hanami&apos;s official enrollment records.</p>
 <p>We look forward to seeing what you add to the life of the school. Welcome to Hanami High.</p>
 <p><em>Delivery note: no owls were inconvenienced in the arrival of this letter.</em></p>
 <div className={styles.signature}><div className={styles.signatureText}><strong>Office of Admissions</strong><span>HANAMI HIGH SCHOOL · {dateText.toUpperCase()}</span></div><div className={styles.wax}>HH</div></div>
 <div className={styles.actions}><button type="button" onClick={onEnter}>Enter Hanami High →</button>{archived&&<button className={styles.secondary} type="button" onClick={onClose}>Close letter</button>}</div>
</article></div>}

export default function StudentAcceptanceExperience({accessToken,characterId,displayName}:Props){
 const [state,setState]=useState<"loading"|"closed"|"envelope"|"letter">("loading");
 const [acceptedAt,setAcceptedAt]=useState<string|null>(null);
 const [archived,setArchived]=useState(false);
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
    const seen=localStorage.getItem(key)==="done";
    setArchived(seen);
    setState(seen?"closed":"envelope");
   }
  }
 }
 void load();return()=>{cancelled=true};},[accessToken,characterId]);
 async function markViewed(){
  try{
   await fetch(`${SUPABASE_URL}/rest/v1/student_acceptance_letters?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({viewed_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
  }catch{}
  try{localStorage.setItem(`hanami.acceptance-fallback.v1.${characterId}`,"done")}catch{}
  setArchived(true);setState("closed");
  window.dispatchEvent(new CustomEvent("hanami-acceptance-complete",{detail:{characterId}}));
 }
 function dateLabel(){if(!acceptedAt)return "Academic Year 2006";const d=new Date(acceptedAt);return Number.isNaN(d.valueOf())?"Academic Year 2006":d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});}
 if(state==="loading")return <span className={styles.loading}>Preparing student documents…</span>;
 if(state==="closed")return <button className={styles.archiveButton} type="button" onClick={()=>setState("letter")}>Documents · Acceptance Letter</button>;
 return <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Hanami High acceptance letter">
  <section className={styles.stage}>
   {state==="envelope"?<div className={styles.envelope}><button className={styles.sealButton} type="button" onClick={()=>setState("letter")}><span className={styles.seal}>HH</span><strong>Hanami High School</strong><span>OPEN YOUR ACCEPTANCE LETTER</span></button></div>:<AcceptanceLetter displayName={displayName} dateText={dateLabel()} archived={archived} onEnter={markViewed} onClose={()=>setState("closed")}/>} 
  </section>
 </div>;
}
