"use client";

export default function StudentExperiencePage(){
  return <main style={{maxWidth:900,margin:"40px auto",padding:"0 20px 72px",fontFamily:"Arial, Helvetica, sans-serif",color:"#24344d"}}>
    <p style={{fontSize:11,fontWeight:800,letterSpacing:".12em",margin:0,color:"#8f365b"}}>HANAMI STUDENT EXPERIENCE</p>
    <h1 style={{font:"400 36px Georgia, serif",margin:"6px 0 12px"}}>Student Experience Hub</h1>
    <p style={{lineHeight:1.65,maxWidth:760}}>The Student Experience tools are now built directly into the Student Portal so your locker, journals, platonic relationships, guestbook, question box, community boards, study tools, daily-life utilities, profile customization, and school-life systems stay connected to the rest of your portal.</p>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:24}}>
      <a href="../student/" style={{border:"1px solid #b7bec9",padding:18,background:"#fff",color:"#24344d",textDecoration:"none"}}><strong>Open Student Portal</strong><span style={{display:"block",marginTop:6,fontSize:12,color:"#687486"}}>Use the complete integrated experience.</span></a>
      <a href="../../features/" style={{border:"1px solid #b7bec9",padding:18,background:"#fff",color:"#24344d",textDecoration:"none"}}><strong>Feature Center</strong><span style={{display:"block",marginTop:6,fontSize:12,color:"#687486"}}>See portal systems and rollout status.</span></a>
      <a href="../../changelog/" style={{border:"1px solid #b7bec9",padding:18,background:"#fff",color:"#24344d",textDecoration:"none"}}><strong>Website Changelog</strong><span style={{display:"block",marginTop:6,fontSize:12,color:"#687486"}}>Review published website updates.</span></a>
    </section>
  </main>;
}
