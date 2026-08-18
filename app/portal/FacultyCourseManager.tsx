"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import styles from "./FacultyCourseManager.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Course={code:string;title:string;is_test_data:boolean};
type Section={id:string;section_code:string;term:string;room:string|null;is_test_data:boolean;academic_courses:Course|null};
type Assignment={id:string;section_id:string;title:string;description:string;due_at:string|null;points:number;status:"draft"|"published"|"closed";is_test_data:boolean};
type Props={accessToken:string;characterId:string};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function dueLabel(value:string|null){if(!value)return "No due date";return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo",timeZoneName:"short"}).format(new Date(value));}

export default function FacultyCourseManager({accessToken,characterId}:Props){
  const [sections,setSections]=useState<Section[]>([]);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [message,setMessage]=useState("Loading your teaching sections…");
  const [saving,setSaving]=useState(false);
  const [sectionId,setSectionId]=useState("");
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [dueAt,setDueAt]=useState("");
  const [points,setPoints]=useState("100");
  const [status,setStatus]=useState<"draft"|"published">("draft");

  const loadData=useCallback(async()=>{
    const membershipResponse=await fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=section_id&character_id=eq.${encodeURIComponent(characterId)}&relationship=eq.instructor`,{headers:headers(accessToken)});
    if(!membershipResponse.ok)throw new Error("Your instructor assignments could not be checked.");
    const memberships=await membershipResponse.json() as {section_id:string}[];
    const ids=memberships.map(item=>item.section_id);
    if(ids.length===0){setSections([]);setAssignments([]);setSectionId("");setMessage("No teaching sections are assigned to this faculty character yet.");return;}
    const filter=`(${ids.join(",")})`;
    const [sectionResponse,assignmentResponse]=await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/class_sections?select=id,section_code,term,room,is_test_data,academic_courses(code,title,is_test_data)&id=in.${encodeURIComponent(filter)}`,{headers:headers(accessToken)}),
      fetch(`${SUPABASE_URL}/rest/v1/course_assignments?select=id,section_id,title,description,due_at,points,status,is_test_data&section_id=in.${encodeURIComponent(filter)}&order=created_at.desc`,{headers:headers(accessToken)}),
    ]);
    if(!sectionResponse.ok||!assignmentResponse.ok)throw new Error("Your course management data could not be loaded.");
    const sectionRows=await sectionResponse.json() as Section[];
    const assignmentRows=await assignmentResponse.json() as Assignment[];
    setSections(sectionRows);setAssignments(assignmentRows);setSectionId(current=>current||sectionRows[0]?.id||"");
    setMessage(`${sectionRows.length} teaching section${sectionRows.length===1?"":"s"} loaded.`);
  },[accessToken,characterId]);

  useEffect(()=>{let cancelled=false;async function load(){try{await loadData();}catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Course management could not be loaded.");}}load();return()=>{cancelled=true;};},[loadData]);

  async function createAssignment(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const cleanTitle=title.trim();
    const numericPoints=Number(points);
    if(!sectionId||cleanTitle.length<2){setMessage("Choose a teaching section and enter an assignment title.");return;}
    if(!Number.isFinite(numericPoints)||numericPoints<0||numericPoints>10000){setMessage("Points must be between 0 and 10,000.");return;}
    setSaving(true);setMessage(`Creating ${status} assignment…`);
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/course_assignments`,{
        method:"POST",
        headers:headers(accessToken,{"Content-Type":"application/json"}),
        body:JSON.stringify({section_id:sectionId,created_by_character_id:characterId,title:cleanTitle,description:description.trim(),due_at:dueAt?new Date(dueAt).toISOString():null,points:numericPoints,status,is_test_data:false}),
      });
      if(!response.ok)throw new Error("The assignment could not be created for this teaching section.");
      setTitle("");setDescription("");setDueAt("");setPoints("100");setStatus("draft");
      await loadData();setMessage("Assignment created successfully.");
    }catch(error){setMessage(error instanceof Error?error.message:"The assignment could not be created.");}
    finally{setSaving(false);}
  }

  return <section className={styles.panel} aria-labelledby="faculty-course-title">
    <div className={styles.heading}><div><p className="eyebrow">COURSE MANAGEMENT</p><h4 id="faculty-course-title">Assignments & sections</h4></div><span>{assignments.length} ASSIGNMENTS</span></div>
    <div className={styles.status} aria-live="polite">{message}</div>
    {sections.length===0?<div className={styles.empty}><strong>No assigned sections</strong><p>Administration must assign this faculty character as an instructor before course tools become available.</p></div>:<>
      <form className={styles.form} onSubmit={createAssignment}>
        <div className={styles.formTitle}><strong>NEW ASSIGNMENT</strong><span>FACULTY TOOL</span></div>
        <label><span>Teaching section</span><select value={sectionId} onChange={event=>setSectionId(event.target.value)}>{sections.map(section=><option value={section.id} key={section.id}>{section.academic_courses?.code??"COURSE"} — {section.academic_courses?.title??"Untitled"} / {section.section_code}</option>)}</select></label>
        <label><span>Assignment title</span><input value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} required/></label>
        <label className={styles.wide}><span>Instructions</span><textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={12000}/></label>
        <label><span>Due date / time</span><input type="datetime-local" value={dueAt} onChange={event=>setDueAt(event.target.value)}/></label>
        <label><span>Points</span><input type="number" min="0" max="10000" step="0.01" value={points} onChange={event=>setPoints(event.target.value)}/></label>
        <label><span>Initial status</span><select value={status} onChange={event=>setStatus(event.target.value as "draft"|"published")}><option value="draft">Draft — hidden from students</option><option value="published">Published — visible to students</option></select></label>
        <button type="submit" disabled={saving}>{saving?"Creating…":"Create assignment"}</button>
      </form>
      <div className={styles.assignmentList}>{assignments.length?assignments.map(assignment=>{
        const section=sections.find(item=>item.id===assignment.section_id);
        const testData=assignment.is_test_data||Boolean(section?.is_test_data||section?.academic_courses?.is_test_data);
        return <article key={assignment.id}><div className={styles.meta}><span>{section?.academic_courses?.code??"COURSE"} • {section?.section_code??"—"}</span>{testData&&<b>TEST</b>}</div><h5>{assignment.title}</h5><p>{assignment.description||"No instructions posted."}</p><dl><div><dt>Status</dt><dd>{assignment.status}</dd></div><div><dt>Due</dt><dd>{dueLabel(assignment.due_at)}</dd></div><div><dt>Points</dt><dd>{assignment.points}</dd></div></dl></article>;
      }):<div className={styles.empty}><strong>No assignments created yet</strong><p>Use the faculty form above to create a draft or publish the first assignment.</p></div>}</div>
    </>}
  </section>;
}
