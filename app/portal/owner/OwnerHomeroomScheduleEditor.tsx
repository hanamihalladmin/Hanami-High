"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./OwnerHomeroomScheduleEditor.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const DAYS=[{id:1,label:"Monday"},{id:2,label:"Tuesday"},{id:3,label:"Wednesday"},{id:4,label:"Thursday"},{id:5,label:"Friday"}] as const;
const PERIODS=[
 {number:1,label:"Period 1",time:"8:50–9:40"},
 {number:2,label:"Period 2",time:"9:50–10:40"},
 {number:3,label:"Period 3",time:"10:50–11:40"},
 {number:4,label:"Period 4",time:"11:50–12:40"},
 {number:5,label:"Period 5",time:"1:25–2:15"},
 {number:6,label:"Period 6",time:"2:25–3:15"},
] as const;

type Homeroom={id:string;code:string;school_year:string;is_active:boolean};
type Course={code:string;title:string};
type Meeting={weekday:number;label:string|null;starts_at:string;ends_at:string};
type Section={id:string;section_code:string;room:string|null;academic_courses:Course|null;section_meetings:Meeting[]};
type Block={id:string;block_type:string;weekday:number;starts_at:string;homeroom_label:string|null;notes:string|null};
type InstructorMembership={section_id:string;character_id:string};
type Faculty={id:string;display_name:string};
type WeekDraft=Record<number,string[]>;
type Props={accessToken:string};

function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
function blankWeek():WeekDraft{return Object.fromEntries(DAYS.map(day=>[day.id,Array(6).fill("__OPEN__")])) as WeekDraft;}
function normalizedHomeroom(value:string|null){const clean=(value??"").trim().toUpperCase();const match=clean.match(/([A-Z])$/);return match?.[1]??clean;}
function periodFromLabel(label:string|null){const match=(label??"").match(/period\s*([1-6])/i);return match?Number(match[1]):0;}
function periodFromStart(value:string){const key=value.slice(0,5);return ({"08:50":1,"09:50":2,"10:50":3,"11:50":4,"13:25":5,"14:25":6} as Record<string,number>)[key]??0;}
function isClass(value:string){return !value.startsWith("__");}
function shortLabel(value:string,course?:Course|null){if(value==="__OPEN__")return "Open";if(value==="__STUDY__")return "Study";if(value==="__EXTRACURRICULAR__")return "Extracurricular";return course?.title??value;}

export default function OwnerHomeroomScheduleEditor({accessToken}:Props){
 const [homerooms,setHomerooms]=useState<Homeroom[]>([]);
 const [homeroomCode,setHomeroomCode]=useState("");
 const [sections,setSections]=useState<Section[]>([]);
 const [blocks,setBlocks]=useState<Block[]>([]);
 const [memberships,setMemberships]=useState<InstructorMembership[]>([]);
 const [faculty,setFaculty]=useState<Faculty[]>([]);
 const [week,setWeek]=useState<WeekDraft>(blankWeek());
 const [activeDay,setActiveDay]=useState(1);
 const [notice,setNotice]=useState("Loading weekly classroom planner…");
 const [saving,setSaving]=useState(false);

 const facultyNames=useMemo(()=>new Map(faculty.map(row=>[row.id,row.display_name])),[faculty]);
 const instructorIdsBySection=useMemo(()=>{const map=new Map<string,string[]>();memberships.forEach(row=>map.set(row.section_id,[...(map.get(row.section_id)??[]),row.character_id]));return map;},[memberships]);
 const sectionFor=useCallback((code:string,courseCode:string)=>sections.find(section=>section.section_code.toUpperCase()===code.toUpperCase()&&section.academic_courses?.code===courseCode),[sections]);
 const courses=useMemo(()=>sections.filter(section=>section.section_code.toUpperCase()===homeroomCode.toUpperCase()).map(section=>section.academic_courses).filter((course):course is Course=>Boolean(course)).sort((a,b)=>a.title.localeCompare(b.title)),[sections,homeroomCode]);

 const buildSavedWeek=useCallback((code:string,allSections=sections,allBlocks=blocks)=>{const next=blankWeek();allSections.filter(section=>section.section_code.toUpperCase()===code.toUpperCase()).forEach(section=>(section.section_meetings??[]).forEach(meeting=>{const period=periodFromLabel(meeting.label);if(meeting.weekday>=1&&meeting.weekday<=5&&period&&section.academic_courses)next[meeting.weekday][period-1]=section.academic_courses.code;}));allBlocks.filter(block=>normalizedHomeroom(block.homeroom_label)===code.toUpperCase()&&block.notes==="owner_homeroom_daily_schedule").forEach(block=>{const period=periodFromStart(block.starts_at);if(!period||block.weekday<1||block.weekday>5)return;if(block.block_type==="study")next[block.weekday][period-1]="__STUDY__";if(block.block_type==="extracurricular")next[block.weekday][period-1]="__EXTRACURRICULAR__";});return next;},[sections,blocks]);

 const schoolWeek=useMemo(()=>{const result=new Map<string,WeekDraft>();homerooms.forEach(room=>result.set(room.code,buildSavedWeek(room.code)));if(homeroomCode)result.set(homeroomCode,week);return result;},[homerooms,buildSavedWeek,homeroomCode,week]);

 const conflicts=useMemo(()=>{const map=new Map<string,string[]>();const add=(code:string,day:number,period:number,msg:string)=>{const key=`${code}:${day}:${period}`;map.set(key,[...(map.get(key)??[]),msg]);};for(const day of DAYS){for(const period of PERIODS){for(let i=0;i<homerooms.length;i++){for(let j=i+1;j<homerooms.length;j++){const a=homerooms[i].code,b=homerooms[j].code;const aa=schoolWeek.get(a)?.[day.id]?.[period.number-1]??"__OPEN__";const bb=schoolWeek.get(b)?.[day.id]?.[period.number-1]??"__OPEN__";if(!isClass(aa)||!isClass(bb))continue;const sa=sectionFor(a,aa),sb=sectionFor(b,bb);if(!sa||!sb)continue;const shared=(instructorIdsBySection.get(sa.id)??[]).filter(id=>(instructorIdsBySection.get(sb.id)??[]).includes(id));for(const id of shared){const name=facultyNames.get(id)??"Same instructor";add(a,day.id,period.number,`${name} is also teaching Homeroom ${b}.`);add(b,day.id,period.number,`${name} is also teaching Homeroom ${a}.`);}const roomA=(sa.room??"").trim().toLowerCase(),roomB=(sb.room??"").trim().toLowerCase();if(roomA&&roomB&&roomA===roomB){add(a,day.id,period.number,`${sa.room} is also assigned to Homeroom ${b}.`);add(b,day.id,period.number,`${sb.room} is also assigned to Homeroom ${a}.`);}}}}}return map;},[homerooms,schoolWeek,sectionFor,instructorIdsBySection,facultyNames]);

 const selectedConflictCount=useMemo(()=>DAYS.reduce((total,day)=>total+PERIODS.filter(period=>(conflicts.get(`${homeroomCode}:${day.id}:${period.number}`)?.length??0)>0).length,0),[conflicts,homeroomCode]);
 const activeDayConflicts=useMemo(()=>PERIODS.filter(period=>(conflicts.get(`${homeroomCode}:${activeDay}:${period.number}`)?.length??0)>0).length,[conflicts,homeroomCode,activeDay]);

 const load=useCallback(async()=>{try{const [h,s,b,m,f]=await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/homerooms?select=id,code,school_year,is_active&is_active=eq.true&order=code.asc`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/class_sections?select=${encodeURIComponent("id,section_code,room,academic_courses(code,title),section_meetings(weekday,label,starts_at,ends_at)")}`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/school_schedule_blocks?select=id,block_type,weekday,starts_at,homeroom_label,notes&notes=eq.owner_homeroom_daily_schedule`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=section_id,character_id&relationship=eq.instructor`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/characters?select=id,display_name&role=eq.faculty`,{headers:headers(accessToken)})
 ]);if(!h.ok||!s.ok||!b.ok||!m.ok||!f.ok)throw new Error("The weekly classroom schedule could not be loaded.");const hs=await h.json() as Homeroom[];const ss=await s.json() as Section[];const bb=await b.json() as Block[];setHomerooms(hs);setSections(ss);setBlocks(bb);setMemberships(await m.json() as InstructorMembership[]);setFaculty(await f.json() as Faculty[]);const code=homeroomCode||hs[0]?.code||"";if(!code){setNotice("No active homerooms are available.");return;}if(!homeroomCode)setHomeroomCode(code);const next=blankWeek();ss.filter(section=>section.section_code.toUpperCase()===code.toUpperCase()).forEach(section=>(section.section_meetings??[]).forEach(meeting=>{const period=periodFromLabel(meeting.label);if(meeting.weekday>=1&&meeting.weekday<=5&&period&&section.academic_courses)next[meeting.weekday][period-1]=section.academic_courses.code;}));bb.filter(block=>normalizedHomeroom(block.homeroom_label)===code.toUpperCase()).forEach(block=>{const period=periodFromStart(block.starts_at);if(!period||block.weekday<1||block.weekday>5)return;if(block.block_type==="study")next[block.weekday][period-1]="__STUDY__";if(block.block_type==="extracurricular")next[block.weekday][period-1]="__EXTRACURRICULAR__";});setWeek(next);setNotice(`Editing the full Monday–Friday schedule for Homeroom ${code}.`);}catch(error){setNotice(error instanceof Error?error.message:"Weekly schedule unavailable.");}},[accessToken,homeroomCode]);
 useEffect(()=>{void load();},[load]);

 function changeCell(day:number,periodIndex:number,value:string){setWeek(current=>({...current,[day]:current[day].map((item,index)=>index===periodIndex?value:item)}));}
 function sectionDetails(code:string,assignment:string){if(!isClass(assignment))return "";const section=sectionFor(code,assignment);if(!section)return "";const names=(instructorIdsBySection.get(section.id)??[]).map(id=>facultyNames.get(id)).filter(Boolean);return [names.length?names.join(", "):"Unstaffed",section.room?`Room ${section.room}`:"Room TBA"].join(" • ");}
 async function saveWeek(){if(!homeroomCode||saving)return;if(selectedConflictCount){setNotice(`Resolve ${selectedConflictCount} weekly conflict${selectedConflictCount===1?"":"s"} before publishing this homeroom schedule.`);return;}setSaving(true);setNotice(`Saving the full week for Homeroom ${homeroomCode}…`);try{for(const day of DAYS){const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_set_homeroom_daily_schedule`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({requested_homeroom_code:homeroomCode,requested_weekday:day.id,requested_periods:week[day.id].map((assignment,index)=>({period:index+1,assignment}))})});if(!response.ok){let message=`${day.label} could not be saved.`;try{const body=await response.json() as {message?:string};if(body.message)message=body.message;}catch{}throw new Error(message);}}await load();setNotice(`Homeroom ${homeroomCode}'s Monday–Friday schedule is published.`);}catch(error){setNotice(error instanceof Error?error.message:"The weekly schedule could not be saved.");}finally{setSaving(false);}}

 return <section className={styles.panel} aria-labelledby="weekly-scheduler-title">
  <div className={styles.heading}><div><p className="eyebrow">OWNER • CLASSROOM CONTROL CENTER</p><h3 id="weekly-scheduler-title">Weekly Homeroom Scheduler</h3><p>Build one homeroom’s entire school week in one place. Every class assignment is checked against the other homerooms for teacher and room conflicts before publishing.</p></div><span className={styles.badge}>WEEKLY PLANNER</span></div>
  <div className={styles.notice} aria-live="polite">{notice}</div>
  <div className={styles.topControls}><label>Homeroom<select value={homeroomCode} onChange={e=>setHomeroomCode(e.target.value)}>{homerooms.map(room=><option key={room.id} value={room.code}>Homeroom {room.code} • {room.school_year}</option>)}</select></label><div className={selectedConflictCount?styles.conflictSummary:styles.clearSummary}><strong>{selectedConflictCount?`${selectedConflictCount} scheduling conflict${selectedConflictCount===1?"":"s"}`:"Week clear"}</strong><span>{selectedConflictCount?"Resolve highlighted cells before publishing.":"No instructor or room collisions detected."}</span></div></div>

  <section className={styles.weekSection}><div className={styles.sectionTitle}><div><strong>Homeroom {homeroomCode} • full week</strong><span>Edit any cell directly. The schedule is not published until you press Save Full Week.</span></div></div><div className={styles.tableWrap}><table className={styles.weekTable}><thead><tr><th>Period</th>{DAYS.map(day=><th key={day.id}>{day.label}</th>)}</tr></thead><tbody>{PERIODS.map((period,index)=><tr key={period.number}><th><strong>{period.label}</strong><span>{period.time}</span></th>{DAYS.map(day=>{const assignment=week[day.id]?.[index]??"__OPEN__";const issues=conflicts.get(`${homeroomCode}:${day.id}:${period.number}`)??[];return <td key={day.id} className={issues.length?styles.conflictCell:""}><select aria-label={`${day.label} ${period.label}`} value={assignment} onChange={e=>changeCell(day.id,index,e.target.value)}><option value="__OPEN__">Open period</option><option value="__STUDY__">Study Period</option><option value="__EXTRACURRICULAR__">Extracurriculars</option>{courses.map(course=><option key={course.code} value={course.code}>{course.title}</option>)}</select>{assignment!=="__OPEN__"&&<small>{sectionDetails(homeroomCode,assignment)}</small>}{issues.map((issue,i)=><em key={i}>⚠ {issue}</em>)}</td>})}</tr>)}</tbody></table></div></section>

  <section className={styles.masterSection}><div className={styles.masterHeading}><div><strong>All-homeroom conflict check</strong><span>Select a day to compare A/B/C period-by-period while you edit the week above.</span></div><div className={styles.dayTabs}>{DAYS.map(day=><button type="button" key={day.id} className={activeDay===day.id?styles.activeDay:""} onClick={()=>setActiveDay(day.id)}>{day.label.slice(0,3)}</button>)}</div></div><div className={styles.tableWrap}><table className={styles.masterTable}><thead><tr><th>Period</th>{homerooms.map(room=><th key={room.id} className={room.code===homeroomCode?styles.editingColumn:""}>Homeroom {room.code}</th>)}</tr></thead><tbody>{PERIODS.map(period=><tr key={period.number}><th><strong>{period.label}</strong><span>{period.time}</span></th>{homerooms.map(room=>{const assignment=schoolWeek.get(room.code)?.[activeDay]?.[period.number-1]??"__OPEN__";const section=isClass(assignment)?sectionFor(room.code,assignment):null;const issues=conflicts.get(`${room.code}:${activeDay}:${period.number}`)??[];return <td key={room.id} className={`${room.code===homeroomCode?styles.editingColumn:""} ${issues.length?styles.conflictCell:""}`}><strong>{shortLabel(assignment,section?.academic_courses)}</strong>{assignment!=="__OPEN__"&&<small>{sectionDetails(room.code,assignment)}</small>}{issues.map((issue,i)=><em key={i}>⚠ {issue}</em>)}</td>})}</tr>)}</tbody></table></div><div className={styles.dayStatus}>{activeDayConflicts?`${activeDayConflicts} conflict${activeDayConflicts===1?"":"s"} affect Homeroom ${homeroomCode} on ${DAYS.find(day=>day.id===activeDay)?.label}.`:`${DAYS.find(day=>day.id===activeDay)?.label} is clear for Homeroom ${homeroomCode}.`}</div></section>

  <div className={styles.actions}><button type="button" disabled={saving||!homeroomCode||selectedConflictCount>0} onClick={()=>void saveWeek()}>{saving?"Saving Monday–Friday…":selectedConflictCount?"Resolve conflicts to publish":"Save Full Week"}</button></div>
  <div className={styles.help}><strong>How scheduling works:</strong> each homeroom receives its own Monday–Friday timetable. Saving updates the matching class-section meetings for all six periods on all five days, so students automatically inherit the correct weekly schedule through their homeroom.</div>
 </section>;
}
