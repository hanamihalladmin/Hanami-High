"use client";

import {useCallback,useEffect,useState} from "react";
import styles from "./AdminStudentIdManager.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string};
type StudentRow={character_id:string;display_name:string;handle:string;id_number:string|null;id_status:string|null;issued_at:string|null;homeroom_code:string|null;grade_level:number|null;school_year:string|null};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function AdminStudentIdManager({accessToken}:Props){
 const [students,setStudents]=useState<StudentRow[]>([]);const [status,setStatus]=useState("Loading student IDs…");const [busy,setBusy]=useState<string|null>(null);
 const load=useCallback(async()=>{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_list_student_ids`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:"{}"});if(!response.ok){setStatus("Student IDs could not be loaded.");return;}const rows=await response.json() as StudentRow[];setStudents(rows);setStatus(`${rows.length} student character${rows.length===1?"":"s"} found.`);},[accessToken]);
 useEffect(()=>{void load();},[load]);
 async function issue(characterId:string){setBusy(characterId);setStatus("Issuing school ID…");try{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_issue_student_id`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:characterId})});if(!response.ok){const body=await response.json().catch(()=>({})) as {message?:string};throw new Error(body.message??"School ID could not be issued.");}const id=await response.json() as string;setStatus(`School ID ${id} is active.`);await load();}catch(error){setStatus(error instanceof Error?error.message:"School ID could not be issued.");}finally{setBusy(null);}}
 return <section className={styles.panel} aria-labelledby="school-id-manager-title"><div className={styles.heading}><div><p className="eyebrow">STUDENT IDENTIFICATION</p><h3 id="school-id-manager-title">School ID issuance</h3><p>Owner and Administration can issue permanent Hanami student ID numbers. Homeroom information comes from the student&apos;s official assignment.</p></div><span>HHS ID OFFICE</span></div><div className={styles.status}>{status}</div><div className={styles.grid}>{students.length===0?<p className={styles.empty}>No student characters are available yet.</p>:students.map(student=><article key={student.character_id} className={styles.card}><div><strong>{student.display_name}</strong><span>@{student.handle}</span><small>{student.homeroom_code?`${student.homeroom_code}${student.grade_level?` • Year ${student.grade_level}`:""}${student.school_year?` • ${student.school_year}`:""}`:"Homeroom assigned with schedule"}</small></div><div className={styles.idBlock}><b>{student.id_number??"NOT ISSUED"}</b><span>{student.id_status?.toUpperCase()??"PENDING"}</span></div><button type="button" disabled={busy===student.character_id} onClick={()=>void issue(student.character_id)}>{student.id_number?"Confirm / reactivate ID":"Issue school ID"}</button></article>)}</div></section>;
}
