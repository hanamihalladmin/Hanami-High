"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./FacultyAdvisingPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type RosterRow={student_character_id:string;display_name:string;handle:string;section_id:string;section_code:string;course_code:string;course_title:string};
type Props={accessToken:string;characterId:string};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function FacultyAdvisingPanel({accessToken,characterId}:Props){
  const [rows,setRows]=useState<RosterRow[]>([]);
  const [message,setMessage]=useState("Loading advising roster…");

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/faculty_student_roster`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({faculty_character_id:characterId})});
        if(!response.ok)throw new Error("Your advising roster could not be loaded.");
        const roster=await response.json() as RosterRow[];
        if(cancelled)return;
        setRows(roster);
        setMessage(roster.length?`${new Set(roster.map(item=>item.student_character_id)).size} student${new Set(roster.map(item=>item.student_character_id)).size===1?"":"s"} across ${new Set(roster.map(item=>item.section_id)).size} teaching section${new Set(roster.map(item=>item.section_id)).size===1?"":"s"}.`:"No students are assigned through this faculty character's teaching sections yet.");
      }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"The advising roster could not be loaded.");}
    }
    load();
    return()=>{cancelled=true;};
  },[accessToken,characterId]);

  const grouped=useMemo(()=>{
    const map=new Map<string,{label:string;students:RosterRow[]}>();
    for(const row of rows){
      const current=map.get(row.section_id)??{label:`${row.course_code} • ${row.course_title} • SEC ${row.section_code}`,students:[]};
      current.students.push(row);map.set(row.section_id,current);
    }
    return [...map.entries()];
  },[rows]);

  return <section className={styles.panel} aria-labelledby="advising-title">
    <div className={styles.heading}><div><p className="eyebrow">STUDENTS</p><h4 id="advising-title">Advising roster</h4></div><span>{new Set(rows.map(item=>item.student_character_id)).size} STUDENTS</span></div>
    <div className={styles.status} aria-live="polite">{message}</div>
    {grouped.length===0?<div className={styles.empty}><strong>No advising roster yet</strong><p>Students will appear here only when they are enrolled in a class section that this faculty character is assigned to teach.</p></div>:<div className={styles.sections}>{grouped.map(([sectionId,group])=><article key={sectionId}><div className={styles.sectionTitle}><strong>{group.label}</strong><span>{group.students.length} ENROLLED</span></div><div className={styles.students}>{group.students.map(student=><div key={`${sectionId}-${student.student_character_id}`}><div className={styles.avatar}>花</div><div><strong>{student.display_name}</strong><span>@{student.handle}</span></div><button type="button" disabled>Advising notes coming later</button></div>)}</div></article>)}</div>}
    <div className={styles.notice}><strong>PRIVACY RULE</strong><span>This roster is generated only from sections this faculty character instructs. It does not open private student profiles or expose unrelated characters.</span></div>
  </section>;
}
