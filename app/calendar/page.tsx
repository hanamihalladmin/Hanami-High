"use client";

import {useEffect,useMemo,useState} from "react";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type EventRow={id:string;title:string;description:string;location:string|null;starts_at:string;ends_at:string|null;all_day:boolean;category:string;featured:boolean;status:string};
const WEEKDAYS=["SUN","MON","TUE","WED","THU","FRI","SAT"];
function tokyoKey(value:string|Date){const date=typeof value==="string"?new Date(value):value;return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(date)}

export default function FullSchoolCalendarPage(){
 const [events,setEvents]=useState<EventRow[]>([]);
 const [status,setStatus]=useState("Loading the complete Hanami school calendar…");
 useEffect(()=>{let cancelled=false;async function load(){try{const response=await fetch(`${SUPABASE_URL}/rest/v1/school_calendar_events?select=id,title,description,location,starts_at,ends_at,all_day,category,featured,status&status=eq.published&order=starts_at.asc`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(!response.ok)throw new Error("The complete school calendar could not be loaded.");const rows=await response.json() as EventRow[];if(!cancelled){setEvents(rows);setStatus(rows.length?`${rows.length} published school event${rows.length===1?"":"s"}.`:"No school events have been published yet.")}}catch(error){if(!cancelled)setStatus(error instanceof Error?error.message:"The complete school calendar could not be loaded.")}}load();return()=>{cancelled=true}},[]);
 const aprilCells=useMemo(()=>{const cells:Array<{day:number|null;events:EventRow[]}>=[];for(let i=0;i<6;i++)cells.push({day:null,events:[]});for(let day=1;day<=30;day++){const key=`2006-04-${String(day).padStart(2,"0")}`;cells.push({day,events:events.filter(event=>{const start=tokyoKey(event.starts_at);const end=tokyoKey(event.ends_at??event.starts_at);return key>=start&&key<=end})})}while(cells.length%7!==0)cells.push({day:null,events:[]});return cells},[events]);
 const upcoming=useMemo(()=>events.slice(0,24),[events]);
 return <PublicSchoolShell active="calendar" sectionTitle="SCHOOL CALENDAR" breadcrumb="Calendar" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>COMPLETE SCHOOL CALENDAR · 2006 · JST</small><h1>School Calendar</h1><p>Public school events, ceremonies, activity dates, holidays, and community programs. Personal class and assessment dates remain inside the authenticated portal.</p></div>

  <section className={styles.section}><div className={styles.sectionHead}><h2>April 2006</h2><span>OPENING MONTH</span></div><div className={styles.sectionBody}><p aria-live="polite">{status}</p><div className={styles.calendarScroll}><div className={styles.calendarGrid}>{WEEKDAYS.map(day=><div className={styles.weekday} key={day}>{day}</div>)}{aprilCells.map((cell,index)=><div className={`${styles.day} ${cell.day?"":styles.dayBlank}`} key={index}>{cell.day?<><strong className={styles.dayNumber}>{cell.day}</strong>{cell.events.map(event=><span className={styles.eventChip} key={event.id} title={event.description}><small>{event.category.toUpperCase()}{event.featured?" · FEATURED":""}</small>{event.title}</span>)}</>:null}</div>)}</div></div><div className={styles.note}>Opening month highlights include the first day, entrance ceremony, club fair week, health and fitness examinations, and Greenery Day. Golden Week begins in early May.</div></div></section>

  <section className={styles.section}><div className={styles.sectionHead}><h2>Published Events</h2><span>LIVE FROM SCHOOL CALENDAR</span></div><div className={styles.sectionBody}><div className={styles.eventList}>{upcoming.map(event=>{const start=new Date(event.starts_at);const date=new Intl.DateTimeFormat("en-US",{month:"short",day:"2-digit",timeZone:"Asia/Tokyo"}).format(start).toUpperCase();const time=event.all_day?"ALL DAY":new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(start);return <article className={styles.eventRow} key={event.id}><div className={styles.eventDate}>{date}</div><div className={styles.eventCopy}><h3>{event.title}</h3><p>{event.description}</p></div><div className={styles.eventMeta}>{time}{event.location?` · ${event.location}`:""}</div></article>})}</div></div></section>
 </PublicSchoolShell>
}
