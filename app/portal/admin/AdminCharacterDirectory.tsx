"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import styles from "./AdminCharacterDirectory.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Row={character_id:string;owner_user_id:string;display_name:string;handle:string;role:"student"|"faculty";visibility:"public"|"friends_only"|"private";is_active:boolean;created_at:string;open_report_count:number};
type Props={accessToken:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}

export default function AdminCharacterDirectory({accessToken}:Props){
 const [query,setQuery]=useState("");const [rows,setRows]=useState<Row[]>([]);const [notice,setNotice]=useState("Loading character directory…");const [loading,setLoading]=useState(false);
 const load=useCallback(async(searchTerm="")=>{setLoading(true);try{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/administration_character_directory`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({search_term:searchTerm.trim()||null})});if(!response.ok)throw new Error("The Administration character directory could not be loaded.");const data=await response.json() as Row[];setRows(data);setNotice(data.length?`${data.length} character${data.length===1?"":"s"} found.`:"No characters matched that search.");}catch(error){setNotice(error instanceof Error?error.message:"The directory could not be loaded.");}finally{setLoading(false);}},[accessToken]);
 useEffect(()=>{load();},[load]);
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();load(query);}
 return <section className={styles.panel} aria-labelledby="admin-directory-title"><div className={styles.heading}><div><p className="eyebrow">ACCOUNT & CHARACTER REVIEW</p><h3 id="admin-directory-title">Character Directory</h3></div><span>MODERATION VIEW</span></div><form className={styles.search} onSubmit={submit}><label><span>Search handle or display name</span><div><input value={query} onChange={e=>setQuery(e.target.value)} maxLength={80} placeholder="e.g. hana or testfaculty"/><button type="submit" disabled={loading}>{loading?"Searching…":"Search"}</button></div></label><button type="button" onClick={()=>{setQuery("");load("");}} disabled={loading}>Show recent</button></form><div className={styles.notice} aria-live="polite">{notice}</div><div className={styles.list}>{rows.map(row=><article key={row.character_id} className={styles.item}><div className={styles.identity}><div className={styles.avatar}>{row.display_name.slice(0,1).toUpperCase()||"H"}</div><div><p className="eyebrow">{row.role.toUpperCase()} • {row.visibility.replace("_"," ").toUpperCase()}</p><h4>{row.display_name}</h4><span>@{row.handle}</span></div></div><dl><div><dt>Session</dt><dd>{row.is_active?"Active":"Inactive"}</dd></div><div><dt>Open reports</dt><dd className={row.open_report_count?styles.warn:""}>{row.open_report_count}</dd></div><div><dt>Created</dt><dd>{new Date(row.created_at).toLocaleDateString()}</dd></div><div><dt>Account ID</dt><dd className={styles.id}>{row.owner_user_id}</dd></div></dl></article>)}</div></section>;
}
