"use client";

import {useEffect,useMemo,useState} from "react";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1",CHARACTER_KEY="hanami.portal.character.v1";
type Activity={id:string;kind:string;name:string;description:string;meeting_location:string|null;meeting_schedule:string|null;is_active:boolean};
type Membership={activity_id:string;status:string};
function auth(){try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)??"{}") as {accessToken?:string};return {token:s.accessToken??"",characterId:localStorage.getItem(CHARACTER_KEY)??""}}catch{return {token:"",characterId:""}}}
function headers(token?:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,...(token?{Authorization:`Bearer ${token}`}:{})}}
function asArray<T>(value:unknown):T[]{return Array.isArray(value)?value as T[]:[]}

export default function OrganizationsPage(){
 const [activities,setActivities]=useState<Activity[]>([]);
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [status,setStatus]=useState("Loading Hanami clubs and organizations…");
 const credentials=useMemo(()=>typeof window==="undefined"?{token:"",characterId:""}:auth(),[]);
 useEffect(()=>{let cancelled=false;async function load(){try{const activityResponse=await fetch(`${SUPABASE_URL}/rest/v1/campus_activities?select=id,kind,name,description,meeting_location,meeting_schedule,is_active&is_active=eq.true&is_test_data=eq.false&order=name.asc`,{headers:headers(credentials.token)});if(!activityResponse.ok)throw new Error();const rows=asArray<Activity>(await activityResponse.json());let joined:Membership[]=[];if(credentials.token&&credentials.characterId){const membershipResponse=await fetch(`${SUPABASE_URL}/rest/v1/campus_activity_memberships?select=activity_id,status&character_id=eq.${encodeURIComponent(credentials.characterId)}`,{headers:headers(credentials.token)});if(membershipResponse.ok)joined=asArray<Membership>(await membershipResponse.json())}if(cancelled)return;setActivities(rows);setMemberships(joined);setStatus(`${rows.length} active organization${rows.length===1?"":"s"}.`)}catch{if(!cancelled){setActivities([]);setMemberships([]);setStatus("The club directory could not be loaded. Please try again later.")}}}void load();return()=>{cancelled=true}},[credentials]);
 return <PublicSchoolShell active="directory" sectionTitle="DIRECTORY" breadcrumb="Clubs & Organizations" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>HANAMI CAMPUS · 2006–07</small><h1>Clubs & Organizations</h1><p>Browse active student groups, meeting information, and your current membership status when signed in.</p></div>
  <section className={styles.section}><div className={styles.sectionHead}><h2>Active Directory</h2><span>{status}</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}>{activities.map(activity=>{const membership=memberships.find(item=>item.activity_id===activity.id);return <article className={styles.card} key={activity.id}><small>{String(activity.kind??"club").toUpperCase()}</small><h3>{activity.name}</h3><p>{activity.description}</p><div className={styles.note}>Meets: <strong>{activity.meeting_schedule??"Not posted"}</strong><br/>Location: <strong>{activity.meeting_location??"Not posted"}</strong>{membership?<><br/>Your membership: <strong>{membership.status}</strong></>:null}</div></article>})}</div>{activities.length===0?<div className={styles.note}>{status}</div>:null}</div></section>
 </PublicSchoolShell>
}
