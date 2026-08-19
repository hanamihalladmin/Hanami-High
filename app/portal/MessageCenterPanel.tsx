"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import InboxPanel from "./InboxPanel";
import styles from "./MessageCenterPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Props={accessToken:string;characterId:string};
type UnreadRow={conversation_id:string;unread_count:number;last_message_at:string|null};
type SentMessage={id:string;conversation_id:string;body:string;created_at:string};
type Conversation={id:string;kind:"direct"|"group"|"office";title:string|null};

function headers(accessToken:string){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`};}
function timeLabel(value:string){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(new Date(value));}

export default function MessageCenterPanel({accessToken,characterId}:Props){
 const [view,setView]=useState<"inbox"|"sent">("inbox");
 const [unreadCount,setUnreadCount]=useState(0);
 const [sent,setSent]=useState<SentMessage[]>([]);
 const [conversations,setConversations]=useState<Record<string,Conversation>>({});
 const [openMessageId,setOpenMessageId]=useState<string|null>(null);
 const [status,setStatus]=useState("Loading message center…");

 const loadSummary=useCallback(async()=>{
  const unreadResponse=await fetch(`${SUPABASE_URL}/rest/v1/rpc/conversation_unread_counts`,{method:"POST",headers:{...headers(accessToken),"Content-Type":"application/json"},body:JSON.stringify({viewer_character_id:characterId})});
  if(unreadResponse.ok){const rows=await unreadResponse.json() as UnreadRow[];setUnreadCount(rows.reduce((sum,row)=>sum+Number(row.unread_count||0),0));}
 },[accessToken,characterId]);

 const loadSent=useCallback(async()=>{
  setStatus("Loading sent messages…");
  const response=await fetch(`${SUPABASE_URL}/rest/v1/conversation_messages?select=id,conversation_id,body,created_at&sender_character_id=eq.${encodeURIComponent(characterId)}&order=created_at.desc&limit=100`,{headers:headers(accessToken)});
  if(!response.ok){setStatus("Sent messages could not be loaded.");return;}
  const rows=await response.json() as SentMessage[];
  setSent(rows);
  const ids=[...new Set(rows.map(row=>row.conversation_id))];
  if(ids.length){
   const filter=`(${ids.join(",")})`;
   const conversationsResponse=await fetch(`${SUPABASE_URL}/rest/v1/conversations?select=id,kind,title&id=in.${encodeURIComponent(filter)}`,{headers:headers(accessToken)});
   if(conversationsResponse.ok){const conversationRows=await conversationsResponse.json() as Conversation[];setConversations(Object.fromEntries(conversationRows.map(item=>[item.id,item])));}
  }
  setStatus(rows.length?`${rows.length} sent message${rows.length===1?"":"s"} available.`:"No sent messages yet.");
 },[accessToken,characterId]);

 useEffect(()=>{loadSummary().catch(()=>setUnreadCount(0));const timer=window.setInterval(()=>{loadSummary().catch(()=>undefined);},30000);return()=>window.clearInterval(timer);},[loadSummary]);
 useEffect(()=>{if(view==="sent")loadSent().catch(()=>setStatus("Sent messages could not be loaded."));},[loadSent,view]);

 const sentCount=sent.length;
 const notificationLabel=unreadCount>99?"99+":String(unreadCount);
 const conversationLabel=useMemo(()=>((conversationId:string)=>{const conversation=conversations[conversationId];if(!conversation)return "Hanami conversation";if(conversation.title)return conversation.title;return conversation.kind==="direct"?"Direct message":conversation.kind==="office"?"School office message":"Group conversation";}),[conversations]);

 return <section className={styles.center} id="hanami-message-center" aria-labelledby="message-center-title">
  <div className={styles.bar}>
   <div><p className="eyebrow">MESSAGE CENTER</p><h4 id="message-center-title">Hanami Mail</h4></div>
   <div className={styles.actions}>
    <button type="button" className={view==="inbox"?styles.active:""} onClick={()=>{setView("inbox");loadSummary().catch(()=>undefined);}}>Inbox {unreadCount>0&&<span className={styles.badge} aria-label={`${unreadCount} unread messages`}>{notificationLabel}</span>}</button>
    <button type="button" className={view==="sent"?styles.active:""} onClick={()=>setView("sent")}>Sent{sentCount>0?` ${sentCount}`:""}</button>
   </div>
  </div>
  <div className={styles.notice} aria-live="polite">{unreadCount>0?<><strong>{unreadCount} unread message{unreadCount===1?"":"s"}</strong><span>New Hanami messages are waiting for your active character.</span></>:<><strong>No unread messages</strong><span>Your message notification count is clear.</span></>}</div>
  {view==="inbox"?<InboxPanel accessToken={accessToken} characterId={characterId}/>:<div className={styles.sentPanel}>
   <div className={styles.sentHeader}><strong>Sent messages</strong><span>{status}</span></div>
   {sent.length===0?<div className={styles.empty}>Messages you send from Hanami High will appear here.</div>:<div className={styles.sentList}>{sent.map(item=>{const open=openMessageId===item.id;return <article key={item.id} className={styles.sentItem}>
    <button type="button" className={styles.sentButton} aria-expanded={open} onClick={()=>setOpenMessageId(current=>current===item.id?null:item.id)}>
     <span><strong>{conversationLabel(item.conversation_id)}</strong><small>{timeLabel(item.created_at)}</small></span><b>{open?"Close":"Open"}</b>
    </button>
    {open&&<div className={styles.sentBody}><p>{item.body}</p><small>Sent {timeLabel(item.created_at)} • Stored inside Hanami High</small></div>}
   </article>;})}</div>}
  </div>}
 </section>;
}
