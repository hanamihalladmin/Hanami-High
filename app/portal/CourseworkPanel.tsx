"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./CourseworkPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Course={code:string;title:string;is_test_data:boolean};
type Section={id:string;section_code:string;academic_courses:Course|null};
type Assignment={id:string;section_id:string;title:string;description:string;due_at:string|null;points:number;status:"published"|"closed"|"draft";is_test_data:boolean;class_sections:Section|null};
type Submission={assignment_id:string;status:"draft"|"submitted"|"returned";submitted_at:string|null;grade:number|null;feedback:string};
type Props={accessToken:string;characterId:string};

function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}
function dueLabel(value:string|null){if(!value)return "No due date";return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo",timeZoneName:"short"}).format(new Date(value));}

export default function CourseworkPanel({accessToken,characterId}:Props){
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [state,setState]=useState<"loading"|"ready"|"error">("loading");
  const [message,setMessage]=useState("Loading coursework…");

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      setState("loading");setMessage("Loading coursework…");
      try{
        const membershipResponse=await fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=section_id&character_id=eq.${encodeURIComponent(characterId)}&relationship=eq.student`,{headers:headers(accessToken)});
        if(!membershipResponse.ok)throw new Error("Your class enrollments could not be checked.");
        const memberships=await membershipResponse.json() as {section_id:string}[];
        const sectionIds=memberships.map(item=>item.section_id);
        if(sectionIds.length===0){if(!cancelled){setAssignments([]);setSubmissions([]);setState("ready");setMessage("No coursework yet because this character is not enrolled in a class.");}return;}
        const inFilter=`(${sectionIds.join(",")})`;
        const select="id,section_id,title,description,due_at,points,status,is_test_data,class_sections(id,section_code,academic_courses(code,title,is_test_data))";
        const [assignmentResponse,submissionResponse]=await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/course_assignments?select=${encodeURIComponent(select)}&section_id=in.${encodeURIComponent(inFilter)}&status=in.(published,closed)&order=due_at.asc.nullslast`,{headers:headers(accessToken)}),
          fetch(`${SUPABASE_URL}/rest/v1/assignment_submissions?select=assignment_id,status,submitted_at,grade,feedback&student_character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)}),
        ]);
        if(!assignmentResponse.ok||!submissionResponse.ok)throw new Error("Your coursework could not be loaded.");
        const assignmentRows=await assignmentResponse.json() as Assignment[];
        const submissionRows=await submissionResponse.json() as Submission[];
        if(cancelled)return;
        setAssignments(assignmentRows);setSubmissions(submissionRows);setState("ready");
        setMessage(assignmentRows.length?`${assignmentRows.length} assignment${assignmentRows.length===1?"":"s"} available.`:"No published assignments are available yet.");
      }catch(error){if(!cancelled){setAssignments([]);setSubmissions([]);setState("error");setMessage(error instanceof Error?error.message:"Your coursework could not be loaded.");}}
    }
    load();
    return()=>{cancelled=true;};
  },[accessToken,characterId]);

  const submissionMap=useMemo(()=>new Map(submissions.map(item=>[item.assignment_id,item])),[submissions]);
  const openCount=assignments.filter(item=>item.status==="published"&&submissionMap.get(item.id)?.status!=="submitted"&&submissionMap.get(item.id)?.status!=="returned").length;

  return <section className={styles.panel} aria-labelledby="coursework-title">
    <div className={styles.heading}><div><p className="eyebrow">COURSEWORK</p><h4 id="coursework-title">Assignments</h4></div><span>{openCount} OPEN</span></div>
    <div className={`${styles.status} ${state==="error"?styles.error:""}`} aria-live="polite">{message}</div>
    {state==="ready"&&assignments.length===0?<div className={styles.empty}><strong>No assignments to show</strong><p>Published classwork will appear here automatically when faculty add it to one of this character&apos;s enrolled sections.</p></div>:null}
    {assignments.length>0&&<div className={styles.list}>{assignments.map(assignment=>{
      const submission=submissionMap.get(assignment.id);
      const testData=assignment.is_test_data||Boolean(assignment.class_sections?.academic_courses?.is_test_data);
      return <article key={assignment.id}>
        <div className={styles.meta}><span>{assignment.class_sections?.academic_courses?.code??"COURSE"} • SEC {assignment.class_sections?.section_code??"—"}</span>{testData&&<b>TEST</b>}</div>
        <h5>{assignment.title}</h5>
        <p>{assignment.description||"No assignment description has been posted."}</p>
        <dl><div><dt>Due</dt><dd>{dueLabel(assignment.due_at)}</dd></div><div><dt>Points</dt><dd>{assignment.points}</dd></div><div><dt>Status</dt><dd>{assignment.status}</dd></div><div><dt>My work</dt><dd>{submission?.status??"not started"}</dd></div></dl>
        {submission?.status==="returned"&&<div className={styles.returned}><strong>Returned</strong><span>{submission.grade==null?"Grade pending":`${submission.grade} points`}{submission.feedback?` • ${submission.feedback}`:""}</span></div>}
        <button type="button" disabled>Submission editor coming next</button>
      </article>;
    })}</div>}
  </section>;
}
