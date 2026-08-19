"use client";

import {FormEvent,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Props={discordInvite:string};

type Role="student"|"faculty";

export default function GuestEnrollmentForm({discordInvite}:Props){
  const [name,setName]=useState("");
  const [discordUsername,setDiscordUsername]=useState("");
  const [role,setRole]=useState<Role>("student");
  const [introduction,setIntroduction]=useState("");
  const [status,setStatus]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting)return;
    const cleanName=name.trim();
    const cleanDiscord=discordUsername.trim();
    const cleanIntro=introduction.trim();
    if(cleanName.length<2||cleanDiscord.length<2||cleanIntro.length<10){
      setStatus("Please complete every field before submitting your enrollment intake.");
      return;
    }
    setSubmitting(true);
    setStatus("Submitting your guest enrollment intake…");
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/guest_enrollment_intakes`,{
        method:"POST",
        headers:{
          apikey:SUPABASE_PUBLISHABLE_KEY,
          Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type":"application/json",
          Prefer:"return=minimal"
        },
        body:JSON.stringify({
          applicant_name:cleanName,
          discord_username:cleanDiscord,
          desired_role:role,
          introduction:cleanIntro,
          status:"pending"
        })
      });
      if(!response.ok)throw new Error("Your enrollment intake could not be submitted.");
      setSubmitted(true);
      setStatus("Enrollment intake submitted. Continue to Discord to finish joining Hanami High.");
    }catch(error){
      setStatus(error instanceof Error?error.message:"Your enrollment intake could not be submitted.");
    }finally{
      setSubmitting(false);
    }
  }

  return <section aria-labelledby="guest-enrollment-form-title" style={{marginTop:18,border:"1px solid #aeb9c7",background:"#fff",boxShadow:"2px 2px 0 rgba(23,55,95,.08)"}}>
    <div style={{padding:"12px 14px",background:"#eef3f8",borderBottom:"1px solid #bfc9d4"}}>
      <p className="eyebrow">GUEST SIGN-UP</p>
      <h2 id="guest-enrollment-form-title" style={{margin:"3px 0 5px",font:"400 24px Georgia,serif"}}>Start your Hanami enrollment.</h2>
      <p style={{margin:0,color:"#657487",fontSize:10,lineHeight:1.55}}>This is an enrollment intake, not a website account. Hanami does not use email sign-up for this flow.</p>
    </div>
    <form onSubmit={submit} style={{padding:16,display:"grid",gap:12}}>
      <label style={{display:"grid",gap:5,fontSize:9,fontWeight:700,color:"#17375f"}}>NAME OR DISPLAY NAME
        <input value={name} onChange={event=>setName(event.target.value)} maxLength={80} autoComplete="name" required style={{minHeight:38,padding:"8px 9px",border:"1px solid #aeb9c7",background:"#fff",font: "inherit"}}/>
      </label>
      <label style={{display:"grid",gap:5,fontSize:9,fontWeight:700,color:"#17375f"}}>DISCORD USERNAME
        <input value={discordUsername} onChange={event=>setDiscordUsername(event.target.value)} maxLength={80} placeholder="your Discord username" required style={{minHeight:38,padding:"8px 9px",border:"1px solid #aeb9c7",background:"#fff",font:"inherit"}}/>
      </label>
      <fieldset style={{margin:0,padding:10,border:"1px solid #c9d1db"}}>
        <legend style={{padding:"0 5px",fontSize:9,fontWeight:700,color:"#17375f"}}>APPLYING AS</legend>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          <label style={{display:"flex",gap:6,alignItems:"center",fontSize:10}}><input type="radio" name="desired-role" value="student" checked={role==="student"} onChange={()=>setRole("student")}/> Student</label>
          <label style={{display:"flex",gap:6,alignItems:"center",fontSize:10}}><input type="radio" name="desired-role" value="faculty" checked={role==="faculty"} onChange={()=>setRole("faculty")}/> Faculty</label>
        </div>
      </fieldset>
      <label style={{display:"grid",gap:5,fontSize:9,fontWeight:700,color:"#17375f"}}>SHORT INTRODUCTION
        <textarea value={introduction} onChange={event=>setIntroduction(event.target.value)} maxLength={1000} minLength={10} required placeholder="Tell us a little about yourself and what you want to do at Hanami High." style={{minHeight:120,padding:"8px 9px",border:"1px solid #aeb9c7",background:"#fff",resize:"vertical",font:"inherit"}}/>
      </label>
      <button type="submit" disabled={submitting||submitted} style={{minHeight:42,border:"1px solid #17375f",background:submitted?"#e7efe7":"#17375f",color:submitted?"#31583b":"#fff",fontSize:9,fontWeight:700,letterSpacing:".06em",cursor:submitting||submitted?"default":"pointer"}}>{submitted?"ENROLLMENT INTAKE SUBMITTED":submitting?"SUBMITTING…":"SUBMIT GUEST ENROLLMENT"}</button>
      {status&&<div role="status" aria-live="polite" style={{padding:"9px 10px",border:"1px solid #d6c77a",background:"#fff9dd",color:"#655726",fontSize:9,lineHeight:1.5}}>{status}</div>}
      {submitted&&(discordInvite?<a href={discordInvite} target="_blank" rel="noreferrer" className="discord-button" style={{display:"flex",minHeight:42,alignItems:"center",justifyContent:"center",textDecoration:"none"}}>Continue to the Hanami High Discord</a>:<div style={{padding:"10px 12px",border:"1px solid #c9b7c1",background:"#f8eef3",fontSize:9,lineHeight:1.5}}>Your intake is saved. The Discord invite still needs to be configured before the final handoff button can open the server.</div>)}
      <small style={{color:"#6d7885",lineHeight:1.5}}>Your submission is private. Guests can submit enrollment intakes but cannot browse or read other applications.</small>
    </form>
  </section>;
}
