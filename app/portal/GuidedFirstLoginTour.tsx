"use client";

import {useEffect,useState} from "react";

type Role="student"|"faculty";
type Step={title:string;body:string;anchor:string};
const studentSteps:Step[]=[
 {title:"Welcome to your Student Desk",body:"Your Discord-authorized Hanami account and active Student character open this desk. Your selected character stays active until you switch characters or log out.",anchor:"dashboard-title"},
 {title:"Discord homeroom enrollment",body:"Your Discord Homeroom A, B, or C role is the source of truth for your Hanami homeroom. After role sync, the website automatically assigns the matching homeroom, class sections, and schedule.",anchor:"dashboard-title"},
 {title:"Live school day",body:"The Dashboard uses Hanami's 2006 roleplay clock to show the current school-day state and what is coming next. Owner clock changes update date-sensitive portal systems from the same shared time source.",anchor:"dashboard-title"},
 {title:"Schedule and courses",body:"Schedule shows the continuous Monday–Friday school day and eight-period structure. Courses contains your assigned classes, classroom tools, exams and honors, and assignments.",anchor:"dashboard-title"},
 {title:"Records and school life",body:"School includes your Academic Record, attendance summary, Student ID, action requests, school office tools, resources, support tickets, clubs, activities, and other day-to-day roleplay systems.",anchor:"dashboard-title"},
 {title:"Community and forums",body:"Community includes activities, opportunities, the Community Hub, forums, rumors, and friends. Forum replies support up to 10,000 characters and show the limit while you type.",anchor:"dashboard-title"},
 {title:"Inbox and profiles",body:"Hanami Mail keeps school communication on the website. Account tools control your profile, privacy, profile designer, profile lookup, preferences, and search.",anchor:"dashboard-title"},
 {title:"Appearance Studio",body:"Account → Appearance lets you choose Text Color and Theme/Accent Color independently, apply quick themes, upload a dashboard wallpaper and profile image, adjust wallpaper opacity, and customize classroom banners.",anchor:"dashboard-title"},
];
const facultySteps:Step[]=[
 {title:"Welcome to your Faculty Desk",body:"Your Discord-authorized Faculty character opens this working desk and remains active until you switch characters or log out.",anchor:"dashboard-title"},
 {title:"Live teaching day",body:"The Faculty dashboard follows Hanami's shared 2006 roleplay clock and highlights the teaching day, including current and upcoming class activity.",anchor:"dashboard-title"},
 {title:"Courses and classroom tools",body:"Teaching Courses, Classroom Tools, Exams & Honors, Course Setup, and Grading are grouped under Courses so lessons, assessments, and returned work stay together.",anchor:"dashboard-title"},
 {title:"Attendance and advising",body:"School includes Attendance, Advising, the Faculty Lounge, School Office, Resources, and Support Tickets. Attendance tools include roster totals and quick bulk actions.",anchor:"dashboard-title"},
 {title:"Communication and community",body:"Inbox keeps Hanami Mail on-site. Community contains the Community Hub, forums, rumors, and friends for roleplay outside the classroom.",anchor:"dashboard-title"},
 {title:"Profiles and appearance",body:"Account includes profile privacy, the profile designer, profile lookup, preferences, search, and Appearance Studio controls for colors, wallpaper, profile images, and classroom banners.",anchor:"dashboard-title"},
];

export default function GuidedFirstLoginTour({characterId,role}:{characterId:string;role:Role}){
 const key=`hanami.first-login-tour.v2.${role}.${characterId}`;const [open,setOpen]=useState(false);const [step,setStep]=useState(0);const steps=role==="student"?studentSteps:facultySteps;
 useEffect(()=>{try{if(localStorage.getItem(key)!=="done")setOpen(true);}catch{}},[key]);
 function finish(){try{localStorage.setItem(key,"done");}catch{}setOpen(false);setStep(0);}
 function focusAnchor(anchor:string){const node=document.getElementById(anchor);node?.scrollIntoView({behavior:"smooth",block:"center"});}
 function next(){if(step>=steps.length-1){finish();return;}const nextStep=step+1;setStep(nextStep);focusAnchor(steps[nextStep].anchor);}
 if(!open)return <button type="button" onClick={()=>{setStep(0);setOpen(true);focusAnchor(steps[0].anchor);}} style={{position:"fixed",right:16,bottom:16,zIndex:45,border:"1px solid #17375f",borderRadius:0,background:"#fff",color:"#17375f",padding:"8px 11px",fontSize:9,fontWeight:700,cursor:"pointer"}}>Replay {role==="student"?"Student":"Faculty"} tour</button>;
 const current=steps[step];return <div role="dialog" aria-modal="true" aria-label={`${role} first login tour`} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(18,28,44,.44)",display:"grid",placeItems:"center",padding:18}}><section style={{width:"min(560px,100%)",background:"#fffafc",border:"1px solid #bda7b3",borderRadius:0,boxShadow:"0 18px 60px rgba(0,0,0,.22)",padding:18}}><p className="eyebrow">UPDATED PORTAL TOUR • {role.toUpperCase()}</p><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline"}}><h3 style={{margin:"5px 0",font:"400 24px Georgia,serif",color:"#17375f"}}>{current.title}</h3><strong style={{fontSize:9,color:"#8f365b"}}>{step+1}/{steps.length}</strong></div><p style={{lineHeight:1.6}}>{current.body}</p><div style={{height:5,background:"#eee2e8",margin:"12px 0"}}><div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"#8f365b"}}/></div><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><button type="button" onClick={finish}>Skip tour</button><div style={{display:"flex",gap:6}}>{step>0&&<button type="button" onClick={()=>{const nextStep=step-1;setStep(nextStep);focusAnchor(steps[nextStep].anchor);}}>Back</button>}<button type="button" onClick={next}>{step===steps.length-1?"Finish":"Next"}</button></div></div></section></div>;
}
