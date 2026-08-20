"use client";

import {useEffect,useState} from "react";

type Role="student"|"faculty";
type Step={title:string;body:string;anchor:string};
const studentSteps:Step[]=[
 {title:"Welcome to your Student Desk",body:"This is your character's main school dashboard. Your active character stays selected until you log out or switch characters.",anchor:"dashboard-title"},
 {title:"School day at a glance",body:"The Daily Bulletin and Tokyo bell status show the current period, school notices, events, deadlines, weather flavor, and session information.",anchor:"daily-school-bulletin"},
 {title:"Classes & school life",body:"Use Classroom Operations, Schedule, Coursework, Academic Record, hall passes, attendance excuses, counseling, health, clubs, and opportunities for day-to-day school RP.",anchor:"dashboard-messages"},
 {title:"Messages & friends",body:"Hanami Mail keeps direct and group messages inside the website. Friends and relationship labels are strictly platonic.",anchor:"dashboard-messages"},
 {title:"Profile Studio",body:"Your profile is fully customizable with templates, widgets, uploads, seasonal packs, stickers, privacy controls, Top Friends, badges, and profile views.",anchor:"dashboard-title"},
];
const facultySteps:Step[]=[
 {title:"Welcome to your Faculty Desk",body:"This is your Faculty character's working dashboard. Your active Faculty character remains selected until logout or character switch.",anchor:"dashboard-title"},
 {title:"School day controls",body:"The Daily Bulletin, Tokyo bell status, classroom seating, substitute assignments, office hours, and bell overrides support live school-day RP.",anchor:"dashboard-title"},
 {title:"Teaching tools",body:"Course Management, Grading, Attendance & Reports, Advising, detention assignment, hall-pass review, and attendance excuses are available from your desk.",anchor:"dashboard-title"},
 {title:"Faculty Lounge",body:"Use the private Faculty Lounge for internal notices, lesson planning, schedule swaps, and substitute requests.",anchor:"dashboard-title"},
 {title:"Communication & profiles",body:"Hanami Mail, community tools, friends, profile privacy, and Profile Studio remain available for your Faculty character too.",anchor:"dashboard-messages"},
];

export default function GuidedFirstLoginTour({characterId,role}:{characterId:string;role:Role}){
 const key=`hanami.first-login-tour.v1.${role}.${characterId}`;const [open,setOpen]=useState(false);const [step,setStep]=useState(0);const steps=role==="student"?studentSteps:facultySteps;
 useEffect(()=>{try{if(localStorage.getItem(key)!=="done")setOpen(true);}catch{}},[key]);
 function finish(){try{localStorage.setItem(key,"done");}catch{}setOpen(false);setStep(0);}
 function focusAnchor(anchor:string){const node=document.getElementById(anchor);node?.scrollIntoView({behavior:"smooth",block:"center"});}
 function next(){if(step>=steps.length-1){finish();return;}const nextStep=step+1;setStep(nextStep);focusAnchor(steps[nextStep].anchor);}
 if(!open)return <button type="button" onClick={()=>{setStep(0);setOpen(true);focusAnchor(steps[0].anchor);}} style={{position:"fixed",right:16,bottom:16,zIndex:45,border:"1px solid #17375f",background:"#fff",color:"#17375f",padding:"8px 11px",fontSize:9,fontWeight:700,cursor:"pointer"}}>Replay {role==="student"?"Student":"Faculty"} tour</button>;
 const current=steps[step];return <div role="dialog" aria-modal="true" aria-label={`${role} first login tour`} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(18,28,44,.44)",display:"grid",placeItems:"center",padding:18}}><section style={{width:"min(520px,100%)",background:"#fffafc",border:"1px solid #bda7b3",boxShadow:"0 18px 60px rgba(0,0,0,.22)",padding:18}}><p className="eyebrow">FIRST LOGIN TOUR • {role.toUpperCase()}</p><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline"}}><h3 style={{margin:"5px 0",font:"400 24px Georgia,serif",color:"#17375f"}}>{current.title}</h3><strong style={{fontSize:9,color:"#8f365b"}}>{step+1}/{steps.length}</strong></div><p style={{lineHeight:1.6}}>{current.body}</p><div style={{height:5,background:"#eee2e8",margin:"12px 0"}}><div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"#8f365b"}}/></div><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><button type="button" onClick={finish}>Skip tour</button><div style={{display:"flex",gap:6}}>{step>0&&<button type="button" onClick={()=>{const nextStep=step-1;setStep(nextStep);focusAnchor(steps[nextStep].anchor);}}>Back</button>}<button type="button" onClick={next}>{step===steps.length-1?"Finish":"Next"}</button></div></div></section></div>;
}
