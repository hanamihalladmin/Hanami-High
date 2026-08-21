"use client";

import {useEffect,useState} from "react";
import styles from "./StudentAcademicRecordPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string;characterId:string};
type TranscriptRow={report_id:string;term:string;course_code:string;course_title:string;section_code:string;numeric_grade:number|null;letter_grade:string|null;instructor_comment:string|null;published_at:string|null};
type AttendanceRow={id:string;attendance_date:string;status:"present"|"absent"|"tardy"|"excused";note:string|null;class_sections?:{section_code?:string;academic_courses?:{code?:string;title?:string}}};
type CharacterRow={display_name:string;handle:string};
type IdCardRow={id_number:string;issued_at:string;status:string;school_year:string};
type HomeroomRow={joined_at:string;student_year:number;homerooms:{code:string;grade_level:number;school_year:string;room_label:string|null}|null};
type PortalPreferenceRow={profile_image_path:string|null};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function StudentAcademicRecordPanel({accessToken,characterId}:Props){
 const [transcript,setTranscript]=useState<TranscriptRow[]>([]);const [attendance,setAttendance]=useState<AttendanceRow[]>([]);const [message,setMessage]=useState("Loading your academic record…");
 const [student,setStudent]=useState<CharacterRow|null>(null);const [idCard,setIdCard]=useState<IdCardRow|null>(null);const [homeroomRecord,setHomeroomRecord]=useState<HomeroomRow|null>(null);const [avatarUrl,setAvatarUrl]=useState("");const [idStatus,setIdStatus]=useState("Preparing student ID…");
 useEffect(()=>{let cancelled=false;let objectUrl="";(async()=>{try{
   const issueResponse=await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_my_student_id`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:characterId})});
   if(!issueResponse.ok)throw new Error("Your student ID could not be issued.");
   const [characterResponse,idResponse,homeroomResponse,preferenceResponse]=await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/characters?select=display_name,handle&id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
    fetch(`${SUPABASE_URL}/rest/v1/student_id_cards?select=id_number,issued_at,status,school_year&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
    fetch(`${SUPABASE_URL}/rest/v1/homeroom_memberships?select=joined_at,student_year,homerooms(code,grade_level,school_year,room_label)&student_character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
    fetch(`${SUPABASE_URL}/rest/v1/character_portal_preferences?select=profile_image_path&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)})
   ]);
   if(!characterResponse.ok||!idResponse.ok||!homeroomResponse.ok||!preferenceResponse.ok)throw new Error("Your student ID details could not be loaded.");
   const character=(await characterResponse.json() as CharacterRow[])[0]??null;const card=(await idResponse.json() as IdCardRow[])[0]??null;const room=(await homeroomResponse.json() as HomeroomRow[])[0]??null;const preference=(await preferenceResponse.json() as PortalPreferenceRow[])[0]??null;
   if(preference?.profile_image_path){const media=await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/profile-media/${encodeURI(preference.profile_image_path)}`,{headers:headers(accessToken)});if(media.ok){objectUrl=URL.createObjectURL(await media.blob());}}
   if(cancelled){if(objectUrl)URL.revokeObjectURL(objectUrl);return;}setStudent(character);setIdCard(card);setHomeroomRecord(room);setAvatarUrl(objectUrl);setIdStatus(card?.status?.toLowerCase()==="active"?"Official Hanami student ID active.":card?`Student ID ${card.status}.`:"Student ID unavailable.");
  }catch(error){if(!cancelled)setIdStatus(error instanceof Error?error.message:"Student ID unavailable.");}})();return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[accessToken,characterId]);
 useEffect(()=>{let cancelled=false;(async()=>{try{
   const [transcriptResponse,attendanceResponse]=await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/rpc/student_transcript`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({viewer_character_id:characterId})}),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_records?select=id,attendance_date,status,note,class_sections(section_code,academic_courses(code,title))&student_character_id=eq.${encodeURIComponent(characterId)}&order=attendance_date.desc&limit=60`,{headers:headers(accessToken)})
   ]);
   if(!transcriptResponse.ok||!attendanceResponse.ok)throw new Error("Your academic record could not be loaded.");
   const transcriptRows=await transcriptResponse.json() as TranscriptRow[];const attendanceRows=await attendanceResponse.json() as AttendanceRow[];
   if(cancelled)return;setTranscript(transcriptRows);setAttendance(attendanceRows);setMessage(`${transcriptRows.length} published report ${transcriptRows.length===1?"entry":"entries"} • ${attendanceRows.length} recent attendance record${attendanceRows.length===1?"":"s"}.`);
  }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Academic record unavailable.");}})();return()=>{cancelled=true;};},[accessToken,characterId]);
 const attendanceCounts=attendance.reduce<Record<string,number>>((acc,row)=>({...acc,[row.status]:(acc[row.status]??0)+1}),{});const homeroom=homeroomRecord?.homerooms??null;const year=homeroomRecord?.student_year??null;const gradeLabel=year?`${year}${year===1?"st":year===2?"nd":"th"} Year`:"Pending";const graded=transcript.filter(row=>row.numeric_grade!=null);const average=graded.length?Math.round(graded.reduce((sum,row)=>sum+(row.numeric_grade??0),0)/graded.length):null;const attendanceTotal=attendance.length;const attendanceRate=attendanceTotal?Math.round(((attendanceCounts.present??0)+(attendanceCounts.tardy??0))*100/attendanceTotal):null;
 return <section className={styles.panel} aria-labelledby="academic-record-title"><div className={styles.heading}><div><p className="eyebrow">ACADEMIC RECORD</p><h4 id="academic-record-title">Student ID, attendance & report cards</h4></div><span>PUBLISHED RECORDS ONLY</span></div>
 <section className={styles.idSection} aria-labelledby="student-id-title"><div className={styles.idIntro}><div><p className="eyebrow">DIGITAL STUDENT IDENTIFICATION</p><h5 id="student-id-title">Hanami High Student ID</h5></div><span>{idStatus}</span></div><div className={styles.idCard}><div className={styles.idTop}><div><strong>花見高等学校</strong><span>HANAMI HIGH SCHOOL</span></div><b>STUDENT</b></div><div className={styles.idBody}><div className={styles.idPhoto}>{avatarUrl?<img src={avatarUrl} alt={`${student?.display_name??"Student"} profile`}/>:<span>{student?.display_name?.slice(0,1).toUpperCase()??"花"}</span>}</div><div className={styles.idDetails}><h6>{student?.display_name??"Student"}</h6><p>@{student?.handle??"student"}</p><dl><div><dt>ID Number</dt><dd>{idCard?.id_number??"Issuing…"}</dd></div><div><dt>Homeroom</dt><dd>{homeroom?`${homeroom.code}${homeroom.room_label?` • ${homeroom.room_label}`:""}`:"Assigned with schedule"}</dd></div><div><dt>Year</dt><dd>{gradeLabel}</dd></div><div><dt>School Year</dt><dd>{idCard?.school_year??homeroom?.school_year??"2006-2007"}</dd></div><div><dt>Status</dt><dd>{idCard?.status?.toUpperCase()??"PENDING"}</dd></div><div><dt>Issued</dt><dd>Apr 7, 2006</dd></div></dl></div></div><div className={styles.idFooter}><span>HANAMI CITY • JAPAN</span><span>PROPERTY OF HANAMI HIGH SCHOOL</span></div></div><p className={styles.idNote}>All Hanami High student IDs are institutionally issued on April 7, 2006, the school opening date. Your student picture follows your portal profile image automatically. Homeroom and student year are separate: A/B/C homerooms may include both 1st-year and 2nd-year students.</p></section>
 <div className={styles.status}>{message}</div>
 <div className={styles.summary}><div><strong>{attendanceCounts.present??0}</strong><span>Present</span></div><div><strong>{attendanceCounts.tardy??0}</strong><span>Tardy</span></div><div><strong>{attendanceCounts.absent??0}</strong><span>Absent</span></div><div><strong>{attendanceCounts.excused??0}</strong><span>Excused</span></div><div><strong>{attendanceRate==null?"—":`${attendanceRate}%`}</strong><span>Attendance Rate</span></div><div><strong>{average==null?"—":`${average}%`}</strong><span>Grade Average</span></div></div>
 <h5>Report cards / transcript</h5>{transcript.length===0?<p className={styles.empty}>No published report cards yet.</p>:<div className={styles.records}>{transcript.map(row=><article key={row.report_id}><div><strong>{row.course_code} • {row.course_title}</strong><span>{row.term} • SEC {row.section_code}</span></div><div className={styles.grade}><strong>{row.letter_grade??"—"}</strong><span>{row.numeric_grade==null?"—":`${row.numeric_grade}%`}</span></div>{row.instructor_comment&&<p>{row.instructor_comment}</p>}</article>)}</div>}
 <h5>Recent attendance</h5>{attendance.length===0?<p className={styles.empty}>No attendance has been recorded yet.</p>:<div className={styles.attendance}>{attendance.slice(0,20).map(row=><div key={row.id}><span>{new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",year:"numeric"}).format(new Date(`${row.attendance_date}T12:00:00+09:00`))}</span><strong>{row.status.toUpperCase()}</strong><span>{row.class_sections?.academic_courses?.code??"CLASS"} {row.class_sections?.section_code??""}</span></div>)}</div>}</section>;
}
