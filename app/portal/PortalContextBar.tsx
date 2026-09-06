"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./PortalContextBar.module.css";
import FacultyDashboardOverview from "./FacultyDashboardOverview";
import SchedulePanel from "./SchedulePanel";
import RewardsCustomizationPanel from "./RewardsCustomizationPanel";
import AppearanceCollectiblesPanel from "./AppearanceCollectiblesPanel";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Role="student"|"faculty";type Target={view:string;subView:string;label:string};type Change={id:string;title:string;summary:string;version:string|null;published_at:string};type Density="comfortable"|"compact";
const STUDENT_TABS:Record<string,Target[]>={
 home:[{view:"home",subView:"overview",label:"Dashboard"}],
 schedule:[{view:"schedule",subView:"week",label:"Week"},{view:"calendar",subView:"events",label:"Calendar"}],
 classes:[{view:"classes",subView:"overview",label:"My Classes"},{view:"classes",subView:"assignments",label:"Assignments"},{view:"school",subView:"records",label:"Grades"}],
 calendar:[{view:"schedule",subView:"week",label:"Week"},{view:"calendar",subView:"events",label:"Calendar"}],
 messages:[{view:"messages",subView:"inbox",label:"Inbox"}],
 school:[{view:"school",subView:"life",label:"Overview"},{view:"school",subView:"homeroom",label:"Homeroom"},{view:"school",subView:"identity",label:"Yearbook"},{view:"school",subView:"services",label:"Services"},{view:"school",subView:"office",label:"Office"},{view:"school",subView:"resources",label:"Resources"},{view:"school",subView:"support",label:"Support"}],
 community:[{view:"community",subView:"hub",label:"Feed"},{view:"community",subView:"friends",label:"Friends"},{view:"community",subView:"boards",label:"Forums"},{view:"community",subView:"activities",label:"Clubs"},{view:"community",subView:"opportunities",label:"Opportunities"},{view:"community",subView:"feedback",label:"Feedback"}],
 profile:[{view:"profile",subView:"profile",label:"My Profile"},{view:"profile",subView:"appearance",label:"Appearance"},{view:"profile",subView:"rewards",label:"Rewards"},{view:"profile",subView:"exchange",label:"Exchange"},{view:"profile",subView:"people",label:"Profiles"},{view:"profile",subView:"preferences",label:"Settings"}]
};
const FACULTY_TABS:Record<string,Target[]>={
 home:[{view:"home",subView:"overview",label:"Dashboard"},{view:"classes",subView:"overview",label:"Classes"},{view:"classes",subView:"grading",label:"Gradebook"},{view:"school",subView:"attendance",label:"Attendance"},{view:"schedule",subView:"week",label:"Schedule"},{view:"messages",subView:"inbox",label:"Inbox"}],
 schedule:[{view:"schedule",subView:"week",label:"Teaching Schedule"},{view:"calendar",subView:"events",label:"School Events"}],
 classes:[{view:"classes",subView:"overview",label:"Teaching Classes"},{view:"classes",subView:"operations",label:"Classroom"},{view:"classes",subView:"teaching",label:"Course Setup"},{view:"classes",subView:"grading",label:"Gradebook"},{view:"classes",subView:"exams",label:"Exams & Honors"}],
 calendar:[{view:"schedule",subView:"week",label:"Teaching Schedule"},{view:"calendar",subView:"events",label:"School Events"}],
 messages:[{view:"messages",subView:"inbox",label:"Inbox"}],
 school:[{view:"school",subView:"tools",label:"Faculty Tools"},{view:"school",subView:"attendance",label:"Attendance"},{view:"school",subView:"advising",label:"Advising"},{view:"school",subView:"life",label:"School"},{view:"school",subView:"lounge",label:"Lounge"},{view:"school",subView:"office",label:"Office"},{view:"school",subView:"resources",label:"Resources"},{view:"school",subView:"support",label:"Support"}],
 community:[{view:"community",subView:"hub",label:"Feed"},{view:"community",subView:"friends",label:"Friends"},{view:"community",subView:"rumors",label:"Community"},{view:"community",subView:"feedback",label:"Feedback"}],
 profile:[{view:"profile",subView:"profile",label:"My Profile"},{view:"profile",subView:"appearance",label:"Appearance"},{view:"profile",subView:"rewards",label:"Rewards"},{view:"profile",subView:"exchange",label:"Exchange"},{view:"profile",subView:"people",label:"Profiles"},{view:"profile",subView:"preferences",label:"Settings"}]
};
function h(token:string){return{apikey:K,Authorization:`Bearer ${token}`}}
function schoolGreeting(){const hour=Number(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",hour:"2-digit",hourCycle:"h23"}).format(new Date()));return hour<12?"Good morning":hour<18?"Good afternoon":"Good evening"}
export default function PortalContextBar({accessToken,view,subView,role}:{accessToken:string;view:string;subView:string;role:Role}){
 const [change,setChange]=useState<Change|null>(null);const [density,setDensity]=useState<Density>("comfortable");const [characterName,setCharacterName]=useState("");const [characterId,setCharacterId]=useState("");const key=`${view}.${subView}`;const tabs=useMemo(()=>((role==="student"?STUDENT_TABS:FACULTY_TABS)[view]??[]),[view,role]);
 useEffect(()=>{let dead=false;fetch(`${U}/rest/v1/page_changelog_entries?select=id,title,summary,version,published_at&page_key=eq.${encodeURIComponent(key)}&or=(visibility.eq.all,visibility.eq.${role})&order=published_at.desc&limit=1`,{headers:h(accessToken)}).then(async r=>r.ok?await r.json() as Change[]:[]).then(rows=>{if(!dead)setChange(rows[0]??null)}).catch(()=>undefined);return()=>{dead=true}},[accessToken,key,role]);
 useEffect(()=>{let dead=false;fetch(`${U}/rest/v1/characters?select=id,display_name&is_active=eq.true&limit=1`,{headers:h(accessToken),cache:"no-store"}).then(async r=>r.ok?await r.json() as {id:string;display_name:string}[]:[]).then(rows=>{if(!dead){setCharacterId(rows[0]?.id??"");setCharacterName(rows[0]?.display_name??"")}}).catch(()=>undefined);return()=>{dead=true}},[accessToken]);
 useEffect(()=>{const saved=(localStorage.getItem("hanami.portal.density") as Density|null)??"comfortable";setDensity(saved);document.documentElement.dataset.portalDensity=saved;return()=>{delete document.documentElement.dataset.portalDensity}},[]);
 function go(target:Target){window.dispatchEvent(new CustomEvent("hanami-portal-command",{detail:{view:target.view,subView:target.subView}}));}
 function toggleDensity(){const next:Density=density==="comfortable"?"compact":"comfortable";setDensity(next);localStorage.setItem("hanami.portal.density",next);document.documentElement.dataset.portalDensity=next;}
 return <><aside className={styles.bar} aria-label="Page sections and portal utilities"><div className={styles.topline}><div className={styles.greeting}><strong>{schoolGreeting()}{characterName?`, ${characterName}`:""}!</strong><span>{role==="student"?"Your Hanami school desk is ready.":"Your Hanami teaching desk is ready."}</span></div><div className={styles.utility}><button type="button" onClick={toggleDensity}>Density: {density==="comfortable"?"Comfortable":"Compact"}</button>{change&&<span title={change.summary}>Updated{change.version?` · v${change.version}`:""}</span>}</div></div><nav className={styles.tabs} aria-label="Page sections">{tabs.map(item=><button type="button" key={`${item.view}.${item.subView}`} className={item.view===view&&item.subView===subView?styles.active:""} aria-current={item.view===view&&item.subView===subView?"page":undefined} onClick={()=>go(item)}>{item.label}</button>)}</nav></aside>{role==="faculty"&&view==="home"&&subView==="overview"&&<FacultyDashboardOverview displayName={characterName||"Faculty"}/>} {role==="faculty"&&view==="schedule"&&characterId&&<div className={styles.facultySchedule}><SchedulePanel accessToken={accessToken} characterId={characterId} role="faculty"/></div>}{view==="profile"&&subView==="appearance"&&characterId&&<AppearanceCollectiblesPanel accessToken={accessToken} characterId={characterId}/>} {view==="profile"&&subView==="rewards"&&characterId&&<RewardsCustomizationPanel accessToken={accessToken} characterId={characterId} mode="rewards"/>}{view==="profile"&&subView==="exchange"&&characterId&&<RewardsCustomizationPanel accessToken={accessToken} characterId={characterId} mode="exchange"/>}</>;
}
