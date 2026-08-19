"use client";

import {useCallback,useEffect,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
type Props={accessToken:string;characterId:string};
type UnreadRow={conversation_id:string;unread_count:number;last_message_at:string|null};
function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"};}

export default function MessageNotificationBadge({accessToken,characterId}:Props){
 const [count,setCount]=useState(0);
 const load=useCallback(async()=>{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/conversation_unread_counts`,{method:"POST",headers:headers(accessToken),body:JSON.stringify({viewer_character_id:characterId})});if(!response.ok)return;const rows=await response.json() as UnreadRow[];setCount(rows.reduce((sum,row)=>sum+Number(row.unread_count||0),0));},[accessToken,characterId]);
 useEffect(()=>{load().catch(()=>undefined);const timer=window.setInterval(()=>{load().catch(()=>undefined);},30000);return()=>window.clearInterval(timer);},[load]);
 function openMessages(){const wrapper=document.getElementById("dashboard-messages");if(wrapper instanceof HTMLDetailsElement)wrapper.open=true;window.requestAnimationFrame(()=>document.getElementById("hanami-message-center")?.scrollIntoView({behavior:"smooth",block:"start"}));}
 return <button type="button" onClick={openMessages} aria-label={count?`Open messages, ${count} unread`:`Open messages, no unread messages`} style={{marginTop:8,minHeight:32,padding:"6px 9px",border:"1px solid #17375f",background:count?"#8f365b":"#fff",color:count?"#fff":"#17375f",fontSize:8,fontWeight:700,cursor:"pointer"}}>MESSAGES {count>0?`• ${count>99?"99+":count} NEW`:"• 0 NEW"}</button>;
}
