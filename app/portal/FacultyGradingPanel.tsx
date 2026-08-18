"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./FacultyGradingPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Assignment={id:string;section_id:string;title:string;points:number;status:"draft"|"published"|"closed"};
type Student={id:string;display_name:string;handle:string};
type Submission={id:string;assignment_id:string;student_character_id:string;body:string;status:"draft"|"submitted"|"returned";submitted_at:string|null;grade:number|null;feedback:string;characters:Student|null};
type Props={accessToken:string;characterId:string};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function dateLabel(value:string|null){if(!value)return "Not submitted";return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo",timeZoneName:"short"}).format(new Date(value));}

export default function FacultyGradingPanel({accessToken,characterId}:Props){
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [grades,setGrades]=useState<Record<string,string>>({});
  const [feedback,setFeedback]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("Loading submitted work…");
  const [savingId,setSavingId]=useState<string|null>(null);

  const loadData=useCallback(async()=>{
    const membershipResponse=await fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=section_id&character_id=eq.${encodeURIComponent(characterId)}&relationship=eq.instructor`,{headers:headers(accessToken)});
    if(!membershipResponse.ok)throw new Error("Teaching sections could not be checked for grading.");
    const memberships=await membershipResponse.json() as {section_id:string}[];
    const sectionIds=memberships.map(item=>item.section_id);
    if(sectionIds.length===0){setAssignments([]);setSubmissions([]);setMessage("No teaching sections are assigned yet.");return;}
    const filter=`(${sectionIds.join(",")})`;
    const assignmentResponse=await fetch(`${SUPABASE_URL}/rest/v1/course_assignments?select=id,section_id,title,points,status&section_id=in.${encodeURIComponent(filter)}`,{headers:headers(accessToken)});
    if(!assignmentResponse.ok)throw new Error("Assignments could not be loaded for grading.");
    const assignmentRows=await assignmentResponse.json() as Assignment[];
    const assignmentIds=assignmentRows.map(item=>item.id);
    if(assignmentIds.length===0){setAssignments([]);setSubmissions([]);setMessage("No assignments have been created for these teaching sections yet.");return;}
    const assignmentFilter=`(${assignmentIds.join(",")})`;
    const select="id,assignment_id,student_character_id,body,status,submitted_at,grade,feedback,characters(id,display_name,handle)";
    const submissionResponse=await fetch(`${SUPABASE_URL}/rest/v1/assignment_submissions?select=${encodeURIComponent(select)}&assignment_id=in.${encodeURIComponent(assignmentFilter)}&status=in.(submitted,returned)&order=submitted_at.desc`,{headers:headers(accessToken)});
    if(!submissionResponse.ok)throw new Error("Submitted work could not be loaded.");
    const submissionRows=await submissionResponse.json() as Submission[];
    setAssignments(assignmentRows);setSubmissions(submissionRows);
    setGrades(Object.fromEntries(submissionRows.map(item=>[item.id,item.grade==null?"":String(item.grade)])));
    setFeedback(Object.fromEntries(submissionRows.map(item=>[item.id,item.feedback??""])));
    setMessage(submissionRows.length?`${submissionRows.length} submitted or returned item${submissionRows.length===1?"":"s"} loaded.`:"No students have submitted work yet.");
  },[accessToken,characterId]);

  useEffect(()=>{let cancelled=false;async function load(){try{await loadData();}catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Grading data could not be loaded.");}}load();return()=>{cancelled=true;};},[loadData]);

  const assignmentMap=useMemo(()=>new Map(assignments.map(item=>[item.id,item])),[assignments]);

  async function returnWork(submission:Submission){
    const assignment=assignmentMap.get(submission.assignment_id);
    const gradeValue=Number(grades[submission.id]);
    if(!assignment||!Number.isFinite(gradeValue)||gradeValue<0||gradeValue>assignment.points){setMessage(`Grade must be between 0 and ${assignment?.points??0} points.`);return;}
    setSavingId(submission.id);setMessage(`Returning ${assignment.title}…`);
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/assignment_submissions?id=eq.${encodeURIComponent(submission.id)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({grade:gradeValue,feedback:(feedback[submission.id]??"").trim(),status:"returned"})});
      if(!response.ok)throw new Error("The graded submission could not be returned.");
      await loadData();setMessage("Graded work returned to the student.");
    }catch(error){setMessage(error instanceof Error?error.message:"The graded submission could not be returned.");}
    finally{setSavingId(null);}
  }

  return <section className={styles.panel} aria-labelledby="grading-title">
    <div className={styles.heading}><div><p className="eyebrow">GRADING</p><h4 id="grading-title">Submitted work</h4></div><span>{submissions.filter(item=>item.status==="submitted").length} TO REVIEW</span></div>
    <div className={styles.status} aria-live="polite">{message}</div>
    {submissions.length===0?<div className={styles.empty}><strong>No submitted work</strong><p>Student submissions for your teaching sections will appear here automatically.</p></div>:<div className={styles.list}>{submissions.map(submission=>{
      const assignment=assignmentMap.get(submission.assignment_id);
      const student=submission.characters;
      const returned=submission.status==="returned";
      return <article key={submission.id}>
        <div className={styles.meta}><span>{assignment?.title??"Assignment"}</span><b>{submission.status.toUpperCase()}</b></div>
        <h5>{student?.display_name??"Student"}</h5><p className={styles.handle}>@{student?.handle??"student"} • {dateLabel(submission.submitted_at)}</p>
        <div className={styles.response}>{submission.body||"No written response."}</div>
        <div className={styles.fields}><label><span>Grade / {assignment?.points??0}</span><input type="number" min="0" max={assignment?.points??10000} step="0.01" value={grades[submission.id]??""} onChange={event=>setGrades(current=>({...current,[submission.id]:event.target.value}))} disabled={returned}/></label><label><span>Feedback</span><textarea value={feedback[submission.id]??""} onChange={event=>setFeedback(current=>({...current,[submission.id]:event.target.value}))} maxLength={8000} disabled={returned}/></label></div>
        {returned?<div className={styles.returned}>Returned to student • {submission.grade??"Grade pending"}</div>:<button type="button" onClick={()=>returnWork(submission)} disabled={savingId===submission.id}>{savingId===submission.id?"Returning…":"Return graded work"}</button>}
      </article>;
    })}</div>}
  </section>;
}
