"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./YearbookPublishingDesk.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";

type Session={accessToken:string};
type Capability={yearbook_manage:boolean};
type Yearbook={character_id:string;portrait_url:string|null;quote:string;clubs_sports:string[];awards:string[];most_likely_to:string[];memories:string;approved:boolean;locked_at:string|null;updated_at:string};
type Character={id:string;display_name:string;handle:string;role:string};

function headers(token:string,extra:Record<string,string>={}){return {apikey:K,Authorization:`Bearer ${token}`,...extra};}
function readSession():Session|null{try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const parsed=JSON.parse(raw) as Partial<Session>;return typeof parsed.accessToken==="string"?{accessToken:parsed.accessToken}:null;}catch{return null;}}
async function rpc<T>(token:string,name:string,body:Record<string,unknown>={}){const r=await fetch(`${U}/rest/v1/rpc/${name}`,{method:"POST",headers:headers(token,{"Content-Type":"application/json"}),body:JSON.stringify(body)});if(!r.ok){let message="Request failed.";try{const e=await r.json() as {message?:string};if(e.message)message=e.message}catch{}throw new Error(message)}if(r.status===204)return undefined as T;const text=await r.text();return (text?JSON.parse(text):undefined) as T;}

export default function YearbookPublishingDesk(){
 const [token,setToken]=useState("");
 const [enabled,setEnabled]=useState(false);
 const [rows,setRows]=useState<Yearbook[]>([]);
 const [characters,setCharacters]=useState<Character[]>([]);
 const [filter,setFilter]=useState<"pending"|"approved"|"locked"|"all">("pending");
 const [busy,setBusy]=useState("");
 const [status,setStatus]=useState("Checking Yearbook publishing access…");
 const names=useMemo(()=>new Map(characters.map(c=>[c.id,c])),[characters]);
 const visible=useMemo(()=>rows.filter(row=>filter==="all"||(filter==="pending"&&!row.approved&&!row.locked_at)||(filter==="approved"&&row.approved&&!row.locked_at)||(filter==="locked"&&Boolean(row.locked_at))),[rows,filter]);

 const load=useCallback(async(accessToken:string)=>{try{const cap=await rpc<Capability[]>(accessToken,"current_publishing_capabilities");if(!cap[0]?.yearbook_manage){setEnabled(false);setStatus("");return;}const [yr,cr]=await Promise.all([
  fetch(`${U}/rest/v1/yearbook_profiles?select=character_id,portrait_url,quote,clubs_sports,awards,most_likely_to,memories,approved,locked_at,updated_at&order=updated_at.desc`,{headers:headers(accessToken),cache:"no-store"}),
  fetch(`${U}/rest/v1/characters?select=id,display_name,handle,role&role=eq.student&order=display_name.asc`,{headers:headers(accessToken),cache:"no-store"})
 ]);if(!yr.ok||!cr.ok)throw new Error("Yearbook review queue could not be loaded.");const [yearbook,chars]=await Promise.all([yr.json() as Promise<Yearbook[]>,cr.json() as Promise<Character[]>]);setRows(yearbook);setCharacters(chars);setEnabled(true);setStatus(`${yearbook.filter(row=>!row.approved&&!row.locked_at).length} submission${yearbook.filter(row=>!row.approved&&!row.locked_at).length===1?"":"s"} awaiting publication review.`);}catch(error){setEnabled(false);setStatus(error instanceof Error?error.message:"Yearbook publishing access could not be loaded.")}},[]);
 useEffect(()=>{const stored=readSession();if(!stored){setStatus("");return;}setToken(stored.accessToken);void load(stored.accessToken)},[load]);
 async function setState(characterId:string,approved:boolean,locked:boolean){if(!token||busy)return;setBusy(characterId);try{await rpc<void>(token,"set_yearbook_publication_state",{target_character_id:characterId,requested_approved:approved,requested_locked:locked});await load(token);setStatus(locked?"Yearbook page approved and locked into the school archive.":approved?"Yearbook page approved for the public edition.":"Yearbook page returned to review.");window.dispatchEvent(new Event("hanami-yearbook-published"));}catch(error){setStatus(error instanceof Error?error.message:"Yearbook publication state could not be changed.")}finally{setBusy("")}}
 if(!enabled)return null;
 return <section className={styles.desk} aria-label="Yearbook publication desk"><header><div><p>YEARBOOK STAFF ACCESS</p><h2>Publication Desk</h2><span>Students own their words and memories. The school owns final approval and archive locking.</span></div><nav aria-label="Yearbook review filters">{(["pending","approved","locked","all"] as const).map(value=><button key={value} type="button" className={filter===value?styles.active:""} onClick={()=>setFilter(value)}>{value}</button>)}</nav></header><div className={styles.queue}>{visible.length===0?<div className={styles.empty}>No Yearbook pages match this review filter.</div>:visible.map(row=>{const person=names.get(row.character_id);return <article key={row.character_id} className={row.locked_at?styles.locked:styles.card}><div className={styles.portrait}>{row.portrait_url?<img src={row.portrait_url} alt=""/>:<span>HH</span>}</div><div className={styles.copy}><div className={styles.meta}><span>{row.locked_at?"ARCHIVED":row.approved?"APPROVED":"PENDING"}</span><time>{new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",year:"numeric"}).format(new Date(row.updated_at))}</time></div><h3>{person?.display_name??"Hanami Student"}</h3><small>@{person?.handle??"student"}</small><blockquote>{row.quote?`“${row.quote}”`:"No quote submitted."}</blockquote><p><b>Clubs / sports:</b> {(row.clubs_sports??[]).join(", ")||"—"}</p><p><b>Awards:</b> {(row.awards??[]).join(", ")||"—"}</p><p><b>Most likely to:</b> {(row.most_likely_to??[]).join(", ")||"—"}</p>{row.memories&&<details><summary>Read school memories</summary><p>{row.memories}</p></details>}<div className={styles.actions}>{!row.approved&&!row.locked_at&&<button type="button" disabled={busy===row.character_id} onClick={()=>void setState(row.character_id,true,false)}>Approve</button>}{row.approved&&!row.locked_at&&<><button type="button" disabled={busy===row.character_id} onClick={()=>void setState(row.character_id,false,false)}>Return to review</button><button type="button" disabled={busy===row.character_id} onClick={()=>void setState(row.character_id,true,true)}>Approve & lock archive</button></>}{row.locked_at&&<button type="button" disabled={busy===row.character_id} onClick={()=>void setState(row.character_id,true,false)}>Unlock archive</button>}</div></div></article>})}</div><footer aria-live="polite">{status}</footer></section>;
}
