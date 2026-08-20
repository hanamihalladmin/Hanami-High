"use client";

import {useCallback,useEffect,useMemo,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
type Props={accessToken:string;characterId:string;role:"student"|"faculty"};
type Checklist={id:string;title:string;description:string;display_order:number;is_required:boolean};
type Progress={item_id:string};
type TransitLine={id:string;code:string;name:string;mode:string;description:string};
type TransitStop={id:string;line_id:string;stop_name:string;neighborhood:string;stop_order:number};
type Lore={id:string;title:string;category:string;summary:string;body:string};
type Canon={id:string;subject:string;fact:string;classification:string;source_note:string};
type Signup={id:string;title:string;description:string;signup_type:string;capacity:number|null;closes_at:string|null;is_open:boolean};
type SignupEntry={sheet_id:string;status:string};
type Volunteer={id:string;activity_name:string;hours:number;service_date:string;note:string};
type Shift={id:string;workplace_name:string;shift_date:string;starts_at:string;ends_at:string;status:string;notes:string};
type Mentor={id:string;topic:string;note:string;status:string};
type Feedback={id:string;title:string;description:string;item_type:string;status:string};
type Vote={item_id:string};
type Template={id:string;title:string;description:string;status:string;owner_character_id:string};

const card:React.CSSProperties={border:"1px solid #c4ced9",background:"#fff",padding:10};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10};

export default function RoadmapHubPanel({accessToken,characterId,role}:Props){
 const [userId,setUserId]=useState("");const [notice,setNotice]=useState("Loading roadmap systems…");
 const [items,setItems]=useState<Checklist[]>([]);const [progress,setProgress]=useState<Progress[]>([]);
 const [lines,setLines]=useState<TransitLine[]>([]);const [stops,setStops]=useState<TransitStop[]>([]);const [lore,setLore]=useState<Lore[]>([]);const [canon,setCanon]=useState<Canon[]>([]);
 const [signups,setSignups]=useState<Signup[]>([]);const [entries,setEntries]=useState<SignupEntry[]>([]);const [hours,setHours]=useState<Volunteer[]>([]);const [shifts,setShifts]=useState<Shift[]>([]);const [mentors,setMentors]=useState<Mentor[]>([]);
 const [feedback,setFeedback]=useState<Feedback[]>([]);const [votes,setVotes]=useState<Vote[]>([]);const [templates,setTemplates]=useState<Template[]>([]);
 const [mentorNote,setMentorNote]=useState("");const [feedbackTitle,setFeedbackTitle]=useState("");const [feedbackDescription,setFeedbackDescription]=useState("");
 const completed=new Set(progress.map(row=>row.item_id));const joined=new Set(entries.filter(row=>row.status!=="cancelled").map(row=>row.sheet_id));const voted=new Set(votes.map(row=>row.item_id));
 const onboardingPct=items.length?Math.round((items.filter(i=>completed.has(i.id)).length/items.length)*100):0;
 const load=useCallback(async()=>{try{
  const requests=[
   fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/onboarding_checklist_items?select=id,title,description,display_order,is_required&role=eq.${role}&order=display_order`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/character_onboarding_progress?select=item_id&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/city_transit_lines?select=id,code,name,mode,description&is_active=eq.true&order=display_order`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/city_transit_stops?select=id,line_id,stop_name,neighborhood,stop_order&order=stop_order`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/lore_pages?select=id,title,category,summary,body&status=eq.published&order=title`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/canon_facts?select=id,subject,fact,classification,source_note&order=created_at.desc&limit=50`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/activity_signup_sheets?select=id,title,description,signup_type,capacity,closes_at,is_open&is_open=eq.true&order=created_at.desc`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/activity_signup_entries?select=sheet_id,status&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/volunteer_hours?select=id,activity_name,hours,service_date,note&character_id=eq.${encodeURIComponent(characterId)}&order=service_date.desc`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/student_work_shifts?select=id,workplace_name,shift_date,starts_at,ends_at,status,notes&character_id=eq.${encodeURIComponent(characterId)}&order=shift_date.asc`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/mentorship_requests?select=id,topic,note,status&or=(mentee_character_id.eq.${encodeURIComponent(characterId)},mentor_character_id.eq.${encodeURIComponent(characterId)})&order=created_at.desc`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/feature_feedback_items?select=id,title,description,item_type,status&order=created_at.desc&limit=60`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/feature_feedback_votes?select=item_id`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/profile_template_library?select=id,title,description,status,owner_character_id&or=(status.eq.published,owner_character_id.eq.${encodeURIComponent(characterId)})&order=updated_at.desc`,{headers:headers(accessToken)})
  ];
  const [u,...responses]=await Promise.all(requests);if(u.ok){const user=await u.json() as {id?:string};setUserId(user.id??"");}
  const setters=[setItems,setProgress,setLines,setStops,setLore,setCanon,setSignups,setEntries,setHours,setShifts,setMentors,setFeedback,setVotes,setTemplates] as Array<(value:never)=>void>;
  for(let i=0;i<responses.length;i++)if(responses[i].ok)setters[i](await responses[i].json() as never);
  setNotice("Roadmap Hub ready.");
 }catch{setNotice("Some roadmap systems could not be loaded.");}},[accessToken,characterId,role]);
 useEffect(()=>{void load();},[load]);
 async function toggleChecklist(item:Checklist){const done=completed.has(item.id);const url=`${SUPABASE_URL}/rest/v1/character_onboarding_progress?character_id=eq.${encodeURIComponent(characterId)}&item_id=eq.${item.id}`;const response=await fetch(done?url:`${SUPABASE_URL}/rest/v1/character_onboarding_progress`,{method:done?"DELETE":"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:done?undefined:JSON.stringify({character_id:characterId,item_id:item.id})});setNotice(response.ok?`${item.title} ${done?"reopened":"completed"}.`:"Onboarding progress could not be saved.");if(response.ok)void load();}
 async function toggleSignup(sheet:Signup){const active=joined.has(sheet.id);const endpoint=active?`${SUPABASE_URL}/rest/v1/activity_signup_entries?sheet_id=eq.${sheet.id}&character_id=eq.${encodeURIComponent(characterId)}`:`${SUPABASE_URL}/rest/v1/activity_signup_entries`;const response=await fetch(endpoint,{method:active?"PATCH":"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify(active?{status:"cancelled"}:{sheet_id:sheet.id,character_id:characterId,status:"signed_up"})});setNotice(response.ok?(active?"Sign-up cancelled.":"You are signed up."):"Sign-up could not be changed.");if(response.ok)void load();}
 async function requestMentor(){if(role!=="student")return;const response=await fetch(`${SUPABASE_URL}/rest/v1/mentorship_requests`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({mentee_character_id:characterId,topic:"school mentorship",note:mentorNote.trim()})});setNotice(response.ok?"Mentorship request submitted for Faculty oversight.":"Mentorship request could not be submitted.");if(response.ok){setMentorNote("");void load();}}
 async function toggleVote(item:Feedback){if(!userId)return;const active=voted.has(item.id);const endpoint=active?`${SUPABASE_URL}/rest/v1/feature_feedback_votes?item_id=eq.${item.id}&user_id=eq.${userId}`:`${SUPABASE_URL}/rest/v1/feature_feedback_votes`;const response=await fetch(endpoint,{method:active?"DELETE":"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:active?undefined:JSON.stringify({item_id:item.id,user_id:userId})});setNotice(response.ok?(active?"Vote removed.":"Vote added."):"Vote could not be changed.");if(response.ok)void load();}
 async function submitFeedback(){if(!userId||!feedbackTitle.trim())return;const response=await fetch(`${SUPABASE_URL}/rest/v1/feature_feedback_items`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({title:feedbackTitle.trim(),description:feedbackDescription.trim(),item_type:"feature",status:"open",created_by:userId})});setNotice(response.ok?"Feedback submitted.":"Feedback could not be submitted.");if(response.ok){setFeedbackTitle("");setFeedbackDescription("");void load();}}
 const totalHours=useMemo(()=>hours.reduce((sum,row)=>sum+Number(row.hours||0),0),[hours]);
 return <section aria-label="Roadmap Hub" style={{display:"grid",gap:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><p className="eyebrow">HANAMI ROADMAP</p><h4 style={{margin:"3px 0",font:"400 21px Georgia,serif"}}>Roadmap Hub</h4><small>{notice}</small></div><strong>{onboardingPct}% onboarding complete</strong></div>
 <div style={grid}><article style={card}><h5>{role==="student"?"New Student Orientation":"Faculty Onboarding"}</h5>{items.map(item=><label key={item.id} style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:7,margin:"7px 0"}}><input type="checkbox" checked={completed.has(item.id)} onChange={()=>toggleChecklist(item)}/><span><strong>{item.title}</strong>{item.is_required&&<small> • required</small>}<small style={{display:"block"}}>{item.description}</small></span></label>)}</article>
 <article style={card}><h5>Hanami City Network</h5>{lines.length?lines.map(line=><div key={line.id} style={{marginBottom:9}}><strong>{line.code} · {line.name}</strong><small style={{display:"block"}}>{line.mode} • {line.description}</small><div style={{fontSize:9,marginTop:4}}>{stops.filter(s=>s.line_id===line.id).map(s=>`${s.stop_order}. ${s.stop_name}${s.neighborhood?` (${s.neighborhood})`:""}`).join(" → ")}</div></div>):<p>No transit lines have been published yet.</p>}</article>
 <article style={card}><h5>Lore Wiki & Canon Tracker</h5>{lore.slice(0,5).map(page=><details key={page.id}><summary><strong>{page.title}</strong> <small>({page.category.replaceAll("_"," ")})</small></summary><p>{page.summary||page.body}</p></details>)}{canon.slice(0,6).map(fact=><p key={fact.id}><strong>{fact.subject}:</strong> {fact.fact} <small>• {fact.classification}</small></p>)}{!lore.length&&!canon.length&&<p>No published lore or canon entries yet.</p>}</article>
 <article style={card}><h5>Sign-up Sheets & Volunteer Hours</h5>{signups.map(sheet=><div key={sheet.id} style={{marginBottom:9}}><strong>{sheet.title}</strong><small style={{display:"block"}}>{sheet.signup_type.replaceAll("_"," ")} • {sheet.description}</small><button type="button" onClick={()=>toggleSignup(sheet)}>{joined.has(sheet.id)?"Cancel sign-up":"Sign up"}</button></div>)}<p><strong>{totalHours.toFixed(1)}</strong> verified volunteer hours</p>{hours.slice(0,5).map(row=><small key={row.id} style={{display:"block"}}>{row.service_date} • {row.activity_name} • {row.hours}h</small>)}</article>
 {role==="student"&&<article style={card}><h5>Mentorship Program</h5><textarea value={mentorNote} onChange={e=>setMentorNote(e.target.value)} placeholder="What would you like help with?" rows={3} style={{width:"100%"}}/><button type="button" onClick={requestMentor}>Request mentor</button>{mentors.map(row=><p key={row.id}><strong>{row.topic}</strong> • {row.status}<small style={{display:"block"}}>{row.note}</small></p>)}</article>}
 {role==="student"&&<article style={card}><h5>Part-time Work Schedule</h5>{shifts.length?shifts.map(row=><p key={row.id}><strong>{row.shift_date} · {row.workplace_name}</strong><small style={{display:"block"}}>{row.starts_at.slice(0,5)}–{row.ends_at.slice(0,5)} • {row.status}{row.notes?` • ${row.notes}`:""}</small></p>):<p>No approved work shifts are scheduled.</p>}</article>}
 <article style={card}><h5>Feedback Voting</h5><input value={feedbackTitle} onChange={e=>setFeedbackTitle(e.target.value)} placeholder="Feature or improvement" style={{width:"100%",marginBottom:5}}/><textarea value={feedbackDescription} onChange={e=>setFeedbackDescription(e.target.value)} placeholder="Details" rows={2} style={{width:"100%"}}/><button type="button" onClick={submitFeedback}>Submit feedback</button>{feedback.slice(0,8).map(item=><div key={item.id} style={{borderTop:"1px solid #e1e5ea",paddingTop:6,marginTop:6}}><strong>{item.title}</strong><small style={{display:"block"}}>{item.item_type} • {item.status} • {item.description}</small><button type="button" onClick={()=>toggleVote(item)}>{voted.has(item.id)?"Remove vote":"▲ Vote"}</button></div>)}</article>
 <article style={card}><h5>Profile Template Library</h5>{templates.length?templates.map(t=><p key={t.id}><strong>{t.title}</strong><small style={{display:"block"}}>{t.description||"Shared Hanami profile layout"} • {t.status}{t.owner_character_id===characterId?" • yours":""}</small></p>):<p>No shared templates have been published yet. Profile Studio templates can be submitted here once saved.</p>}</article></div></section>;
}
