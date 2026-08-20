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
 const label=count>99?"99+":String(count);
 return <span aria-label={count?`${count} unread messages`:"No unread messages"} title={count?`${count} unread messages`:"No unread messages"} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",display:"grid",placeItems:"center",minWidth:18,height:18,padding:"0 5px",borderRadius:999,background:count?"#8f365b":"rgba(255,255,255,.28)",color:"#fff",fontSize:8,fontWeight:800,lineHeight:1,pointerEvents:"none"}}>{label}</span>;
}
