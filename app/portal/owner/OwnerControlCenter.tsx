"use client";

import {useEffect,useMemo,useState} from "react";
import OwnerPortalExpansionPanel from "./OwnerPortalExpansionPanel";
import OwnerSchoolStatePanel from "./OwnerSchoolStatePanel";
import styles from "./OwnerControlCenter.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string};
type Character={id:string;role:"student"|"faculty";is_active?:boolean};
type Directory={characters:Character[]};
type Flag={enabled:boolean};
type Sanction={id:string};
type RuntimeRow={key:string;value:{enabled?:boolean;manual_active?:boolean;manual_frozen?:boolean}};
function headers(token:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...extra};}
export default function OwnerControlCenter({accessToken}:Props){
 const [characters,setCharacters]=useState<Character[]>([]),[flags,setFlags]=useState<Flag[]>([]),[sanctions,setSanctions]=useState<Sanction[]>([]),[runtime,setRuntime]=useState<RuntimeRow[]>([]),[message,setMessage]=useState("Loading Owner network state…");
 useEffect(()=>{let dead=false;(async()=>{try{
  const [directoryResponse,f,s,r]=await Promise.all([
   fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_portal_directory`,{method:"POST",cache:"no-store",headers:headers(accessToken,{"Content-Type":"application/json"}),body:"{}"}),
   fetch(`${SUPABASE_URL}/rest/v1/feature_flags?select=enabled`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/account_sanctions?select=id&active=eq.true`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/site_runtime_config?select=key,value&key=in.(maintenance,roleplay_clock)`,{headers:headers(accessToken)})
  ]);
  if(!directoryResponse.ok||!f.ok||!s.ok||!r.ok)throw new Error("Owner control-center data could not be loaded.");
  const [directory,flagRows,sanctionRows,runtimeRows]=await Promise.all([directoryResponse.json() as Promise<Directory>,f.json() as Promise<Flag[]>,s.json() as Promise<Sanction[]>,r.json() as Promise<RuntimeRow[]>]);
  if(!dead){setCharacters(directory.characters??[]);setFlags(flagRows);setSanctions(sanctionRows);setRuntime(runtimeRows);setMessage("Owner network state is current across all registered characters and visible portals.");}
 }catch(error){if(!dead)setMessage(error instanceof Error?error.message:"Owner network state unavailable.");}})();return()=>{dead=true};},[accessToken]);
 const students=useMemo(()=>characters.filter(x=>x.role==="student").length,[characters]);
 const faculty=useMemo(()=>characters.filter(x=>x.role==="faculty").length,[characters]);
 const activeStudents=useMemo(()=>characters.filter(x=>x.role==="student"&&x.is_active!==false).length,[characters]);
 const activeFaculty=useMemo(()=>characters.filter(x=>x.role==="faculty"&&x.is_active!==false).length,[characters]);
 const enabledFlags=useMemo(()=>flags.filter(x=>x.enabled).length,[flags]);
 const maintenance=runtime.find(x=>x.key==="maintenance")?.value?.enabled??false;const clock=runtime.find(x=>x.key==="roleplay_clock")?.value;const clockMode=clock?.manual_active?(clock.manual_frozen?"MANUAL • FROZEN":"MANUAL • RUNNING"):"AUTOMATIC";
 return <><section className={styles.panel}><div className={styles.heading}><div><p className="eyebrow">OWNER CONTROL CENTER</p><h3>Hanami network authority</h3></div><span>{maintenance?"MAINTENANCE":"NETWORK LIVE"}</span></div><div className={styles.stats}><article><span>REGISTERED STUDENTS</span><strong>{students}</strong><small>{activeStudents} active character{activeStudents===1?"":"s"}</small></article><article><span>REGISTERED FACULTY</span><strong>{faculty}</strong><small>{activeFaculty} active character{activeFaculty===1?"":"s"}</small></article><article><span>FEATURE FLAGS ON</span><strong>{enabledFlags}/{flags.length}</strong></article><article><span>ACTIVE SANCTIONS</span><strong>{sanctions.length}</strong></article><article><span>RP CLOCK</span><strong className={styles.mode}>{clockMode}</strong></article></div><div className={styles.matrix}><div><strong>Owner</strong><span>All portal previews</span><span>All Administration tools</span><span>Network controls</span><span>Clock & maintenance</span></div><div><strong>Administrator</strong><span>School operations</span><span>People & academics</span><span>Content/moderation</span><span>No Owner controls</span></div><div><strong>Faculty</strong><span>Teaching sections</span><span>Attendance & grading</span><span>Student advising</span><span>No admin controls</span></div><div><strong>Student</strong><span>Own courses</span><span>Own records</span><span>Activities/community</span><span>No staff controls</span></div></div><p className={styles.status}>{message}</p></section><OwnerSchoolStatePanel accessToken={accessToken}/><OwnerPortalExpansionPanel/></>;
}
