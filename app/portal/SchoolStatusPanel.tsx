"use client";

import {useEffect,useMemo,useState} from "react";
import {hanamiRoleplayNow} from "../components/roleplay-date";
import styles from "./SchoolStatusPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Status="open"|"delayed"|"closed"|"holiday"|"emergency";
type Row={status:Status;message:string;updated_at:string};
type Block={weekday:number|null;starts_at:string;ends_at:string;title:string;block_type:string};
type Props={accessToken:string};
function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}
function minuteOf(value:string){const [h,m]=value.split(":").map(Number);return h*60+m;}
function clockMinute(date:Date){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);return Number(parts.find(p=>p.type==="hour")?.value??0)*60+Number(parts.find(p=>p.type==="minute")?.value??0);}
function weekday(date:Date){const name=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"long"}).format(date);return ["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(name);}
function timeLabel(value:string){const [h,m]=value.split(":");const hour=Number(h);return `${hour%12||12}:${m} ${hour>=12?"PM":"AM"}`;}

export default function SchoolStatusPanel({accessToken}:Props){
 const [row,setRow]=useState<Row>({status:"open",message:"School is operating on the normal schedule.",updated_at:""});const [blocks,setBlocks]=useState<Block[]>([]);const [notice,setNotice]=useState("Loading school operating status…");const [clock,setClock]=useState(()=>hanamiRoleplayNow());
 useEffect(()=>{const timer=window.setInterval(()=>setClock(hanamiRoleplayNow()),30000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{let cancelled=false;async function load(){try{const [statusResponse,blockResponse]=await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/school_status_config?select=status,message,updated_at&key=eq.main&limit=1`,{headers:headers(accessToken)}),fetch(`${SUPABASE_URL}/rest/v1/school_schedule_blocks?select=weekday,starts_at,ends_at,title,block_type&order=weekday.asc,starts_at.asc`,{headers:headers(accessToken)})]);if(!statusResponse.ok)throw new Error("School status could not be loaded.");const rows=await statusResponse.json() as Row[];const schedule=blockResponse.ok?await blockResponse.json() as Block[]:[];if(!cancelled){if(rows[0])setRow(rows[0]);setBlocks(schedule);setNotice(`School status: ${(rows[0]?.status??"open").toUpperCase()}.`);}}catch(error){if(!cancelled)setNotice(error instanceof Error?error.message:"School status could not be loaded.");}}load();return()=>{cancelled=true;};},[accessToken]);
 const phase=useMemo(()=>{if(row.status!=="open"&&row.status!=="delayed")return {label:row.status.toUpperCase(),detail:row.message};const day=weekday(clock),minute=clockMinute(clock),today=blocks.filter(b=>b.weekday===day);if(!today.length)return {label:"NO CLASSES",detail:"No regular school-day blocks are scheduled for this roleplay date."};const first=Math.min(...today.map(b=>minuteOf(b.starts_at))),last=Math.max(...today.map(b=>minuteOf(b.ends_at)));const active=today.find(b=>minute>=minuteOf(b.starts_at)&&minute<minuteOf(b.ends_at));const next=today.find(b=>minuteOf(b.starts_at)>minute);if(active)return {label:active.title.toUpperCase(),detail:`${timeLabel(active.starts_at)}–${timeLabel(active.ends_at)} · ${active.block_type.replaceAll("_"," ")}`};if(minute<first)return {label:"BEFORE SCHOOL",detail:`First scheduled block begins at ${timeLabel(today[0].starts_at)}.`};if(minute>=last)return {label:"AFTER SCHOOL",detail:"The regular school day has ended."};return {label:"PASSING / OPEN TIME",detail:next?`Next scheduled block: ${next.title} at ${timeLabel(next.starts_at)}.`:"No active school block right now."};},[blocks,clock,row]);
 const rpLabel=useMemo(()=>new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(clock),[clock]);
 return <section className={`${styles.panel} ${styles[row.status]}`} aria-labelledby="school-status-title"><div className={styles.primary}><p className="eyebrow">HANAMI SCHOOL STATUS</p><h4 id="school-status-title">{row.status.toUpperCase()}</h4><p>{row.message}</p></div><div className={styles.phase}><span>LIVE SCHOOL DAY</span><strong>{phase.label}</strong><small>{phase.detail}</small></div><div className={styles.meta}><b>{rpLabel} JST</b><span>{notice}</span>{row.updated_at&&<small>Updated {new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tokyo"}).format(new Date(row.updated_at))}</small>}</div></section>;
}
