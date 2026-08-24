"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./OwnerHomeroomScheduleEditor.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const DAYS=[{id:1,label:"Monday"},{id:2,label:"Tuesday"},{id:3,label:"Wednesday"},{id:4,label:"Thursday"},{id:5,label:"Friday"}] as const;

type Homeroom={id:string;code:string;school_year:string;is_active:boolean};
type Course={code:string;title:string};
type Section={id:string;section_code:string;room:string|null;academic_courses:Course|null};
type Block={id:string;block_type:string;title:string;weekday:number;starts_at:string;ends_at:string;homeroom_label:string|null;notes:string|null};
type InstructorMembership={section_id:string;character_id:string};
type Faculty={id:string;display_name:string};
type Row={id:string;label:string;startsAt:string;endsAt:string;assignments:Record<number,string>};

function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
function normalizedHomeroom(value:string|null){return (value??"").replace(/^Homeroom\s+/i,"").trim().toUpperCase();}
function cleanTime(value:string){return value.slice(0,5);}
function makeId(){return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`${Date.now()}-${Math.random()}`;}
function assignments(value="__OPEN__"){return Object.fromEntries(DAYS.map(day=>[day.id,value])) as Record<number,string>;}
function defaultRows():Row[]{return [
 {id:makeId(),label:"Period 1",startsAt:"08:50",endsAt:"09:40",assignments:assignments()},
 {id:makeId(),label:"Period 2",startsAt:"09:50",endsAt:"10:40",assignments:assignments()},
 {id:makeId(),label:"Period 3",startsAt:"10:50",endsAt:"11:40",assignments:assignments()},
 {id:makeId(),label:"Period 4",startsAt:"11:50",endsAt:"12:40",assignments:assignments()},
 {id:makeId(),label:"Period 5",startsAt:"13:25",endsAt:"14:15",assignments:assignments()},
 {id:makeId(),label:"Period 6",startsAt:"14:25",endsAt:"15:15",assignments:assignments()},
 ];}
function assignmentFor(block:Block){
 if(block.block_type==="class_period")return block.title.toUpperCase();
 if(block.block_type==="homeroom")return "__HOMEROOM__";
 if(block.block_type==="study")return "__STUDY__";
 if(block.block_type==="break")return "__BREAK__";
 if(block.block_type==="lunch")return "__LUNCH__";
 if(block.block_type==="closing_advisory")return "__CLOSING_ADVISORY__";
 if(block.block_type==="dismissal")return "__DISMISSAL__";
 if(block.block_type==="club")return "__CLUB__";
 if(block.block_type==="extracurricular")return "__EXTRACURRICULAR__";
 if(block.block_type==="assembly")return "__ASSEMBLY__";
 if(block.block_type==="other"&&block.title!=="Open")return "__OTHER__";
 return "__OPEN__";
}
function rowsFromBlocks(code:string,allBlocks:Block[]):Row[]{const relevant=allBlocks.filter(block=>block.notes==="owner_homeroom_daily_schedule"&&normalizedHomeroom(block.homeroom_label)===code.toUpperCase()&&block.weekday>=1&&block.weekday<=5);if(!relevant.length)return defaultRows();const byTime=new Map<string,Row>();for(const block of relevant){const startsAt=cleanTime(block.starts_at),endsAt=cleanTime(block.ends_at),key=`${startsAt}-${endsAt}`;let row=byTime.get(key);if(!row){row={id:makeId(),label:block.block_type==="class_period"?`Schedule ${byTime.size+1}`:block.title,startsAt,endsAt,assignments:assignments()};byTime.set(key,row);}row.assignments[block.weekday]=assignmentFor(block);if(block.block_type!=="class_period")row.label=block.title;}return [...byTime.values()].sort((a,b)=>a.startsAt.localeCompare(b.startsAt));}
function isClass(value:string){return !value.startsWith("__");}
function shortLabel(value:string,courses:Map<string,Course>){
 if(value==="__OPEN__")return "Open";
 if(value==="__HOMEROOM__")return "Homeroom";
 if(value==="__STUDY__")return "Study";
 if(value==="__BREAK__")return "Break";
 if(value==="__LUNCH__")return "Lunch";
 if(value==="__CLOSING_ADVISORY__")return "Closing / Cleaning / Advisory";
 if(value==="__DISMISSAL__")return "Dismissal";
 if(value==="__CLUB__")return "Clubs";
 if(value==="__EXTRACURRICULAR__")return "Extracurricular";
 if(value==="__ASSEMBLY__")return "Assembly";
 if(value==="__OTHER__")return "Other";
 return courses.get(value)?.title??value;
}
function overlaps(aStart:string,aEnd:string,bStart:string,bEnd:string){return aStart<bEnd&&aEnd>bStart;}
function addMinutes(value:string,minutes:number){const [h,m]=value.split(":").map(Number);const total=Math.min(23*60+59,h*60+m+minutes);return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;}

export default function OwnerHomeroomScheduleEditor({accessToken}:{accessToken:string}){
 const [homerooms,setHomerooms]=useState<Homeroom[]>([]),[homeroomCode,setHomeroomCode]=useState(""),[sections,setSections]=useState<Section[]>([]),[blocks,setBlocks]=useState<Block[]>([]),[memberships,setMemberships]=useState<InstructorMembership[]>([]),[faculty,setFaculty]=useState<Faculty[]>([]),[rows,setRows]=useState<Row[]>(defaultRows()),[activeDay,setActiveDay]=useState(1),[notice,setNotice]=useState("Loading flexible weekly planner…"),[saving,setSaving]=useState(false);
 const facultyNames=useMemo(()=>new Map(faculty.map(row=>[row.id,row.display_name])),[faculty]);
 const instructorIdsBySection=useMemo(()=>{const map=new Map<string,string[]>();for(const row of memberships)map.set(row.section_id,[...(map.get(row.section_id)??[]),row.character_id]);return map;},[memberships]);
 const sectionFor=useCallback((courseCode:string)=>sections.find(section=>section.academic_courses?.code.toUpperCase()===courseCode.toUpperCase()),[sections]);
 const courses=useMemo(()=>{const map=new Map<string,Course>();for(const section of sections){const course=section.academic_courses;if(course&&!map.has(course.code))map.set(course.code,course);}return [...map.values()].sort((a,b)=>a.title.localeCompare(b.title));},[sections]);
 const courseMap=useMemo(()=>new Map(courses.map(course=>[course.code,course])),[courses]);
 const conflicts=useMemo(()=>{const map=new Map<string,string[]>();const others=blocks.filter(block=>block.notes==="owner_homeroom_daily_schedule"&&normalizedHomeroom(block.homeroom_label)!==homeroomCode.toUpperCase());for(const row of rows)for(const day of DAYS){const assignment=row.assignments[day.id]??"__OPEN__";if(!isClass(assignment))continue;const section=sectionFor(assignment);if(!section)continue;for(const other of others){if(other.weekday!==day.id||other.block_type!=="class_period"||!overlaps(row.startsAt,row.endsAt,cleanTime(other.starts_at),cleanTime(other.ends_at)))continue;const otherSection=sectionFor(other.title);if(!otherSection)continue;const issues:string[]=[];const shared=(instructorIdsBySection.get(section.id)??[]).filter(id=>(instructorIdsBySection.get(otherSection.id)??[]).includes(id));for(const id of shared)issues.push(`${facultyNames.get(id)??"Same instructor"} is also teaching ${other.homeroom_label??"another homeroom"}.`);const roomA=(section.room??"").trim().toLowerCase(),roomB=(otherSection.room??"").trim().toLowerCase();if(roomA&&roomB&&roomA===roomB)issues.push(`${section.room} is also assigned to ${other.homeroom_label??"another homeroom"}.`);if(issues.length)map.set(`${row.id}:${day.id}`,[...(map.get(`${row.id}:${day.id}`)??[]),...issues]);}}return map;},[blocks,homeroomCode,rows,sectionFor,instructorIdsBySection,facultyNames]);
 const selectedConflictCount=conflicts.size;

 const load=useCallback(async(targetCode?:string)=>{try{const [h,s,b,m,f]=await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/homerooms?select=id,code,school_year,is_active&is_active=eq.true&order=code.asc`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/class_sections?select=${encodeURIComponent("id,section_code,room,academic_courses(code,title)")}&order=created_at.asc`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/school_schedule_blocks?select=id,block_type,title,weekday,starts_at,ends_at,homeroom_label,notes&notes=eq.owner_homeroom_daily_schedule`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=section_id,character_id&relationship=eq.instructor`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/characters?select=id,display_name&role=eq.faculty`,{headers:headers(accessToken)})
 ]);if(!h.ok||!s.ok||!b.ok||!m.ok||!f.ok)throw new Error("The weekly classroom schedule could not be loaded.");const hs=await h.json() as Homeroom[],ss=await s.json() as Section[],bb=await b.json() as Block[];setHomerooms(hs);setSections(ss);setBlocks(bb);setMemberships(await m.json() as InstructorMembership[]);setFaculty(await f.json() as Faculty[]);const code=targetCode||hs[0]?.code||"";if(!code){setNotice("No active homerooms are available.");return;}setHomeroomCode(code);setRows(rowsFromBlocks(code,bb));setNotice(`Editing Homeroom ${code}. Add as many schedule rows as needed; rooms are optional for classes.`);}catch(error){setNotice(error instanceof Error?error.message:"Weekly schedule unavailable.");}},[accessToken]);
 useEffect(()=>{void load();},[load]);
 function changeHomeroom(code:string){setHomeroomCode(code);setRows(rowsFromBlocks(code,blocks));setNotice(`Editing Homeroom ${code}. Add classes, homeroom, lunch, breaks, study, closing/cleaning, clubs, assemblies, dismissal, or custom rows as needed.`);}
 function changeCell(rowId:string,day:number,value:string){setRows(current=>current.map(row=>row.id===rowId?{...row,assignments:{...row.assignments,[day]:value}}:row));}
 function updateRow(rowId:string,patch:Partial<Pick<Row,"label"|"startsAt"|"endsAt">>){setRows(current=>current.map(row=>row.id===rowId?{...row,...patch}:row).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)));}
 function addRow(){const previous=rows[rows.length-1],startsAt=previous?.endsAt??"08:00";setRows(current=>[...current,{id:makeId(),label:`Schedule ${current.length+1}`,startsAt,endsAt:addMinutes(startsAt,30),assignments:assignments()}]);}
 function removeRow(rowId:string){setRows(current=>current.filter(row=>row.id!==rowId));}
 function sectionDetails(assignment:string){if(!isClass(assignment))return "";const section=sectionFor(assignment);if(!section)return "Class details unavailable";const names=(instructorIdsBySection.get(section.id)??[]).map(id=>facultyNames.get(id)).filter(Boolean);return [names.length?names.join(", "):"Unstaffed",section.room?`Room ${section.room}`:"No room required"].join(" • ");}
 async function saveWeek(){if(!homeroomCode||saving)return;if(!rows.length){setNotice("Add at least one schedule row before saving.");return;}for(const row of rows){if(!row.label.trim()){setNotice("Every schedule row needs a label.");return;}if(!row.startsAt||!row.endsAt||row.endsAt<=row.startsAt){setNotice(`${row.label||"A schedule row"} has an invalid time range.`);return;}}if(selectedConflictCount){setNotice(`Resolve ${selectedConflictCount} scheduling conflict${selectedConflictCount===1?"":"s"} before publishing.`);return;}setSaving(true);setNotice(`Saving the full flexible week for Homeroom ${homeroomCode}…`);try{for(const day of DAYS){const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_set_homeroom_daily_schedule`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({requested_homeroom_code:homeroomCode,requested_weekday:day.id,requested_periods:rows.map(row=>({label:row.label,starts_at:row.startsAt,ends_at:row.endsAt,assignment:row.assignments[day.id]??"__OPEN__"}))})});if(!response.ok){let message=`${day.label} could not be saved.`;try{const body=await response.json() as {message?:string};if(body.message)message=body.message;}catch{}throw new Error(message);}}await load(homeroomCode);setNotice(`Homeroom ${homeroomCode}'s flexible Monday–Friday schedule is published.`);}catch(error){setNotice(error instanceof Error?error.message:"The weekly schedule could not be saved.");}finally{setSaving(false);}}

 return <section className={styles.panel} aria-labelledby="weekly-scheduler-title">
  <div className={styles.heading}><div><p className="eyebrow">OWNER • CLASSROOM CONTROL CENTER</p><h3 id="weekly-scheduler-title">Flexible Weekly Homeroom Scheduler</h3><p>Build each homeroom’s complete day without a fixed period limit. Add or remove rows, set the times, and assign shared classes or any school-day block. A class does not need a room unless you choose to assign one.</p></div><span className={styles.badge}>FLEXIBLE WEEK</span></div>
  <div className={styles.notice} aria-live="polite">{notice}</div>
  <div className={styles.topControls}><label>Homeroom<select value={homeroomCode} onChange={e=>changeHomeroom(e.target.value)}>{homerooms.map(room=><option key={room.id} value={room.code}>Homeroom {room.code} • {room.school_year}</option>)}</select></label><div className={selectedConflictCount?styles.conflictSummary:styles.clearSummary}><strong>{selectedConflictCount?`${selectedConflictCount} scheduling conflict${selectedConflictCount===1?"":"s"}`:"Schedule clear"}</strong><span>{selectedConflictCount?"Resolve highlighted cells before publishing.":`${rows.length} schedule row${rows.length===1?"":"s"} • ${courses.length} shared class${courses.length===1?"":"es"} available.`}</span></div></div>
  <section className={styles.weekSection}><div className={styles.sectionTitle}><div><strong>Homeroom {homeroomCode} • Monday–Friday</strong><span>There is no fixed period limit. Use Add schedule row whenever you need another class or school-day block.</span></div><button type="button" className={styles.addRowButton} onClick={addRow}>+ Add schedule row</button></div><div className={styles.tableWrap}><table className={styles.weekTable}><thead><tr><th>Schedule row</th>{DAYS.map(day=><th key={day.id}>{day.label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.id}><th className={styles.rowEditor}><input aria-label={`Label for schedule row ${index+1}`} value={row.label} onChange={e=>updateRow(row.id,{label:e.target.value})}/><div className={styles.timeRow}><input aria-label={`${row.label} start time`} type="time" value={row.startsAt} onChange={e=>updateRow(row.id,{startsAt:e.target.value})}/><span>–</span><input aria-label={`${row.label} end time`} type="time" value={row.endsAt} onChange={e=>updateRow(row.id,{endsAt:e.target.value})}/></div><button type="button" className={styles.removeRowButton} onClick={()=>removeRow(row.id)}>Remove row</button></th>{DAYS.map(day=>{const assignment=row.assignments[day.id]??"__OPEN__",issues=conflicts.get(`${row.id}:${day.id}`)??[];return <td key={day.id} className={issues.length?styles.conflictCell:""}><select aria-label={`${day.label} ${row.label}`} value={assignment} onChange={e=>changeCell(row.id,day.id,e.target.value)}>
   <option value="__OPEN__">Open</option>
   <option value="__HOMEROOM__">Homeroom</option>
   <option value="__BREAK__">Break</option>
   <option value="__LUNCH__">Lunch</option>
   <option value="__STUDY__">Study Period</option>
   <option value="__CLOSING_ADVISORY__">Closing / Cleaning / Advisory</option>
   <option value="__DISMISSAL__">Dismissal</option>
   <option value="__CLUB__">Clubs</option>
   <option value="__EXTRACURRICULAR__">Extracurriculars</option>
   <option value="__ASSEMBLY__">Assembly</option>
   <option value="__OTHER__">Other / Custom block</option>
   {courses.map(course=><option key={course.code} value={course.code}>{course.code} • {course.title}</option>)}
  </select>{isClass(assignment)&&<small>{sectionDetails(assignment)}</small>}{issues.map((issue,i)=><em key={i}>⚠ {issue}</em>)}</td>})}</tr>)}</tbody></table></div></section>
  <section className={styles.masterSection}><div className={styles.masterHeading}><div><strong>Day comparison</strong><span>Compare the selected day against the schedules already published for every homeroom.</span></div><div className={styles.dayTabs}>{DAYS.map(day=><button type="button" key={day.id} className={activeDay===day.id?styles.activeDay:""} onClick={()=>setActiveDay(day.id)}>{day.label.slice(0,3)}</button>)}</div></div><div className={styles.tableWrap}><table className={styles.masterTable}><thead><tr><th>Time</th>{homerooms.map(room=><th key={room.id} className={room.code===homeroomCode?styles.editingColumn:""}>Homeroom {room.code}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><th><strong>{row.label}</strong><span>{row.startsAt}–{row.endsAt}</span></th>{homerooms.map(room=>{if(room.code===homeroomCode){const assignment=row.assignments[activeDay]??"__OPEN__";return <td key={room.id}><strong>{shortLabel(assignment,courseMap)}</strong>{isClass(assignment)&&<small>{sectionDetails(assignment)}</small>}</td>;}const other=blocks.find(block=>block.notes==="owner_homeroom_daily_schedule"&&normalizedHomeroom(block.homeroom_label)===room.code.toUpperCase()&&block.weekday===activeDay&&overlaps(row.startsAt,row.endsAt,cleanTime(block.starts_at),cleanTime(block.ends_at)));return <td key={room.id}><strong>{other?shortLabel(assignmentFor(other),courseMap):"Open"}</strong>{other?.block_type==="class_period"&&<small>{sectionDetails(other.title)}</small>}</td>;})}</tr>)}</tbody></table></div></section>
  <div className={styles.actions}><button type="button" onClick={saveWeek} disabled={saving||!homeroomCode||selectedConflictCount>0}>{saving?"Saving full week…":"Save Full Week"}</button></div>
  <div className={styles.help}><strong>Flexible schedule model:</strong> Every existing school-day block is available here: homeroom, class periods, break, lunch, closing/cleaning/advisory, dismissal, clubs, study, extracurriculars, assemblies, and custom blocks. Add as many rows as needed. Only assigned teachers and actual assigned rooms participate in conflict checks.</div>
 </section>;
}
