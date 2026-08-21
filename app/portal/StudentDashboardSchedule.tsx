"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./StudentDashboardSchedule.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const DAYS=["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
type Meeting={weekday:number;starts_at:string;ends_at:string;label:string|null};
type Course={code:string;title:string};
type Section={id:string;section_code:string;room:string|null;academic_courses:Course|null;section_meetings:Meeting[]};
type Membership={relationship:"student"|"instructor";class_sections:Section|null};
type SchoolBlock={id:string;block_type:string;title:string;weekday:number|null;starts_at:string;ends_at:string;homeroom_label:string|null};
type Item={key:string;weekday:number;starts_at:string;ends_at:string;title:string;meta:string;kind:"class"|"school"};
type Props={accessToken:string;characterId:string};

function headers(token:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`};}
function timeLabel(value:string){const [h,m]=value.split(":");const hour=Number(h);return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`;}
function isSchoolwide(block:SchoolBlock){const label=(block.homeroom_label??"").trim().toLowerCase();return !label||label==="all homerooms"||label==="school wide"||label==="school-wide"||label==="all";}

export default function StudentDashboardSchedule({accessToken,characterId}:Props){
 const [items,setItems]=useState<Item[]>([]),[state,setState]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{let cancelled=false;async function load(){setState("loading");try{const select="relationship,class_sections(id,section_code,room,academic_courses(code,title),section_meetings(weekday,starts_at,ends_at,label))";const [membershipResponse,blockResponse]=await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/section_memberships?select=${encodeURIComponent(select)}&character_id=eq.${encodeURIComponent(characterId)}&relationship=eq.student`,{headers:headers(accessToken)}),fetch(`${SUPABASE_URL}/rest/v1/school_schedule_blocks?select=id,block_type,title,weekday,starts_at,ends_at,homeroom_label&order=weekday.asc,starts_at.asc`,{headers:headers(accessToken)})]);if(!membershipResponse.ok)throw new Error("Schedule unavailable");const memberships=await membershipResponse.json() as Membership[];const blocks=blockResponse.ok?await blockResponse.json() as SchoolBlock[]:[];const next:Item[]=[];memberships.forEach(row=>{const section=row.class_sections;if(!section)return;(section.section_meetings??[]).forEach((meeting,index)=>next.push({key:`class-${section.id}-${index}`,weekday:meeting.weekday,starts_at:meeting.starts_at,ends_at:meeting.ends_at,title:section.academic_courses?.title??"Class",meta:`${section.academic_courses?.code??"COURSE"} · ${section.section_code}${section.room?` · Room ${section.room}`:""}`,kind:"class"}));});blocks.filter(block=>block.weekday!==null&&isSchoolwide(block)).forEach(block=>next.push({key:`block-${block.id}`,weekday:block.weekday!,starts_at:block.starts_at,ends_at:block.ends_at,title:block.title,meta:block.block_type.replaceAll("_"," "),kind:"school"}));next.sort((a,b)=>a.weekday-b.weekday||a.starts_at.localeCompare(b.starts_at));if(!cancelled){setItems(next);setState("ready");}}catch{if(!cancelled)setState("error");}}void load();return()=>{cancelled=true};},[accessToken,characterId]);
 const byDay=useMemo(()=>[1,2,3,4,5].map(day=>({day,items:items.filter(item=>item.weekday===day)})),[items]);
 return <section className={styles.panel}><div className={styles.heading}><div><p className="eyebrow">MY WEEK</p><h4>Class schedule</h4></div><span>8:00 AM–3:00 PM · JST</span></div>{state==="loading"?<p className={styles.status}>Loading your schedule…</p>:state==="error"?<p className={styles.status}>Your schedule could not be loaded.</p>:<div className={styles.week}>{byDay.map(({day,items:dayItems})=><article key={day} className={styles.day}><header><strong>{DAYS[day]}</strong></header>{dayItems.length?dayItems.map(item=><div key={item.key} className={`${styles.slot} ${item.kind==="school"?styles.school:""}`}><time>{timeLabel(item.starts_at)}–{timeLabel(item.ends_at)}</time><strong>{item.title}</strong><small>{item.meta}</small></div>):<p className={styles.empty}>No schedule posted.</p>}</article>)}</div>}</section>;
}
