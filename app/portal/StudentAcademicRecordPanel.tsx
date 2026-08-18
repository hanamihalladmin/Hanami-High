"use client";

import {useEffect,useState} from "react";
import styles from "./StudentAcademicRecordPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string;characterId:string};
type TranscriptRow={report_id:string;term:string;course_code:string;course_title:string;section_code:string;numeric_grade:number|null;letter_grade:string|null;instructor_comment:string|null;published_at:string|null};
type AttendanceRow={id:string;attendance_date:string;status:"present"|"absent"|"tardy"|"excused";note:string|null;class_sections?:{section_code?:string;academic_courses?:{code?:string;title?:string}}};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function StudentAcademicRecordPanel({accessToken,characterId}:Props){
 const [transcript,setTranscript]=useState<TranscriptRow[]>([]);const [attendance,setAttendance]=useState<AttendanceRow[]>([]);const [message,setMessage]=useState("Loading your academic record…");
 useEffect(()=>{let cancelled=false;(async()=>{try{
   const [transcriptResponse,attendanceResponse]=await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/rpc/student_transcript`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({viewer_character_id:characterId})}),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_records?select=id,attendance_date,status,note,class_sections(section_code,academic_courses(code,title))&student_character_id=eq.${encodeURIComponent(characterId)}&order=attendance_date.desc&limit=60`,{headers:headers(accessToken)})
   ]);
   if(!transcriptResponse.ok||!attendanceResponse.ok)throw new Error("Your academic record could not be loaded.");
   const transcriptRows=await transcriptResponse.json() as TranscriptRow[];const attendanceRows=await attendanceResponse.json() as AttendanceRow[];
   if(cancelled)return;setTranscript(transcriptRows);setAttendance(attendanceRows);setMessage(`${transcriptRows.length} published report ${transcriptRows.length===1?"entry":"entries"} • ${attendanceRows.length} recent attendance record${attendanceRows.length===1?"":"s"}.`);
  }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Academic record unavailable.");}})();return()=>{cancelled=true;};},[accessToken,characterId]);
 const attendanceCounts=attendance.reduce<Record<string,number>>((acc,row)=>({...acc,[row.status]:(acc[row.status]??0)+1}),{});
 return <section className={styles.panel} aria-labelledby="academic-record-title"><div className={styles.heading}><div><p className="eyebrow">ACADEMIC RECORD</p><h4 id="academic-record-title">Attendance & report cards</h4></div><span>PUBLISHED RECORDS ONLY</span></div><div className={styles.status}>{message}</div>
 <div className={styles.summary}><div><strong>{attendanceCounts.present??0}</strong><span>Present</span></div><div><strong>{attendanceCounts.tardy??0}</strong><span>Tardy</span></div><div><strong>{attendanceCounts.absent??0}</strong><span>Absent</span></div><div><strong>{attendanceCounts.excused??0}</strong><span>Excused</span></div></div>
 <h5>Report cards / transcript</h5>{transcript.length===0?<p className={styles.empty}>No published report cards yet.</p>:<div className={styles.records}>{transcript.map(row=><article key={row.report_id}><div><strong>{row.course_code} • {row.course_title}</strong><span>{row.term} • SEC {row.section_code}</span></div><div className={styles.grade}><strong>{row.letter_grade??"—"}</strong><span>{row.numeric_grade==null?"—":`${row.numeric_grade}%`}</span></div>{row.instructor_comment&&<p>{row.instructor_comment}</p>}</article>)}</div>}
 <h5>Recent attendance</h5>{attendance.length===0?<p className={styles.empty}>No attendance has been recorded yet.</p>:<div className={styles.attendance}>{attendance.slice(0,20).map(row=><div key={row.id}><span>{new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",year:"numeric"}).format(new Date(`${row.attendance_date}T12:00:00+09:00`))}</span><strong>{row.status.toUpperCase()}</strong><span>{row.class_sections?.academic_courses?.code??"CLASS"} {row.class_sections?.section_code??""}</span></div>)}</div>}</section>;
}
