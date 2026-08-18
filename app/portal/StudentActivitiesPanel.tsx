"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./StudentActivitiesPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Activity={id:string;kind:"club"|"student_government"|"event"|"committee";name:string;description:string;meeting_location:string|null;meeting_schedule:string|null;is_test_data:boolean};
type Membership={activity_id:string;status:"member"|"officer"|"advisor"};
type Event={id:string;activity_id:string|null;title:string;description:string;starts_at:string;ends_at:string|null;location:string|null;is_test_data:boolean};
type Props={accessToken:string;characterId:string};

function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}
function dateLabel(value:string){return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo",timeZoneName:"short"}).format(new Date(value));}

export default function StudentActivitiesPanel({accessToken,characterId}:Props){
  const [activities,setActivities]=useState<Activity[]>([]);
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [events,setEvents]=useState<Event[]>([]);
  const [message,setMessage]=useState("Loading campus activities…");

  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{
        const [activitiesResponse,membershipsResponse,eventsResponse]=await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/campus_activities?select=id,kind,name,description,meeting_location,meeting_schedule,is_test_data&is_active=eq.true&order=name.asc`,{headers:headers(accessToken)}),
          fetch(`${SUPABASE_URL}/rest/v1/campus_activity_memberships?select=activity_id,status&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)}),
          fetch(`${SUPABASE_URL}/rest/v1/campus_activity_events?select=id,activity_id,title,description,starts_at,ends_at,location,is_test_data&is_public=eq.true&starts_at=gte.${encodeURIComponent(new Date().toISOString())}&order=starts_at.asc&limit=8`,{headers:headers(accessToken)}),
        ]);
        if(!activitiesResponse.ok||!membershipsResponse.ok||!eventsResponse.ok)throw new Error("Campus activity data could not be loaded.");
        const [activityRows,membershipRows,eventRows]=await Promise.all([
          activitiesResponse.json() as Promise<Activity[]>,
          membershipsResponse.json() as Promise<Membership[]>,
          eventsResponse.json() as Promise<Event[]>,
        ]);
        if(cancelled)return;
        setActivities(activityRows);setMemberships(membershipRows);setEvents(eventRows);
        setMessage(`${membershipRows.length} joined activit${membershipRows.length===1?"y":"ies"} • ${eventRows.length} upcoming public event${eventRows.length===1?"":"s"}.`);
      }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Campus activities could not be loaded.");}
    }
    load();
    return()=>{cancelled=true;};
  },[accessToken,characterId]);

  const activityMap=useMemo(()=>new Map(activities.map(item=>[item.id,item])),[activities]);
  const joined=memberships.map(item=>({membership:item,activity:activityMap.get(item.activity_id)})).filter(item=>item.activity);

  return <section className={styles.panel} aria-labelledby="activities-title">
    <div className={styles.heading}><div><p className="eyebrow">CAMPUS</p><h4 id="activities-title">Activities & events</h4></div><span>{joined.length} JOINED</span></div>
    <div className={styles.status} aria-live="polite">{message}</div>
    <div className={styles.columns}>
      <div className={styles.block}><div className={styles.blockTitle}><strong>MY ACTIVITIES</strong><span>ACTIVE CHARACTER</span></div>{joined.length===0?<div className={styles.empty}><b>No joined activities yet</b><p>Clubs, committees, and student-government memberships assigned to this character will appear here.</p></div>:joined.map(({membership,activity})=><article key={activity!.id}><div className={styles.meta}><span>{activity!.kind.replace("_"," ").toUpperCase()} • {membership.status.toUpperCase()}</span>{activity!.is_test_data&&<b>TEST</b>}</div><h5>{activity!.name}</h5><p>{activity!.description||"No description posted."}</p><dl><div><dt>Meeting</dt><dd>{activity!.meeting_schedule||"Not posted"}</dd></div><div><dt>Location</dt><dd>{activity!.meeting_location||"Not posted"}</dd></div></dl></article>)}</div>
      <div className={styles.block}><div className={styles.blockTitle}><strong>UPCOMING EVENTS</strong><span>PUBLIC CAMPUS CALENDAR</span></div>{events.length===0?<div className={styles.empty}><b>No upcoming public events</b><p>New campus events will appear here automatically when they are published.</p></div>:events.map(event=><article key={event.id}><div className={styles.meta}><span>{dateLabel(event.starts_at)}</span>{event.is_test_data&&<b>TEST</b>}</div><h5>{event.title}</h5><p>{event.description||"No event description posted."}</p><dl><div><dt>Location</dt><dd>{event.location||"To be announced"}</dd></div><div><dt>Hosted by</dt><dd>{event.activity_id?activityMap.get(event.activity_id)?.name||"Campus activity":"Hanami High"}</dd></div></dl></article>)}</div>
    </div>
  </section>;
}
