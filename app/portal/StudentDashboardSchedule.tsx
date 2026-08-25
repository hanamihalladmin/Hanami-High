"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./StudentDashboardSchedule.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const DAYS=["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const PERIODS=[
 {number:1,starts_at:"08:50:00",ends_at:"09:40:00"},
 {number:2,starts_at:"09:50:00",ends_at:"10:40:00"},
 {number:3,starts_at:"10:50:00",ends_at:"11:40:00"},
 {number:4,starts_at:"11:50:00",ends_at:"12:40:00"},
 {number:5,starts_at:"13:25:00",ends_at:"14:15:00"},
 {number:6,starts_at:"14:25:00",ends_at:"15:15:00"},
] as const;
type Meeting={weekday:number;starts_at:string;ends_at:string;label:string|null};
type Course={code:string;title:string};
type Section={id:string;section_code:string;room:string|null;academic_courses:Course|null;section_meetings:Meeting[]};
type Membership={relationship:"student"|"instructor";class_sections:Section|null};
type SchoolBlock={id:string;block_type:string;title:string;weekday:number|null;starts_at:string;ends_at:string;homeroom_label:string|null;notes:string|null};
type HomeroomMembership={homerooms:{code:string}|null};
type ActivityMembership={activity_id:string};
type ActivityEvent={id:string;activity_id:string|null;title:string;starts_at:string;ends_at:string|null;location:string|null};
type Item={key:string;weekday:number;starts_at:string;ends_at:string;title:string;meta:string;kind:"class"|"school"|"club"|"open";periodNumber?:number};
type Props={accessToken:string;characterId:string};
function headers(token:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};}
function timeLabel(value:string){const [h,m]=value.split(":");const hour=Number(h);return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`;}
function normalizedHomeroom(value:string|null){const clean=(value??"").trim().toUpperCase();if(!clean)return "";const match=clean.match(/([A-Z])$/);return match?.[1]??clean;}
function isSchoolwide(block:SchoolBlock){const label=(block.homeroom_label??"").trim().toLowerCase();return !label||label==="all homerooms"||label==="school wide"||label==="school-wide"||label==="all";}
function weekdayTokyo(value:string){const name=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"long"}).format(new Date(value));return DAYS.indexOf(name);}
function clockTokyo(value:string){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));const h=parts.find(p=>p.type==="hour")?.value??"00";const m=parts.find(p=>p.type==="minute")?.value??"00";return `${h}:${m}:00`;}
function itemPeriod(item:Item){if(item.periodNumber)return item.periodNumber;return PERIODS.find(period=>period.starts_at.slice(0,5)===item.starts_at.slice(0,5)&&period.ends_at.slice(0,5)===item.ends_at.slice(0,5))?.number;}
function dedupeSchedule(items:Item[]){
 const unique=new Map<string,Item>();
 for(const item of items){
  const period=itemPeriod(item);
  const signature=item.kind==="class"&&period
   ?`${item.weekday}|class|${period}`
   :`${item.weekday}|${item.kind}|${item.starts_at.slice(0,5)}|${item.ends_at.slice(0,5)}|${item.title.trim().toLowerCase()}`;
  if(!unique.has(signature))unique.set(signature,item);
 }
 return [...unique.values()];
}
export default function StudentDashboardSchedule({accessToken,characterId}:Props){
 const [items,setItems]=useState<Item[]>([]),[state,setState]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{let cancelled=false;async function load(){setState("loading");try{const select="relationship,class_sections(id,section_code,room,academic_courses(code,title),section_meetings(weekday,starts_at,ends_at,label))";const [membershipResponse,blockResponse,homeroomResponse,activityMembershipResponse,eventResponse]=await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=${encodeURIComponent(select)}&character_id=eq.${encodeURIComponent(characterId)}&relationship=eq.student`,{headers:headers(accessToken)}),fetch(`${SUPABASE_URL}/rest/v1/school_schedule_blocks?select=id,block_type,title,weekday,starts_at,ends_at,homeroom_label,notes&order=weekday.asc,starts_at.asc`,{headers:headers(accessToken)}),fetch(`${SUPABASE_URL}/rest/v1/homeroom_memberships?select=homerooms(code)&student_character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),fetch(`${SUPABASE_URL}/rest/v1/campus_activity_memberships?select=activity_id&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)}),fetch(`${SUPABASE_URL}/rest/v1/campus_activity_events?select=id,activity_id,title,starts_at,ends_at,location&is_public=eq.true&starts_at=gte.2006-04-01T00:00:00%2B09:00&starts_at=lt.2007-04-01T00:00:00%2B09:00&order=starts_at.asc&limit=50`,{headers:headers(accessToken)})]);if(!membershipResponse.ok)throw new Error("Schedule unavailable");const memberships=await membershipResponse.json() as Membership[];const blocks=blockResponse.ok?await blockResponse.json() as SchoolBlock[]:[];const homeroom=(homeroomResponse.ok?(await homeroomResponse.json() as HomeroomMembership[]):[])[0]?.homerooms?.code??"";const activityMemberships=activityMembershipResponse.ok?await activityMembershipResponse.json() as ActivityMembership[]:[];const events=eventResponse.ok?await eventResponse.json() as ActivityEvent[]:[];const next:Item[]=[];const roomLetter=normalizedHomeroom(homeroom);const sectionsByCode=new Map<string,Section>();for(const row of memberships){const section=row.class_sections,code=section?.academic_courses?.code?.toUpperCase();if(section&&code)sectionsByCode.set(code,section);}
  for(const block of blocks){if(block.weekday===null)continue;const blockRoom=normalizedHomeroom(block.homeroom_label);if(block.block_type==="class_period"){if(blockRoom!==roomLetter)continue;const section=sectionsByCode.get(block.title.toUpperCase());const period=PERIODS.find(p=>p.starts_at.slice(0,5)===block.starts_at.slice(0,5)&&p.ends_at.slice(0,5)===block.ends_at.slice(0,5))?.number;next.push({key:`class-block-${block.id}`,weekday:block.weekday,starts_at:block.starts_at,ends_at:block.ends_at,title:section?.academic_courses?.title??block.title,meta:`${section?.academic_courses?.code??block.title}${section?.section_code?` · ${section.section_code}`:""}${section?.room?` · Room ${section.room}`:""}`,kind:"class",periodNumber:period});continue;}
   if(block.notes==="owner_homeroom_daily_schedule")continue;
   if(!isSchoolwide(block))continue;
   next.push({key:`block-${block.id}`,weekday:block.weekday,starts_at:block.starts_at,ends_at:block.ends_at,title:block.title,meta:block.block_type.replaceAll("_"," "),kind:block.block_type==="club"?"club":"school"});
  }
  const joinedIds=new Set(activityMemberships.map(item=>item.activity_id));events.filter(event=>event.activity_id&&joinedIds.has(event.activity_id)).forEach(event=>{const weekday=weekdayTokyo(event.starts_at);if(weekday<1||weekday>5)return;next.push({key:`club-${event.id}`,weekday,starts_at:clockTokyo(event.starts_at),ends_at:event.ends_at?clockTokyo(event.ends_at):clockTokyo(event.starts_at),title:event.title,meta:`Club activity${event.location?` · ${event.location}`:""}`,kind:"club"});});const clean=dedupeSchedule(next);clean.sort((a,b)=>a.weekday-b.weekday||a.starts_at.localeCompare(b.starts_at));if(!cancelled){setItems(clean);setState("ready");}}catch{if(!cancelled)setState("error");}}void load();return()=>{cancelled=true};},[accessToken,characterId]);
 const byDay=useMemo(()=>[1,2,3,4,5].map(day=>{const dayItems=items.filter(item=>item.weekday===day);const occupiedPeriods=new Set(dayItems.map(item=>itemPeriod(item)).filter((period):period is number=>Boolean(period)));const openItems:Item[]=PERIODS.filter(period=>!occupiedPeriods.has(period.number)).map(period=>({key:`${day}-open-${period.number}`,weekday:day,starts_at:period.starts_at,ends_at:period.ends_at,title:"Open period",meta:"No class assigned.",kind:"open",periodNumber:period.number}));const timeline=[...dayItems,...openItems].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)||a.ends_at.localeCompare(b.ends_at));return {day,timeline};}),[items]);
 return <section className={styles.panel}><div className={styles.heading}><div><p className="eyebrow">MY WEEK</p><h4>Weekly schedule</h4></div><span>6 PERIODS · MONDAY–FRIDAY · JST</span></div>{state==="loading"?<p className={styles.status}>Loading your schedule…</p>:state==="error"?<p className={styles.status}>Your schedule could not be loaded.</p>:<div className={styles.week}>{byDay.map(({day,timeline})=><article key={day} className={styles.day}><header><strong>{DAYS[day]}</strong></header><div className={styles.timeline}>{timeline.map(item=><div key={item.key} className={`${styles.slot} ${item.kind!=="class"?styles.schoolSlot:""} ${item.kind==="open"?styles.openPeriod:""}`}><span className={styles.periodIndex}>{item.kind==="class"||item.kind==="open"?`PERIOD ${item.periodNumber}`:item.kind==="club"?"CLUB / ACTIVITY":"SCHOOL DAY"}</span><time>{timeLabel(item.starts_at)}–{timeLabel(item.ends_at)}</time><strong>{item.title}</strong><small>{item.meta}</small></div>)}</div></article>)}</div>}</section>;
}
