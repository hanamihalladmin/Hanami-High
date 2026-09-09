import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatSchoolTime, hanamiRoleplayWeekday } from '../lib/roleplayDate'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AcademicCourse, AcademicEnrollment, AcademicMeeting, AcademicSection, AcademicSectionStaff, SchoolScheduleBlock } from '../types/database-academics'

type TimelineItem={key:string;weekday:number;starts_at:string;ends_at:string;label:string;title:string;meta:string;kind:'class'|'homeroom'|'lunch'|'arrival'|'cleaning'|'club'|'passing'|'school'}
const weekdays=['','Monday','Tuesday','Wednesday','Thursday','Friday']
const passingWindows=[['09:40:00','09:50:00'],['10:40:00','10:50:00'],['11:40:00','11:50:00'],['14:15:00','14:25:00']] as const

function routeIsSchedule(){return window.location.hash.startsWith('#/academics/my-schedule')}
function schoolwide(block:SchoolScheduleBlock){const label=(block.homeroom_label??'').trim().toLowerCase();return !label||['all homerooms','school wide','school-wide','all'].includes(label)}
function sharedTitle(block:SchoolScheduleBlock){switch(block.title){case'Asa-no-kai':return'Morning Homeroom · Asa-no-kai';case'Kaeri-no-kai':return'Afternoon Homeroom · Kaeri-no-kai';case'Soji':return'Classroom Cleaning · Soji';case'Bukatsu':return'Club Activities · Bukatsu';default:return block.title}}
function sharedKind(block:SchoolScheduleBlock):TimelineItem['kind']{if(block.block_type==='homeroom')return'homeroom';if(block.block_type==='lunch')return'lunch';if(block.block_type==='club')return'club';if(block.title==='Arrival'||block.title==='Shoe Change')return'arrival';if(block.title==='Soji'||block.block_type==='closing_advisory')return'cleaning';return'school'}
function clock(value:string){return value.slice(0,5)}

export function SchoolScheduleTimelinePortal(){
 const {activeCharacter,capabilities}=useIdentity()
 const [active,setActive]=useState(routeIsSchedule)
 const [host,setHost]=useState<HTMLElement|null>(null)
 const [courses,setCourses]=useState<AcademicCourse[]>([])
 const [sections,setSections]=useState<AcademicSection[]>([])
 const [enrollments,setEnrollments]=useState<AcademicEnrollment[]>([])
 const [staff,setStaff]=useState<AcademicSectionStaff[]>([])
 const [meetings,setMeetings]=useState<AcademicMeeting[]>([])
 const [blocks,setBlocks]=useState<SchoolScheduleBlock[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState<string|null>(null)

 useEffect(()=>{const sync=()=>setActive(routeIsSchedule());window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])

 useEffect(()=>{
  if(!active){setHost(null);return}
  let currentHost:HTMLElement|null=null
  const attach=()=>{
   const panel=document.querySelector('.academics-page .schedule-panel, .schedule-panel') as HTMLElement|null
   if(!panel)return
   panel.classList.add('schedule-v1-shared-enhanced')
   currentHost=panel.querySelector('.shared-school-schedule-host') as HTMLElement|null
   if(!currentHost){currentHost=document.createElement('div');currentHost.className='shared-school-schedule-host';panel.appendChild(currentHost)}
   setHost(currentHost)
  }
  attach()
  const observer=new MutationObserver(attach);observer.observe(document.getElementById('root')??document.body,{childList:true,subtree:true})
  return()=>{observer.disconnect();const panel=currentHost?.closest('.schedule-panel');panel?.classList.remove('schedule-v1-shared-enhanced');currentHost?.remove();setHost(null)}
 },[active])

 const load=useCallback(async()=>{
  const client=supabase;if(!client||!activeCharacter||!active)return
  setLoading(true);setError(null)
  const [courseResult,sectionResult,enrollmentResult,staffResult,meetingResult,blockResult]=await Promise.all([
   client.from('academic_courses').select('*').order('code'),
   client.from('academic_sections').select('*').eq('is_active',true).order('section_code'),
   client.from('academic_enrollments').select('*').eq('student_character_id',activeCharacter.id).eq('status','active'),
   client.from('academic_section_staff').select('*').eq('character_id',activeCharacter.id),
   client.from('academic_meetings').select('*').order('weekday').order('period_no'),
   client.from('school_schedule_blocks').select('*').order('weekday').order('starts_at'),
  ])
  setLoading(false)
  const first=[courseResult.error,sectionResult.error,enrollmentResult.error,staffResult.error,meetingResult.error,blockResult.error].find(Boolean)
  if(first){setError(first.message);return}
  setCourses(courseResult.data??[]);setSections(sectionResult.data??[]);setEnrollments(enrollmentResult.data??[]);setStaff(staffResult.data??[]);setMeetings(meetingResult.data??[]);setBlocks(blockResult.data??[])
 },[active,activeCharacter])
 useEffect(()=>{void load()},[load])

 const courseById=useMemo(()=>new Map(courses.map(course=>[course.id,course])),[courses])
 const sectionById=useMemo(()=>new Map(sections.map(section=>[section.id,section])),[sections])
 const visibleSectionIds=useMemo(()=>{
  const ids=new Set<string>([...enrollments.map(row=>row.section_id),...staff.map(row=>row.section_id)])
  if(!ids.size&&capabilities.includes('school.configure'))sections.forEach(section=>ids.add(section.id))
  return ids
 },[capabilities,enrollments,sections,staff])
 const todayWeekday=hanamiRoleplayWeekday()

 const days=useMemo(()=>[1,2,3,4,5].map(day=>{
  const shared:TimelineItem[]=blocks.filter(block=>block.weekday===day&&block.block_type!=='class_period'&&block.notes!=='owner_homeroom_daily_schedule'&&schoolwide(block)).map(block=>({key:`shared-${block.id}`,weekday:day,starts_at:block.starts_at,ends_at:block.ends_at,label:'SCHOOL DAY',title:sharedTitle(block),meta:block.block_type.replaceAll('_',' '),kind:sharedKind(block)}))
  const classes:TimelineItem[]=meetings.filter(meeting=>meeting.weekday===day&&visibleSectionIds.has(meeting.section_id)).map(meeting=>{const section=sectionById.get(meeting.section_id);const course=section?courseById.get(section.course_id):null;return {key:`class-${meeting.id}`,weekday:day,starts_at:meeting.starts_at,ends_at:meeting.ends_at,label:`PERIOD ${meeting.period_no}`,title:course?`${course.code} · ${course.name}`:section?.section_code||'Hanami Class',meta:meeting.room||section?.room?`Room ${meeting.room||section?.room}`:'Room TBA',kind:'class'}})
  const passing:TimelineItem[]=passingWindows.map(([starts_at,ends_at],index)=>({key:`passing-${day}-${index}`,weekday:day,starts_at,ends_at,label:'PASSING',title:'Passing Time',meta:'10 minutes between class periods',kind:'passing'}))
  const timeline=[...shared,...classes,...passing].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)||a.ends_at.localeCompare(b.ends_at)||a.label.localeCompare(b.label))
  return {day,timeline}
 }),[blocks,courseById,meetings,sectionById,visibleSectionIds])

 if(!active||!host)return null
 return createPortal(<section className="shared-school-schedule" aria-label="Weekly schedule including shared school-day blocks">
  <div className="shared-schedule-legend"><span><i className="legend-class"/>Class period</span><span><i className="legend-shared"/>Shared school-day block</span><span><i className="legend-passing"/>Passing time</span><strong>V1 school-day structure restored</strong></div>
  {error?<div className="academic-empty">Shared school-day blocks could not be loaded: {error}</div>:loading?<div className="academic-empty">Loading complete school-day timetable…</div>:<div className="shared-schedule-week">{days.map(({day,timeline})=><article className={`shared-schedule-day ${day===todayWeekday?'today':''}`} key={day}><header><strong>{weekdays[day]}</strong><span>{timeline.length} blocks</span></header><div className="shared-schedule-timeline">{timeline.map(item=><div className={`shared-schedule-slot kind-${item.kind}`} key={item.key}><div className="shared-slot-top"><span>{item.label}</span><time>{formatSchoolTime(item.starts_at)}–{formatSchoolTime(item.ends_at)}</time></div><strong>{item.title}</strong><small>{item.kind==='class'?item.meta:item.meta==='homeroom'?'Shared homeroom block':item.meta}</small></div>)}</div></article>)}</div>}
 </section>,host)
}
