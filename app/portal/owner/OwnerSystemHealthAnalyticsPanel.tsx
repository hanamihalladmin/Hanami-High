"use client";

import {useCallback,useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
type Metric={metric:string;value:number};
type HealthEvent={id:string;event_type:string;page_path:string|null;summary:string;created_at:string};
type Bug={id:string;page_path:string;severity:string;status:string;description:string;created_at:string};
type Change={version:string;title:string;published_at:string|null};

export default function OwnerSystemHealthAnalyticsPanel({accessToken}:{accessToken:string}){
 const [metrics,setMetrics]=useState<Metric[]>([]);const [health,setHealth]=useState<HealthEvent[]>([]);const [bugs,setBugs]=useState<Bug[]>([]);const [version,setVersion]=useState<Change|null>(null);const [online,setOnline]=useState(false);const [notice,setNotice]=useState("Checking Hanami system health…");
 const load=useCallback(async()=>{const [ping,a,h,b,v]=await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/changelog_entries?select=id&limit=1`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/rpc/staff_analytics_summary`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:"{}"}),
  fetch(`${SUPABASE_URL}/rest/v1/client_health_events?select=id,event_type,page_path,summary,created_at&order=created_at.desc&limit=20`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/bug_feedback_reports?select=id,page_path,severity,status,description,created_at&order=created_at.desc&limit=12`,{headers:headers(accessToken)}),
  fetch(`${SUPABASE_URL}/rest/v1/changelog_entries?select=version,title,published_at&status=eq.published&order=published_at.desc&limit=1`,{headers:headers(accessToken)})
 ]);setOnline(ping.ok);if(a.ok)setMetrics(await a.json());if(h.ok)setHealth(await h.json());if(b.ok)setBugs(await b.json());if(v.ok){const rows=await v.json() as Change[];setVersion(rows[0]??null);}setNotice(ping.ok?"Supabase connection healthy. Owner telemetry refreshed.":"Supabase health check failed.");},[accessToken]);
 useEffect(()=>{queueMicrotask(()=>void load());const timer=setInterval(()=>void load(),60000);return()=>clearInterval(timer);},[load]);
 const label=(key:string)=>key.replaceAll("_"," ").replace(/\b\w/g,m=>m.toUpperCase());
 return <section style={{marginTop:18,border:"1px solid #9ba9b7",background:"#fff"}}><div style={{padding:14,background:"#eef3f8",borderBottom:"1px solid #c5ced8",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><p className="eyebrow">OWNER OPERATIONS</p><h3 style={{margin:"3px 0",font:"400 22px Georgia,serif"}}>System Health & Staff Analytics</h3><small>{notice}</small></div><button type="button" onClick={()=>void load()}>Refresh</button></div><div style={{padding:14,display:"grid",gap:14}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}><article style={{padding:10,border:"1px solid #cbd4dc"}}><small>SUPABASE</small><strong style={{display:"block",fontSize:18}}>{online?"HEALTHY":"ERROR"}</strong></article><article style={{padding:10,border:"1px solid #cbd4dc"}}><small>DEPLOYMENT VERSION</small><strong style={{display:"block",fontSize:18}}>{process.env.NEXT_PUBLIC_HANAMI_VERSION??version?.version??"development"}</strong><span style={{fontSize:9}}>{version?.title??"No published changelog entry"}</span></article>{metrics.map(m=><article key={m.metric} style={{padding:10,border:"1px solid #cbd4dc"}}><small>{label(m.metric)}</small><strong style={{display:"block",fontSize:18}}>{m.value}</strong></article>)}</div><details open><summary><strong>Recent client/network failures</strong></summary><div style={{display:"grid",gap:6,marginTop:8}}>{health.length?health.map(e=><div key={e.id} style={{padding:8,border:"1px solid #e0e4e8"}}><strong>{label(e.event_type)}</strong> • {e.summary}<div style={{fontSize:8,color:"#69798a"}}>{e.page_path??"Unknown route"} • {new Date(e.created_at).toLocaleString()}</div></div>):<p>No recorded client health failures.</p>}</div></details><details><summary><strong>Recent bug reports</strong></summary><div style={{display:"grid",gap:6,marginTop:8}}>{bugs.length?bugs.map(b=><div key={b.id} style={{padding:8,border:"1px solid #e0e4e8"}}><strong>{b.severity.toUpperCase()} • {b.status}</strong><div>{b.description.slice(0,180)}{b.description.length>180?"…":""}</div><small>{b.page_path} • {new Date(b.created_at).toLocaleString()}</small></div>):<p>No bug reports.</p>}</div></details><p style={{fontSize:9,color:"#687789"}}>Analytics are aggregate-only. This panel does not expose browsing histories, private message contents, or invasive per-user activity tracking.</p></div></section>;
}
