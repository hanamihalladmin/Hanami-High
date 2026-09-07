import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

type Tab = 'homerooms' | 'classes' | 'clubs' | 'events' | 'announcements' | 'maintenance'
type CharacterRow = { id:string; display_name:string|null; first_name:string|null; last_name:string|null; handle:string|null; character_kind:string; school_role:string|null }
type CourseRow = { id:string; code:string; name:string }
type SectionRow = { id:string; course_id:string; section_code:string; room:string|null; capacity:number; term:string; school_year:number }
type HomeroomRow = { id:string; code:string; room_label:string|null; description:string|null; advisor_character_id:string|null; is_active:boolean }
type EnrollmentRow = { section_id:string; student_character_id:string; status:string }
type StaffRow = { section_id:string; character_id:string; staff_role:string }
type HomeroomMembershipRow = { homeroom_id:string; student_character_id:string; student_year:number }
type GroupRow = { id:string; slug:string; name:string; group_type:string; advisor_character_id:string|null; status:string; meeting_room:string|null }
type GroupMemberRow = { group_id:string; character_id:string; member_role:string; status:string }
type EventRow = { id:string; title:string; school_date:string; starts_at:string|null; location:string|null; status:string; event_type:string }
type AnnouncementRow = { id:string; title:string; category:string; state:string; pinned:boolean; school_date:string|null }
type ConfigurationRow = { key:string; value:Record<string,unknown>; description:string; updated_at:string }

const tabs: Array<{id:Tab;label:string}> = [
  {id:'homerooms',label:'Homerooms'}, {id:'classes',label:'Classes'}, {id:'clubs',label:'Clubs & Council'},
  {id:'events',label:'Events'}, {id:'announcements',label:'Announcements'}, {id:'maintenance',label:'Maintenance'},
]

function nameOf(character: CharacterRow) {
  return character.display_name || [character.first_name,character.last_name].filter(Boolean).join(' ') || character.handle || 'Hanami Member'
}
function slugify(value:string) { return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || `group-${Date.now()}` }
function jsonText(value:Record<string,unknown>) { try { return JSON.stringify(value,null,2) } catch { return '{}' } }

export function SchoolAdministrationPanel() {
  const { account, capabilities } = useIdentity()
  const [tab,setTab] = useState<Tab>('homerooms')
  const [students,setStudents] = useState<CharacterRow[]>([])
  const [teachers,setTeachers] = useState<CharacterRow[]>([])
  const [courses,setCourses] = useState<CourseRow[]>([])
  const [sections,setSections] = useState<SectionRow[]>([])
  const [homerooms,setHomerooms] = useState<HomeroomRow[]>([])
  const [enrollments,setEnrollments] = useState<EnrollmentRow[]>([])
  const [staff,setStaff] = useState<StaffRow[]>([])
  const [homeroomMemberships,setHomeroomMemberships] = useState<HomeroomMembershipRow[]>([])
  const [groups,setGroups] = useState<GroupRow[]>([])
  const [groupMembers,setGroupMembers] = useState<GroupMemberRow[]>([])
  const [events,setEvents] = useState<EventRow[]>([])
  const [announcements,setAnnouncements] = useState<AnnouncementRow[]>([])
  const [configuration,setConfiguration] = useState<ConfigurationRow[]>([])
  const [configDrafts,setConfigDrafts] = useState<Record<string,string>>({})
  const [loading,setLoading] = useState(true)
  const [working,setWorking] = useState<string|null>(null)
  const [error,setError] = useState<string|null>(null)
  const [notice,setNotice] = useState<string|null>(null)

  const [homeroomAssign,setHomeroomAssign] = useState({ homeroomId:'', studentId:'', studentYear:'1' })
  const [homeroomCreate,setHomeroomCreate] = useState({ code:'', room:'', description:'Mixed 1st-year and 2nd-year homeroom.' })
  const [classAssign,setClassAssign] = useState({ sectionId:'', studentId:'', teacherId:'' })
  const [classCreate,setClassCreate] = useState({ courseId:'', sectionCode:'', room:'', capacity:'30' })
  const [clubAssign,setClubAssign] = useState({ groupId:'', characterId:'', memberRole:'member', advisorId:'' })
  const [clubCreate,setClubCreate] = useState({ name:'', groupType:'club', room:'', description:'' })
  const [eventDraft,setEventDraft] = useState({ title:'', description:'', eventType:'school', schoolDate:'2006-04-07', startsAt:'', endsAt:'', location:'', status:'published' })
  const [announcementDraft,setAnnouncementDraft] = useState({ title:'', body:'', category:'general', schoolDate:'2006-04-07', state:'published', pinned:false })

  const canSchool = capabilities.includes('school.configure')
  const canSystem = capabilities.includes('system.configure')

  const load = useCallback(async () => {
    if (!supabase || !canSchool) return
    const client:any = supabase
    setLoading(true); setError(null)
    const results = await Promise.all([
      client.from('characters').select('id,display_name,first_name,last_name,handle,character_kind,school_role').eq('character_state','active').order('display_name'),
      client.from('academic_courses').select('id,code,name').eq('is_active',true).order('code'),
      client.from('academic_sections').select('id,course_id,section_code,room,capacity,term,school_year').eq('is_active',true).order('section_code'),
      client.from('academic_enrollments').select('section_id,student_character_id,status').eq('status','active'),
      client.from('academic_section_staff').select('section_id,character_id,staff_role'),
      client.from('school_homerooms').select('id,code,room_label,description,advisor_character_id,is_active').order('code'),
      client.from('homeroom_memberships').select('homeroom_id,student_character_id,student_year'),
      client.from('campus_groups').select('id,slug,name,group_type,advisor_character_id,status,meeting_room').order('name'),
      client.from('campus_group_members').select('group_id,character_id,member_role,status').eq('status','active'),
      client.from('campus_events').select('id,title,school_date,starts_at,location,status,event_type').order('school_date',{ascending:false}).limit(100),
      client.from('school_announcements').select('id,title,category,state,pinned,school_date').order('created_at',{ascending:false}).limit(100),
      canSystem ? client.from('site_configuration').select('key,value,description,updated_at').order('key') : Promise.resolve({data:[],error:null}),
    ])
    setLoading(false)
    const firstError = results.map((result:any)=>result.error).find(Boolean)
    if (firstError) { setError(firstError.message); return }
    const characters = results[0].data ?? []
    const nextStudents = characters.filter((row:CharacterRow)=>row.character_kind==='student' && (row.school_role==='student'||row.school_role==='new_student'))
    const nextTeachers = characters.filter((row:CharacterRow)=>row.character_kind==='faculty' || row.school_role==='faculty')
    setStudents(nextStudents); setTeachers(nextTeachers); setCourses(results[1].data??[]); setSections(results[2].data??[])
    setEnrollments(results[3].data??[]); setStaff(results[4].data??[]); setHomerooms(results[5].data??[]); setHomeroomMemberships(results[6].data??[])
    setGroups(results[7].data??[]); setGroupMembers(results[8].data??[]); setEvents(results[9].data??[]); setAnnouncements(results[10].data??[])
    const nextConfiguration = results[11].data ?? []
    setConfiguration(nextConfiguration); setConfigDrafts(Object.fromEntries(nextConfiguration.map((row:ConfigurationRow)=>[row.key,jsonText(row.value)])))
    setHomeroomAssign((current)=>({ ...current, homeroomId:current.homeroomId||results[5].data?.[0]?.id||'', studentId:current.studentId||nextStudents[0]?.id||'' }))
    setClassAssign((current)=>({ ...current, sectionId:current.sectionId||results[2].data?.[0]?.id||'', studentId:current.studentId||nextStudents[0]?.id||'', teacherId:current.teacherId||nextTeachers[0]?.id||'' }))
    setClassCreate((current)=>({ ...current, courseId:current.courseId||results[1].data?.[0]?.id||'' }))
    setClubAssign((current)=>({ ...current, groupId:current.groupId||results[7].data?.[0]?.id||'', characterId:current.characterId||nextStudents[0]?.id||'', advisorId:current.advisorId||nextTeachers[0]?.id||'' }))
  },[canSchool,canSystem])
  useEffect(()=>{void load()},[load])

  const characterById = useMemo(()=>new Map([...students,...teachers].map((row)=>[row.id,row])),[students,teachers])
  const courseById = useMemo(()=>new Map(courses.map((row)=>[row.id,row])),[courses])

  async function run(key:string, action:()=>Promise<{error:{message:string}|null}>, success:string) {
    setWorking(key); setError(null); setNotice(null)
    const result = await action(); setWorking(null)
    if (result.error) { setError(result.error.message); return }
    setNotice(success); await load()
  }

  async function assignHomeroom() {
    if (!supabase || !homeroomAssign.homeroomId || !homeroomAssign.studentId) return
    const client:any=supabase
    await run('homeroom-assign',async()=>client.from('homeroom_memberships').upsert({homeroom_id:homeroomAssign.homeroomId,student_character_id:homeroomAssign.studentId,student_year:Number(homeroomAssign.studentYear),updated_at:new Date().toISOString()},{onConflict:'student_character_id'}),'Homeroom assignment saved.')
  }
  async function removeHomeroom(studentId:string) { if(!supabase)return; const client:any=supabase; await run(`homeroom-remove:${studentId}`,async()=>client.from('homeroom_memberships').delete().eq('student_character_id',studentId),'Homeroom assignment removed.') }
  async function setHomeroomAdvisor(homeroomId:string,teacherId:string|null) { if(!supabase)return; const client:any=supabase; await run(`homeroom-advisor:${homeroomId}`,async()=>client.from('school_homerooms').update({advisor_character_id:teacherId}).eq('id',homeroomId),'Homeroom adviser updated.') }
  async function createHomeroom() { if(!supabase||!homeroomCreate.code.trim())return; const client:any=supabase; await run('homeroom-create',async()=>client.from('school_homerooms').insert({code:homeroomCreate.code.trim().toUpperCase(),school_year:2006,room_label:homeroomCreate.room.trim()||null,description:homeroomCreate.description.trim()||null,is_active:true}),'Homeroom created.'); setHomeroomCreate({code:'',room:'',description:'Mixed 1st-year and 2nd-year homeroom.'}) }

  async function assignStudentClass() { if(!supabase||!classAssign.sectionId||!classAssign.studentId)return; const client:any=supabase; await run('class-student',async()=>client.from('academic_enrollments').upsert({section_id:classAssign.sectionId,student_character_id:classAssign.studentId,status:'active',updated_at:new Date().toISOString()},{onConflict:'section_id,student_character_id'}),'Student added to class.') }
  async function assignTeacherClass() { if(!supabase||!classAssign.sectionId||!classAssign.teacherId)return; const client:any=supabase; await run('class-teacher',async()=>client.from('academic_section_staff').upsert({section_id:classAssign.sectionId,character_id:classAssign.teacherId,staff_role:'teacher'},{onConflict:'section_id,character_id'}),'Teacher assigned to class.') }
  async function removeEnrollment(sectionId:string,studentId:string) { if(!supabase)return; const client:any=supabase; await run(`enroll-remove:${sectionId}:${studentId}`,async()=>client.from('academic_enrollments').delete().eq('section_id',sectionId).eq('student_character_id',studentId),'Student removed from class.') }
  async function removeStaff(sectionId:string,teacherId:string) { if(!supabase)return; const client:any=supabase; await run(`staff-remove:${sectionId}:${teacherId}`,async()=>client.from('academic_section_staff').delete().eq('section_id',sectionId).eq('character_id',teacherId),'Teacher removed from class.') }
  async function createClass() { if(!supabase||!classCreate.courseId||!classCreate.sectionCode.trim())return; const client:any=supabase; await run('class-create',async()=>client.from('academic_sections').insert({course_id:classCreate.courseId,section_code:classCreate.sectionCode.trim().toUpperCase(),school_year:2006,term:'full_year',room:classCreate.room.trim()||null,capacity:Math.max(1,Math.min(60,Number(classCreate.capacity)||30)),is_active:true}),'Class section created.'); setClassCreate((current)=>({...current,sectionCode:'',room:'',capacity:'30'})) }

  async function createClub() { if(!supabase||!account||!clubCreate.name.trim())return; const client:any=supabase; const slug=slugify(clubCreate.name); await run('club-create',async()=>client.from('campus_groups').insert({slug,name:clubCreate.name.trim(),group_type:clubCreate.groupType,description:clubCreate.description.trim()||null,status:'active',open_membership:clubCreate.groupType!=='student_council',meeting_room:clubCreate.room.trim()||null,created_by_character_id:null,created_by_account_id:account.id}),'Campus group created.'); setClubCreate({name:'',groupType:'club',room:'',description:''}) }
  async function addClubMember() { if(!supabase||!clubAssign.groupId||!clubAssign.characterId)return; const client:any=supabase; await run('club-member',async()=>client.from('campus_group_members').upsert({group_id:clubAssign.groupId,character_id:clubAssign.characterId,member_role:clubAssign.memberRole,status:'active',updated_at:new Date().toISOString()},{onConflict:'group_id,character_id'}),'Club membership saved.') }
  async function removeClubMember(groupId:string,characterId:string){ if(!supabase)return; const client:any=supabase; await run(`club-remove:${groupId}:${characterId}`,async()=>client.from('campus_group_members').delete().eq('group_id',groupId).eq('character_id',characterId),'Club member removed.') }
  async function setClubAdvisor(groupId:string,teacherId:string|null){ if(!supabase)return; const client:any=supabase; await run(`club-advisor:${groupId}`,async()=>client.from('campus_groups').update({advisor_character_id:teacherId}).eq('id',groupId),'Club adviser updated.') }

  async function createEvent(){ if(!supabase||!account||!eventDraft.title.trim())return; const client:any=supabase; await run('event-create',async()=>client.from('campus_events').insert({title:eventDraft.title.trim(),description:eventDraft.description.trim()||null,event_type:eventDraft.eventType,school_date:eventDraft.schoolDate,starts_at:eventDraft.startsAt||null,ends_at:eventDraft.endsAt||null,location:eventDraft.location.trim()||null,status:eventDraft.status,created_by_character_id:null,created_by_account_id:account.id}),'Event saved.'); setEventDraft((current)=>({...current,title:'',description:'',startsAt:'',endsAt:'',location:''})) }
  async function setEventState(id:string,status:string){ if(!supabase)return; const client:any=supabase; await run(`event-state:${id}`,async()=>client.from('campus_events').update({status}).eq('id',id),'Event state updated.') }

  async function createAnnouncement(){ if(!supabase||!account||!announcementDraft.title.trim()||!announcementDraft.body.trim())return; const client:any=supabase; await run('announcement-create',async()=>client.from('school_announcements').insert({title:announcementDraft.title.trim(),body:announcementDraft.body.trim(),category:announcementDraft.category,state:announcementDraft.state,pinned:announcementDraft.pinned,school_date:announcementDraft.schoolDate||null,created_by_character_id:null,created_by_account_id:account.id}),'Announcement saved.'); setAnnouncementDraft((current)=>({...current,title:'',body:'',pinned:false})) }
  async function setAnnouncementState(id:string,state:string){ if(!supabase)return; const client:any=supabase; await run(`announcement-state:${id}`,async()=>client.from('school_announcements').update({state}).eq('id',id),'Announcement state updated.') }

  async function saveConfig(row:ConfigurationRow){ if(!supabase||!account)return; const client:any=supabase; let value:Record<string,unknown>; try{const parsed=JSON.parse(configDrafts[row.key]||'{}'); if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw new Error('Configuration must be a JSON object.'); value=parsed}catch(next){setError(next instanceof Error?next.message:'Invalid JSON.');return} await run(`config:${row.key}`,async()=>client.from('site_configuration').update({value,updated_by_account_id:account.id,updated_at:new Date().toISOString()}).eq('key',row.key),`${row.key.replaceAll('_',' ')} updated.`) }

  if (!canSchool) return <div className="identity-notice error">This account does not have school.configure permission.</div>

  const renderHomerooms=()=> <div className="school-admin-stack">
    <section className="school-admin-panel"><header><div><span className="eyebrow">ASSIGNMENT</span><h2>Place a student in a homeroom</h2></div></header><div className="school-admin-form row"><select value={homeroomAssign.homeroomId} onChange={e=>setHomeroomAssign({...homeroomAssign,homeroomId:e.target.value})}>{homerooms.map(h=><option key={h.id} value={h.id}>Homeroom {h.code} · {h.room_label||'Room TBD'}</option>)}</select><select value={homeroomAssign.studentId} onChange={e=>setHomeroomAssign({...homeroomAssign,studentId:e.target.value})}>{students.map(s=><option key={s.id} value={s.id}>{nameOf(s)}</option>)}</select><select value={homeroomAssign.studentYear} onChange={e=>setHomeroomAssign({...homeroomAssign,studentYear:e.target.value})}><option value="1">1st year</option><option value="2">2nd year</option></select><button className="primary-action" disabled={working==='homeroom-assign'} onClick={()=>void assignHomeroom()}>Assign</button></div></section>
    <section className="school-admin-panel"><header><div><span className="eyebrow">HOMEROOMS</span><h2>Current rooms</h2></div><strong>{homerooms.length}</strong></header>{homerooms.map(h=><article className="school-admin-room" key={h.id}><div><strong>Homeroom {h.code}</strong><span>{h.room_label||'Room TBD'}</span><small>{h.description}</small></div><label>Adviser<select value={h.advisor_character_id||''} onChange={e=>void setHomeroomAdvisor(h.id,e.target.value||null)}><option value="">Unassigned</option>{teachers.map(t=><option key={t.id} value={t.id}>{nameOf(t)}</option>)}</select></label><div className="school-admin-members">{homeroomMemberships.filter(m=>m.homeroom_id===h.id).map(m=><span key={m.student_character_id}>{nameOf(characterById.get(m.student_character_id) as CharacterRow)} <button onClick={()=>void removeHomeroom(m.student_character_id)}>×</button></span>)}</div></article>)}</section>
    <section className="school-admin-panel"><header><div><span className="eyebrow">CREATE</span><h2>New homeroom</h2></div></header><div className="school-admin-form"><input placeholder="Code, e.g. D" value={homeroomCreate.code} onChange={e=>setHomeroomCreate({...homeroomCreate,code:e.target.value})}/><input placeholder="Room label" value={homeroomCreate.room} onChange={e=>setHomeroomCreate({...homeroomCreate,room:e.target.value})}/><textarea value={homeroomCreate.description} onChange={e=>setHomeroomCreate({...homeroomCreate,description:e.target.value})}/><button className="primary-action" onClick={()=>void createHomeroom()}>Create homeroom</button></div></section>
  </div>

  const renderClasses=()=> <div className="school-admin-stack"><section className="school-admin-panel"><header><div><span className="eyebrow">ROSTERS</span><h2>Assign students & teachers</h2></div></header><div className="school-admin-form row"><select value={classAssign.sectionId} onChange={e=>setClassAssign({...classAssign,sectionId:e.target.value})}>{sections.map(s=><option key={s.id} value={s.id}>{s.section_code} · {courseById.get(s.course_id)?.name||'Course'}</option>)}</select><select value={classAssign.studentId} onChange={e=>setClassAssign({...classAssign,studentId:e.target.value})}>{students.map(s=><option key={s.id} value={s.id}>{nameOf(s)}</option>)}</select><button onClick={()=>void assignStudentClass()}>Add student</button><select value={classAssign.teacherId} onChange={e=>setClassAssign({...classAssign,teacherId:e.target.value})}>{teachers.map(t=><option key={t.id} value={t.id}>{nameOf(t)}</option>)}</select><button onClick={()=>void assignTeacherClass()}>Assign teacher</button></div></section><section className="school-admin-class-grid">{sections.map(s=><article className="school-admin-panel" key={s.id}><header><div><span className="eyebrow">{courseById.get(s.course_id)?.code}</span><h2>{s.section_code} · {courseById.get(s.course_id)?.name}</h2></div><small>{s.room||'Room TBD'}</small></header><div className="school-admin-roster"><strong>Teachers</strong>{staff.filter(x=>x.section_id===s.id).map(x=><span key={x.character_id}>{nameOf(characterById.get(x.character_id) as CharacterRow)} <button onClick={()=>void removeStaff(s.id,x.character_id)}>×</button></span>)}<strong>Students ({enrollments.filter(x=>x.section_id===s.id).length}/{s.capacity})</strong>{enrollments.filter(x=>x.section_id===s.id).map(x=><span key={x.student_character_id}>{nameOf(characterById.get(x.student_character_id) as CharacterRow)} <button onClick={()=>void removeEnrollment(s.id,x.student_character_id)}>×</button></span>)}</div></article>)}</section><section className="school-admin-panel"><header><div><span className="eyebrow">CREATE</span><h2>New class section</h2></div></header><div className="school-admin-form row"><select value={classCreate.courseId} onChange={e=>setClassCreate({...classCreate,courseId:e.target.value})}>{courses.map(c=><option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select><input placeholder="Section code" value={classCreate.sectionCode} onChange={e=>setClassCreate({...classCreate,sectionCode:e.target.value})}/><input placeholder="Room" value={classCreate.room} onChange={e=>setClassCreate({...classCreate,room:e.target.value})}/><input type="number" min="1" max="60" value={classCreate.capacity} onChange={e=>setClassCreate({...classCreate,capacity:e.target.value})}/><button className="primary-action" onClick={()=>void createClass()}>Create class</button></div></section></div>

  const renderClubs=()=> <div className="school-admin-stack"><section className="school-admin-panel"><header><div><span className="eyebrow">MEMBERSHIP</span><h2>Assign club members</h2></div></header><div className="school-admin-form row"><select value={clubAssign.groupId} onChange={e=>setClubAssign({...clubAssign,groupId:e.target.value})}>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={clubAssign.characterId} onChange={e=>setClubAssign({...clubAssign,characterId:e.target.value})}>{students.map(s=><option key={s.id} value={s.id}>{nameOf(s)}</option>)}</select><select value={clubAssign.memberRole} onChange={e=>setClubAssign({...clubAssign,memberRole:e.target.value})}><option value="member">Member</option><option value="officer">Officer</option><option value="president">President</option></select><button onClick={()=>void addClubMember()}>Save membership</button></div></section>{groups.map(g=><section className="school-admin-panel" key={g.id}><header><div><span className="eyebrow">{g.group_type.replaceAll('_',' ')}</span><h2>{g.name}</h2></div><span>{g.status}</span></header><div className="school-admin-form row"><label>Adviser<select value={g.advisor_character_id||''} onChange={e=>void setClubAdvisor(g.id,e.target.value||null)}><option value="">Unassigned</option>{teachers.map(t=><option key={t.id} value={t.id}>{nameOf(t)}</option>)}</select></label></div><div className="school-admin-members">{groupMembers.filter(m=>m.group_id===g.id).map(m=><span key={m.character_id}>{nameOf(characterById.get(m.character_id) as CharacterRow)} · {m.member_role} <button onClick={()=>void removeClubMember(g.id,m.character_id)}>×</button></span>)}</div></section>)}<section className="school-admin-panel"><header><div><span className="eyebrow">CREATE</span><h2>New club or council group</h2></div></header><div className="school-admin-form"><input placeholder="Name" value={clubCreate.name} onChange={e=>setClubCreate({...clubCreate,name:e.target.value})}/><select value={clubCreate.groupType} onChange={e=>setClubCreate({...clubCreate,groupType:e.target.value})}><option value="club">Club</option><option value="organization">Organization</option><option value="student_council">Student Council</option></select><input placeholder="Meeting room" value={clubCreate.room} onChange={e=>setClubCreate({...clubCreate,room:e.target.value})}/><textarea placeholder="Description" value={clubCreate.description} onChange={e=>setClubCreate({...clubCreate,description:e.target.value})}/><button className="primary-action" onClick={()=>void createClub()}>Create group</button></div></section></div>

  const renderEvents=()=> <div className="school-admin-stack"><section className="school-admin-panel"><header><div><span className="eyebrow">CALENDAR</span><h2>Post an event</h2></div></header><div className="school-admin-form"><input placeholder="Event title" value={eventDraft.title} onChange={e=>setEventDraft({...eventDraft,title:e.target.value})}/><textarea placeholder="Description" value={eventDraft.description} onChange={e=>setEventDraft({...eventDraft,description:e.target.value})}/><div className="school-admin-form row"><select value={eventDraft.eventType} onChange={e=>setEventDraft({...eventDraft,eventType:e.target.value})}><option value="school">School</option><option value="community">Community</option><option value="club">Club</option><option value="organization">Organization</option><option value="student_council">Student Council</option></select><input type="date" value={eventDraft.schoolDate} min="2006-01-01" max="2006-12-31" onChange={e=>setEventDraft({...eventDraft,schoolDate:e.target.value})}/><input type="time" value={eventDraft.startsAt} onChange={e=>setEventDraft({...eventDraft,startsAt:e.target.value})}/><input type="time" value={eventDraft.endsAt} onChange={e=>setEventDraft({...eventDraft,endsAt:e.target.value})}/><input placeholder="Location" value={eventDraft.location} onChange={e=>setEventDraft({...eventDraft,location:e.target.value})}/><select value={eventDraft.status} onChange={e=>setEventDraft({...eventDraft,status:e.target.value})}><option value="draft">Draft</option><option value="published">Published</option></select></div><button className="primary-action" onClick={()=>void createEvent()}>Save event</button></div></section><section className="school-admin-panel"><header><div><span className="eyebrow">EVENTS</span><h2>School calendar</h2></div><strong>{events.length}</strong></header>{events.map(e=><article className="school-admin-list-row" key={e.id}><div><strong>{e.title}</strong><span>{e.school_date} · {e.location||'Location TBD'}</span></div><select value={e.status} onChange={x=>void setEventState(e.id,x.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></article>)}</section></div>

  const renderAnnouncements=()=> <div className="school-admin-stack"><section className="school-admin-panel"><header><div><span className="eyebrow">SCHOOL NEWS</span><h2>Post an announcement</h2></div></header><div className="school-admin-form"><input placeholder="Announcement title" value={announcementDraft.title} onChange={e=>setAnnouncementDraft({...announcementDraft,title:e.target.value})}/><textarea placeholder="Announcement body" value={announcementDraft.body} onChange={e=>setAnnouncementDraft({...announcementDraft,body:e.target.value})}/><div className="school-admin-form row"><select value={announcementDraft.category} onChange={e=>setAnnouncementDraft({...announcementDraft,category:e.target.value})}><option value="general">General</option><option value="academic">Academic</option><option value="campus">Campus</option><option value="urgent">Urgent</option><option value="event">Event</option></select><input type="date" min="2006-01-01" max="2006-12-31" value={announcementDraft.schoolDate} onChange={e=>setAnnouncementDraft({...announcementDraft,schoolDate:e.target.value})}/><select value={announcementDraft.state} onChange={e=>setAnnouncementDraft({...announcementDraft,state:e.target.value})}><option value="draft">Draft</option><option value="published">Published</option></select><label><input type="checkbox" checked={announcementDraft.pinned} onChange={e=>setAnnouncementDraft({...announcementDraft,pinned:e.target.checked})}/> Pin</label></div><button className="primary-action" onClick={()=>void createAnnouncement()}>Save announcement</button></div></section><section className="school-admin-panel"><header><div><span className="eyebrow">ARCHIVE</span><h2>Announcements</h2></div><strong>{announcements.length}</strong></header>{announcements.map(a=><article className="school-admin-list-row" key={a.id}><div><strong>{a.pinned?'✿ ':''}{a.title}</strong><span>{a.category} · {a.school_date||'No school date'}</span></div><select value={a.state} onChange={e=>void setAnnouncementState(a.id,e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></article>)}</section></div>

  const renderMaintenance=()=> <div className="school-admin-stack">{!canSystem?<div className="identity-notice error">This account has school administration access but not system.configure.</div>:<section className="school-admin-panel"><header><div><span className="eyebrow">WEBSITE MAINTENANCE</span><h2>Site configuration</h2></div><strong>{configuration.length}</strong></header><p className="school-admin-note">These are system-level settings. Changes are account-authored and audited by the existing platform controls.</p>{configuration.map(row=><article className="school-admin-config" key={row.key}><div><strong>{row.key.replaceAll('_',' ')}</strong><small>{row.description}</small></div><textarea value={configDrafts[row.key]||'{}'} onChange={e=>setConfigDrafts({...configDrafts,[row.key]:e.target.value})}/><button disabled={working===`config:${row.key}`} onClick={()=>void saveConfig(row)}>Save</button></article>)}</section>}</div>

  return <section className="school-admin-workspace"><header className="school-admin-banner"><div><span className="eyebrow">HANAMI HIGH SCHOOL OFFICE</span><h1>School Administration</h1><p>Account-level school management. No OC is required for Owner or authorized Platform Administrator operations.</p></div><strong>school.configure</strong></header>{error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}<nav className="school-admin-tabs">{tabs.map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}>{item.label}</button>)}</nav>{loading?<div className="studio-loading">Opening the school office…</div>:tab==='homerooms'?renderHomerooms():tab==='classes'?renderClasses():tab==='clubs'?renderClubs():tab==='events'?renderEvents():tab==='announcements'?renderAnnouncements():renderMaintenance()}</section>
}
