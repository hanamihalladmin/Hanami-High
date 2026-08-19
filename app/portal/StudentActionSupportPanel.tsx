"use client";

import {useCallback,useEffect,useState,type ReactNode} from "react";
import styles from "./StudentActionSupportPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
async function rpc<T>(token:string,name:string,body:Record<string,unknown>){const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:headers(token,{"Content-Type":"application/json"}),body:JSON.stringify(body)});if(!r.ok)throw new Error(`${name} failed`);return await r.json() as T;}

type Homeroom={homeroom_id:string;code:string;grade_level:number;school_year:string;room_label:string|null;description:string;adviser_name:string|null;adviser_handle:string|null};
type Roster={character_id:string;display_name:string;handle:string;is_representative:boolean;representative_title:string|null};
type Feed={item_type:string;item_id:string;title:string;body:string;starts_at:string|null;published_at:string;location:string|null};
type Todo={item_type:string;title:string;due_at:string|null;priority:string;source_id:string};
type Alert={id:string;alert_type:string;severity:string;title:string;body:string;created_at:string};
type Counseling={id:string;request_type:string;status:string;counselor_name:string|null;appointment_at:string|null;location:string|null;student_note:string;staff_note:string};
type HealthNotice={id:string;title:string;body:string;office_hours:string|null};
type HealthVisit={id:string;reason:string;status:string;requested_for:string|null;staff_response:string};
type Eligibility={eligible:boolean;academic_status:string;attendance_status:string;note:string;reviewed_at:string};
type Waitlist={entry_id:string;section_code:string;course_title:string;waitlist_position:number;entry_status:string};

function SupportSection({title,summary,children,defaultOpen=false}:{title:string;summary:string;children:ReactNode;defaultOpen?:boolean}){
 return <details className={styles.card} open={defaultOpen?true:undefined}>
  <summary><span>{title}</span><small>{summary}</small><b aria-hidden="true">⌄</b></summary>
  <div className={styles.cardBody}>{children}</div>
 </details>;
}

export default function StudentActionSupportPanel({accessToken,characterId}:{accessToken:string;characterId:string}){
 const [homeroom,setHomeroom]=useState<Homeroom|null>(null);const [roster,setRoster]=useState<Roster[]>([]);const [feed,setFeed]=useState<Feed[]>([]);const [todos,setTodos]=useState<Todo[]>([]);const [alerts,setAlerts]=useState<Alert[]>([]);const [counseling,setCounseling]=useState<Counseling[]>([]);const [healthNotices,setHealthNotices]=useState<HealthNotice[]>([]);const [healthVisits,setHealthVisits]=useState<HealthVisit[]>([]);const [eligibility,setEligibility]=useState<Eligibility|null>(null);const [waitlist,setWaitlist]=useState<Waitlist[]>([]);const [counselType,setCounselType]=useState("academic_advising");const [counselNote,setCounselNote]=useState("");const [healthReason,setHealthReason]=useState("");const [status,setStatus]=useState("Loading your student action center…");
 const load=useCallback(async()=>{try{const [h,r,f,t,a,c,hn,hv,e,w]=await Promise.all([
   rpc<Homeroom[]>(accessToken,"current_homeroom",{target_character_id:characterId}),rpc<Roster[]>(accessToken,"current_homeroom_roster",{target_character_id:characterId}),rpc<Feed[]>(accessToken,"current_homeroom_feed",{target_character_id:characterId}),rpc<Todo[]>(accessToken,"student_todo_feed",{target_character_id:characterId}),
   fetch(`${SUPABASE_URL}/rest/v1/academic_alerts?select=id,alert_type,severity,title,body,created_at&student_character_id=eq.${encodeURIComponent(characterId)}&is_resolved=eq.false&order=created_at.desc`,{headers:headers(accessToken)}).then(x=>x.json() as Promise<Alert[]>),
   fetch(`${SUPABASE_URL}/rest/v1/counseling_appointments?select=id,request_type,status,counselor_name,appointment_at,location,student_note,staff_note&student_character_id=eq.${encodeURIComponent(characterId)}&order=created_at.desc`,{headers:headers(accessToken)}).then(x=>x.json() as Promise<Counseling[]>),
   fetch(`${SUPABASE_URL}/rest/v1/health_office_notices?select=id,title,body,office_hours&published=eq.true&order=created_at.desc`,{headers:headers(accessToken)}).then(x=>x.json() as Promise<HealthNotice[]>),
   fetch(`${SUPABASE_URL}/rest/v1/health_office_visits?select=id,reason,status,requested_for,staff_response&student_character_id=eq.${encodeURIComponent(characterId)}&order=created_at.desc`,{headers:headers(accessToken)}).then(x=>x.json() as Promise<HealthVisit[]>),
   fetch(`${SUPABASE_URL}/rest/v1/athletics_eligibility?select=eligible,academic_status,attendance_status,note,reviewed_at&student_character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}).then(x=>x.json() as Promise<Eligibility[]>),
   rpc<Waitlist[]>(accessToken,"current_waitlist",{target_character_id:characterId})
  ]);setHomeroom(h[0]??null);setRoster(r);setFeed(f);setTodos(t);setAlerts(a);setCounseling(c);setHealthNotices(hn);setHealthVisits(hv);setEligibility(e[0]??null);setWaitlist(w);setStatus("Student action center updated.");}catch{setStatus("Some student support information could not be loaded.");}},[accessToken,characterId]);
 useEffect(()=>{void load();},[load]);
 async function requestCounseling(){if(counselNote.trim().length<2)return;const r=await fetch(`${SUPABASE_URL}/rest/v1/counseling_appointments`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({student_character_id:characterId,request_type:counselType,student_note:counselNote.trim()})});setStatus(r.ok?"Counseling request submitted.":"Counseling request could not be submitted.");if(r.ok){setCounselNote("");await load();}}
 async function requestHealthVisit(){if(healthReason.trim().length<2)return;const r=await fetch(`${SUPABASE_URL}/rest/v1/health_office_visits`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({student_character_id:characterId,reason:healthReason.trim()})});setStatus(r.ok?"Health Office visit request submitted.":"Health Office request could not be submitted.");if(r.ok){setHealthReason("");await load();}}
 const fmt=(v:string|null)=>v?new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(v)):"—";
 const activeCounseling=counseling.filter(c=>!['completed','cancelled'].includes(c.status)).length;
 const activeVisits=healthVisits.filter(v=>!['seen','cancelled'].includes(v.status)).length;
 return <section className={styles.panel}><div className={styles.heading}><div><p className="eyebrow">STUDENT ACTION & SUPPORT CENTER</p><h4>What needs your attention</h4></div><span>{status}</span></div>
  <div className={styles.grid}>
   <SupportSection title="To-Do Dashboard" summary={`${todos.length} item${todos.length===1?"":"s"}`} defaultOpen>{todos.length?todos.slice(0,8).map(item=><div className={styles.row} key={`${item.item_type}-${item.source_id}`}><strong>{item.title}</strong><span>{item.item_type.replaceAll("_"," ")} • {item.priority.toUpperCase()} • {fmt(item.due_at)}</span></div>):<p>Nothing urgent is waiting right now.</p>}</SupportSection>
   <SupportSection title="Academic Alerts" summary={alerts.length?`${alerts.length} active`:"Clear"} defaultOpen>{alerts.length?alerts.map(a=><div className={styles.alert} key={a.id}><strong>{a.severity.toUpperCase()} • {a.title}</strong><p>{a.body}</p></div>):<p>No active academic alerts.</p>}</SupportSection>
   <SupportSection title="Homeroom" summary={homeroom?`${homeroom.code} • ${roster.length} students`:"Not assigned"}>{homeroom?<><strong className={styles.big}>{homeroom.code}</strong><p>{homeroom.school_year} • Grade {homeroom.grade_level}{homeroom.room_label?` • ${homeroom.room_label}`:""}</p><p>Adviser: {homeroom.adviser_name??"TBA"}{homeroom.adviser_handle?` (@${homeroom.adviser_handle})`:""}</p><div className={styles.roster}>{roster.map(m=><span key={m.character_id}>{m.display_name} @{m.handle}{m.is_representative?` — ${m.representative_title}`:""}</span>)}</div></>:<p>No homeroom has been assigned yet.</p>}</SupportSection>
   <SupportSection title="Homeroom Notices & Events" summary={feed.length?`${feed.length} post${feed.length===1?"":"s"}`:"None"}>{feed.length?feed.slice(0,6).map(i=><div className={styles.row} key={i.item_id}><strong>{i.title}</strong><span>{i.item_type.toUpperCase()} • {fmt(i.starts_at??i.published_at)}{i.location?` • ${i.location}`:""}</span><p>{i.body}</p></div>):<p>No current homeroom posts.</p>}</SupportSection>
   <SupportSection title="Counseling Center" summary={activeCounseling?`${activeCounseling} active request${activeCounseling===1?"":"s"}`:"Request an appointment"}><select value={counselType} onChange={e=>setCounselType(e.target.value)}><option value="academic_advising">Academic advising</option><option value="career_planning">Career planning</option><option value="schedule_issue">Schedule issue</option><option value="general_support">General support</option></select><textarea value={counselNote} onChange={e=>setCounselNote(e.target.value)} placeholder="What would you like help with?"/><button type="button" onClick={requestCounseling}>Request counseling appointment</button>{counseling.slice(0,3).map(c=><div className={styles.row} key={c.id}><strong>{c.request_type.replaceAll("_"," ")} • {c.status}</strong><span>{c.appointment_at?fmt(c.appointment_at):"Awaiting scheduling"}{c.location?` • ${c.location}`:""}</span>{c.staff_note&&<p>{c.staff_note}</p>}</div>)}</SupportSection>
   <SupportSection title="Nurse / Health Office" summary={activeVisits?`${activeVisits} active visit${activeVisits===1?"":"s"}`:"Health Office requests"}>{healthNotices.slice(0,2).map(n=><div className={styles.row} key={n.id}><strong>{n.title}</strong>{n.office_hours&&<span>{n.office_hours}</span>}<p>{n.body}</p></div>)}<textarea value={healthReason} onChange={e=>setHealthReason(e.target.value)} placeholder="Reason for visit request"/><button type="button" onClick={requestHealthVisit}>Request Health Office visit</button>{healthVisits.slice(0,3).map(v=><div className={styles.row} key={v.id}><strong>{v.status.toUpperCase()}</strong><span>{v.reason}</span>{v.staff_response&&<p>{v.staff_response}</p>}</div>)}</SupportSection>
   <SupportSection title="Athletics Eligibility" summary={eligibility?(eligibility.eligible?"Eligible":"Not eligible"):"No review"}>{eligibility?<><strong className={styles.big}>{eligibility.eligible?"ELIGIBLE":"NOT ELIGIBLE"}</strong><p>Academics: {eligibility.academic_status} • Attendance: {eligibility.attendance_status}</p>{eligibility.note&&<p>{eligibility.note}</p>}</>:<p>No athletics eligibility review is on file.</p>}</SupportSection>
   <SupportSection title="Class Waitlists" summary={waitlist.length?`${waitlist.length} active`:"None"}>{waitlist.length?waitlist.map(w=><div className={styles.row} key={w.entry_id}><strong>{w.course_title} • {w.section_code}</strong><span>Position {w.waitlist_position} • {w.entry_status}</span></div>):<p>You are not currently on a class waitlist.</p>}</SupportSection>
  </div>
  <div className={styles.links}><a href="../../organizations/">Organizations Portal</a><a href="../../elections/">School Elections</a><a href="../../rooms/">Room Directory</a></div>
 </section>;
}
