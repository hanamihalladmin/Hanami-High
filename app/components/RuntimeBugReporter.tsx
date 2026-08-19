"use client";

import {useEffect} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
function readToken(){try{return (JSON.parse(localStorage.getItem(SESSION_KEY)??"{}") as {accessToken?:string}).accessToken??"";}catch{return "";}}
function fingerprint(text:string){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return `runtime:${(hash>>>0).toString(16)}:${text.slice(0,80)}`.slice(0,240);}
async function report(title:string,details:string,metadata:Record<string,unknown>={}){const token=readToken();if(!token)return;const key=fingerprint(`${location.pathname}|${title}|${details.slice(0,240)}`);try{await fetch(`${SUPABASE_URL}/rest/v1/rpc/report_client_bug`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({bug_fingerprint:key,bug_title:title.slice(0,220),bug_details:details.slice(0,8000),bug_route:location.pathname+location.search,bug_area:location.pathname.startsWith("/portal")?"portal":"public-site",bug_severity:"medium",bug_metadata:{userAgent:navigator.userAgent,...metadata}})});}catch{/* detector reporting must never break the page */}}
export default function RuntimeBugReporter(){useEffect(()=>{const onError=(event:ErrorEvent)=>{void report(event.message||"Unhandled browser error",event.error?.stack||`${event.filename??""}:${event.lineno??0}:${event.colno??0}`,{kind:"error"});};const onRejection=(event:PromiseRejectionEvent)=>{const reason=event.reason instanceof Error?`${event.reason.message}\n${event.reason.stack??""}`:String(event.reason);void report("Unhandled promise rejection",reason,{kind:"unhandledrejection"});};window.addEventListener("error",onError);window.addEventListener("unhandledrejection",onRejection);return()=>{window.removeEventListener("error",onError);window.removeEventListener("unhandledrejection",onRejection);};},[]);return null;}
