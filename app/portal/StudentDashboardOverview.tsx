"use client";

import {useEffect,useMemo,useState} from "react";
import {hanamiRoleplayNow} from "../components/roleplay-date";
import styles from "./StudentDashboardOverview.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Meeting={weekday:number;starts_at:string;ends_at:string;label:string|null};
type Course={code:string;title:string};
type Section={id:string;section_code:string;room:string|null;academic_courses:Course|null;section_meetings:Meeting[]};
type Membership={relationship:"student"|"instructor";class_sections:Section|null};
type SchoolBlock={id:string;block_type:string;title:string;weekday:number|null;starts_at:string;ends_at:string;homeroom_label:string|null};
type HomeroomMembership={homerooms:{code:string}|null};
type ActivityMembership={activity_id:string};
type ActivityEvent={id:string;activity_id:string|null;title:string;starts_at:string;ends_at:string|null;location:string|null};
type TodayItem={key:string;starts_at:string;ends_at:string;title:string;meta:string;kind:"class"|"school"|"club"};
type Props={accessToken:string;characterId:string;onOpenCourses:()=>void;onOpenSchedule:()=>void};
function headers(token:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};}
function timeLabel(value:string){const [h,m]=value.split(":");const hour=Number(h);return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`;}
function timeMinutes(value:string){const [h,m]=value.split(":").map(Number);return h*60+m;}
function normalizedHomeroom(value:string|null){const clean=(value??"").trim().toUpperCase();if(!clean)return "";const match=clean.match(/([A-Z])$/);return match?.[1]??clean;}
function isSchoolwide(block:SchoolBlock){const label=(block.homeroom_label??"").trim().toLowerCase();return !label||label==="all homerooms"||label==="school wide"||label==="school-wide"||label==="all";}
function roleplayWeekday(value:Date){const name=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"long"}).format(value);return ["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(name);}
function eventWeekday(value:string){const name=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"long"}).format(new Date(value));return ["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(name);}
function eventClock(value:string){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));return `${parts.find(p=>p.type==="hour")?.value??"00"}:${parts.find(p=>p.type==="minute")?.value??"00"}:00`;}
function nowMinutes(value:Date){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(value);return Number(parts.find(p=>p.type==="hour")?.value??0)*60+Number(parts.find(p=>p.type==="minute")?.value??0);}

export default function StudentDashboardOverview({accessToken,characterId,onOpenCourses,onOpenSchedule}:Props){
 const [sections,setSections]=useState<Section[]>([]),[today,setToday]=useState<TodayItem[]>([]),[state,setState]=useState<"loading"|"ready"|"error">("loading"),[clock,setClock]=useState(()=>hanamiRoleplayNow());
 useEffect(()=>{const timer=window.setInterval(()=>setClock(hanamiRoleplayNow()),30000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{let cancelled=false;async function load(){setState("loading");try{
  const select="relationship,class_sections(id,section_code,room,academic_courses(code,title),section_meetings(weekday,starts_at,ends_at,label))";
  const [membershipResponse,blockResponse,homeroomResponse,activityMembershipResponse,eventResponse]=await Promise.all([
   fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=${encodeURIComponent(select)}&character_id=eq.${encodeURIComponent(characterId)}&relationship=eq.student`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/school_schedule_blocks?select=id,block_type,title,weekday,starts_at,ends_at,homeroom_label&order=weekday.asc,starts_at.asc`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/homeroom_memberships?select=homerooms(code)&student_character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/campus_activity_memberships?select=activity_id&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/campus_activity_events?select=id,activity_id,title,starts_at,ends_at,location&is_public=eq.true&starts_at=gte.2006-04-01T00:00:00%2B09:00&starts_at=lt.2007-04-01T00:00:00%2B09:00&order=starts_at.asc&limit=50`,{headers:headers(accessToken)})
  ]);
  if(!membershipResponse.ok)throw new Error("Dashboard data unavailable");
  const memberships=await membershipResponse.json() as Membership[];const blocks=blockResponse.ok?await blockResponse.json() as SchoolBlock[]:[];const homeroom=(homeroomResponse.ok?(await homeroomResponse.json() as HomeroomMembership[]):[])[0]?.homerooms?.code??"";const activityMemberships=activityMembershipResponse.ok?await activityMembershipResponse.json() as ActivityMembership[]:[];const events=eventResponse.ok?await eventResponse.json() as ActivityEvent[]:[];
  const enrolled=memberships.map(row=>row.class_sections).filter((section):section is Section=>Boolean(section));const day=roleplayWeekday(hanamiRoleplayNow());const roomLetter=normalizedHomeroom(homeroom);const items:TodayItem[]=[];
  enrolled.forEach(section=>(section.section_meetings??[]).filter(m=>m.weekday===day).forEach((meeting,index)=>items.push({key:`class-${section.id}-${index}`,starts_at:meeting.starts_at,ends_at:meeting.ends_at,title:section.academic_courses?.title??"Class",meta:`${section.academic_courses?.code??"COURSE"} · ${section.section_code}${section.room?` · Room ${section.room}`:""}`,kind:"class"})));
  blocks.filter(block=>block.weekday===day&&(isSchoolwide(block)||normalizedHomeroom(block.homeroom_label)===roomLetter)).forEach(block=>items.push({key:`block-${block.id}`,starts_at:block.starts_at,ends_at:block.ends_at,title:block.title,meta:block.block_type.replaceAll("_"," "),kind:"school"}));
  const joinedIds=new Set(activityMemberships.map(item=>item.activity_id));events.filter(event=>event.activity_id&&joinedIds.has(event.activity_id)&&eventWeekday(event.starts_at)===day).forEach(event=>items.push({key:`club-${event.id}`,starts_at:eventClock(event.starts_at),ends_at:event.ends_at?eventClock(event.ends_at):eventClock(event.starts_at),title:event.title,meta:`Club activity${event.location?` · ${event.location}`:""}`,kind:"club"}));
  items.sort((a,b)=>a.starts_at.localeCompare(b.starts_at));if(!cancelled){setSections(enrolled);setToday(items);setState("ready");}
 }catch{if(!cancelled)setState("error");}}void load();return()=>{cancelled=true};},[accessToken,characterId]);
 const dayName=useMemo(()=>new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"long"}).format(clock),[clock]);
 const live=useMemo(()=>{const minute=nowMinutes(clock);const current=today.find(item=>minute>=timeMinutes(item.starts_at)&&minute<timeMinutes(item.ends_at))??null;const next=today.find(item=>timeMinutes(item.starts_at)>minute)??null;return {current,next};},[clock,today]);
 const clockLabel=useMemo(()=>new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",hour:"numeric",minute:"2-digit"}).format(clock),[clock]);
 return <><section className={styles.command}><div><p className="eyebrow">LIVE SCHOOL DAY · {clockLabel} JST</p><h3>{live.current?live.current.title:live.next?"Passing / open time":"School day complete"}</h3><p>{live.current?`${timeLabel(live.current.starts_at)}–${timeLabel(live.current.ends_at)} · ${live.current.meta}`:live.next?`Next: ${live.next.title} at ${timeLabel(live.next.starts_at)}`:"No more scheduled items today."}</p></div><div className={styles.commandNext}><span>NEXT UP</span><strong>{live.next?.title??"Nothing else scheduled"}</strong><small>{live.next?`${timeLabel(live.next.starts_at)} · ${live.next.meta}`:"You are clear for the day."}</small></div><div className={styles.quickActions}><button type="button" onClick={onOpenSchedule}>Open schedule</button><button type="button" onClick={onOpenCourses}>Open courses</button></div></section><div className={styles.grid}><section className={styles.panel}><div className={styles.heading}><div><p className="eyebrow">TODAY · JST · ROLEPLAY CALENDAR</p><h3>{dayName} schedule</h3></div><button type="button" onClick={onOpenSchedule}>Full schedule</button></div>{state==="loading"?<p className={styles.status}>Loading today&apos;s schedule…</p>:state==="error"?<p className={styles.status}>Today&apos;s schedule could not be loaded.</p>:today.length?<div className={styles.timeline}>{today.map(item=><div key={item.key} className={`${styles.slot} ${item.kind==="school"?styles.school:""} ${live.current?.key===item.key?styles.current:""}`}><time>{timeLabel(item.starts_at)}–{timeLabel(item.ends_at)}</time><div><strong>{item.title}</strong><small>{item.meta}</small></div></div>)}</div>:<p className={styles.status}>No school schedule is posted for today.</p>}</section><section className={styles.panel}><div className={styles.heading}><div><p className="eyebrow">MY COURSES</p><h3>Enrolled classes</h3></div><button type="button" onClick={onOpenCourses}>View courses</button></div>{state==="loading"?<p className={styles.status}>Loading your classes…</p>:sections.length?<div className={styles.courses}>{sections.map(section=><button type="button" key={section.id} onClick={onOpenCourses}><span><strong>{section.academic_courses?.title??"Untitled course"}</strong><small>{section.academic_courses?.code??"COURSE"} · {section.section_code}</small></span><b>→</b></button>)}</div>:<p className={styles.status}>No classes are assigned yet.</p>}</section></div></>;
}
