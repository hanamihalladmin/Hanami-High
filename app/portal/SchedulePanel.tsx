"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./SchedulePanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

const DAYS=["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] as const;

type Meeting={id:string;weekday:number;starts_at:string;ends_at:string;label:string|null};
type Course={code:string;title:string;department:string;credits:number;is_test_data:boolean};
type Section={id:string;section_code:string;term:string;room:string|null;is_test_data:boolean;academic_courses:Course|null;section_meetings:Meeting[]};
type Membership={relationship:"student"|"instructor";class_sections:Section|null};
type Props={accessToken:string;characterId:string;role:"student"|"faculty"};

function authHeaders(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}
function timeLabel(value:string){const [hourRaw,minute]=value.split(":");const hour=Number(hourRaw);const suffix=hour>=12?"PM":"AM";const display=hour%12||12;return `${display}:${minute} ${suffix}`;}

export default function SchedulePanel({accessToken,characterId,role}:Props){
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [state,setState]=useState<"loading"|"ready"|"error">("loading");
  const [message,setMessage]=useState("Loading your Hanami schedule…");

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      setState("loading");
      setMessage("Loading your Hanami schedule…");
      const select="relationship,class_sections(id,section_code,term,room,is_test_data,academic_courses(code,title,department,credits,is_test_data),section_meetings(id,weekday,starts_at,ends_at,label))";
      const url=`${SUPABASE_URL}/rest/v1/section_memberships?select=${encodeURIComponent(select)}&character_id=eq.${encodeURIComponent(characterId)}`;
      try{
        const response=await fetch(url,{headers:authHeaders(accessToken)});
        if(!response.ok)throw new Error("Your class schedule could not be loaded.");
        const rows=await response.json() as Membership[];
        if(cancelled)return;
        setMemberships(rows);
        setState("ready");
        setMessage(rows.length?`${rows.length} class ${rows.length===1?"membership":"memberships"} loaded.`:"No classes have been assigned to this character yet.");
      }catch(error){
        if(cancelled)return;
        setMemberships([]);
        setState("error");
        setMessage(error instanceof Error?error.message:"Your class schedule could not be loaded.");
      }
    }
    load();
    return()=>{cancelled=true;};
  },[accessToken,characterId]);

  const meetings=useMemo(()=>memberships.flatMap(membership=>{
    const section=membership.class_sections;
    if(!section)return [];
    return section.section_meetings.map(meeting=>({membership,section,meeting}));
  }).sort((a,b)=>a.meeting.weekday-b.meeting.weekday||a.meeting.starts_at.localeCompare(b.meeting.starts_at)),[memberships]);

  const expectedRelationship=role==="student"?"student":"instructor";
  const roleMemberships=memberships.filter(item=>item.relationship===expectedRelationship);
  const hasTestData=roleMemberships.some(item=>Boolean(item.class_sections?.is_test_data||item.class_sections?.academic_courses?.is_test_data));

  return <section className={styles.panel} aria-labelledby="schedule-title">
    <div className={styles.heading}><div><p className="eyebrow">{role==="student"?"MY CLASSES":"TEACHING SCHEDULE"}</p><h4 id="schedule-title">{role==="student"?"Class schedule":"Assigned sections"}</h4></div><span>{roleMemberships.length} {role==="student"?"ENROLLED":"ASSIGNED"}</span></div>
    <div className={`${styles.status} ${state==="error"?styles.error:""}`} aria-live="polite">{message}</div>
    {hasTestData&&<div className={styles.testNotice}><strong>TEST DATA</strong><span>One or more listed sections are explicitly marked as test data.</span></div>}
    {state==="ready"&&roleMemberships.length===0?<div className={styles.empty}><strong>No {role==="student"?"classes":"teaching sections"} yet</strong><p>When administration assigns this character to a class section, it will appear here automatically.</p></div>:null}
    {roleMemberships.length>0&&<div className={styles.sections}>{roleMemberships.map((membership,index)=>{
      const section=membership.class_sections;
      if(!section)return null;
      const course=section.academic_courses;
      const content=<><div className={styles.courseTop}><span>{course?.code??"COURSE"} • SECTION {section.section_code}</span>{section.is_test_data||course?.is_test_data?<b>TEST</b>:null}</div><h5>{course?.title??"Untitled course"}</h5><p>{course?.department??"Department pending"} • {section.term}{section.room?` • Room ${section.room}`:" • Room TBA"}</p><div className={styles.meetingList}>{section.section_meetings.length?section.section_meetings.sort((a,b)=>a.weekday-b.weekday||a.starts_at.localeCompare(b.starts_at)).map(meeting=><div key={meeting.id}><strong>{DAYS[meeting.weekday]??"Day"}</strong><span>{timeLabel(meeting.starts_at)}–{timeLabel(meeting.ends_at)}{meeting.label?` • ${meeting.label}`:""}</span></div>):<div><strong>Meeting time</strong><span>Not scheduled yet</span></div>}</div><small>{role==="student"?"Enrollment":"Instructor assignment"} #{index+1}</small>{role==="student"&&<span className={styles.openHint}>Open class →</span>}</>;
      return <article key={section.id}>{role==="student"?<a className={styles.classLink} href={`./class/?section=${encodeURIComponent(section.id)}`} aria-label={`Open ${course?.title??"class"}`}>{content}</a>:content}</article>;
    })}</div>}
    {meetings.length>0&&<div className={styles.weekStrip}><strong>WEEK AT A GLANCE</strong><span>{meetings.length} scheduled meeting{meetings.length===1?"":"s"}</span></div>}
  </section>;
}
