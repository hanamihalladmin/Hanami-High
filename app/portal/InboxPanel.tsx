"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import styles from "./InboxPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Conversation={id:string;kind:"direct"|"group"|"office";title:string|null;created_at:string};
type Message={id:string;conversation_id:string;sender_character_id:string;body:string;created_at:string};
type Participant={character_id:string;display_name:string;handle:string;role:"student"|"faculty"};
type Props={accessToken:string;characterId:string};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function timeLabel(value:string){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"Asia/Tokyo"}).format(new Date(value));}

export default function InboxPanel({accessToken,characterId}:Props){
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [participants,setParticipants]=useState<Record<string,Participant[]>>({});
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [targetHandle,setTargetHandle]=useState("");
  const [body,setBody]=useState("");
  const [message,setMessage]=useState("Loading Hanami conversations…");
  const [sending,setSending]=useState(false);

  const loadConversationMeta=useCallback(async(conversationId:string)=>{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/conversation_participant_directory`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_conversation_id:conversationId})});
    if(!response.ok)return;
    const rows=await response.json() as Participant[];
    setParticipants(current=>({...current,[conversationId]:rows}));
  },[accessToken]);

  const loadMessages=useCallback(async(conversationId:string)=>{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/conversation_messages?select=id,conversation_id,sender_character_id,body,created_at&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc`,{headers:headers(accessToken)});
    if(!response.ok)throw new Error("Messages could not be loaded.");
    const rows=await response.json() as Message[];
    setMessages(rows);
    await loadConversationMeta(conversationId);
  },[accessToken,loadConversationMeta]);

  const loadConversations=useCallback(async(preferredId?:string)=>{
    const membershipResponse=await fetch(`${SUPABASE_URL}/rest/v1/conversation_participants?select=conversation_id&character_id=eq.${encodeURIComponent(characterId)}&order=joined_at.desc`,{headers:headers(accessToken)});
    if(!membershipResponse.ok)throw new Error("Your Hanami conversations could not be checked.");
    const memberships=await membershipResponse.json() as {conversation_id:string}[];
    const ids=memberships.map(item=>item.conversation_id);
    if(ids.length===0){setConversations([]);setSelectedId(null);setMessages([]);setMessage("No conversations yet. Start a private Hanami message by exact character handle.");return;}
    const filter=`(${ids.join(",")})`;
    const response=await fetch(`${SUPABASE_URL}/rest/v1/conversations?select=id,kind,title,created_at&id=in.${encodeURIComponent(filter)}&order=created_at.desc`,{headers:headers(accessToken)});
    if(!response.ok)throw new Error("Your Hanami conversations could not be loaded.");
    const rows=await response.json() as Conversation[];
    setConversations(rows);
    const nextId=preferredId&&rows.some(item=>item.id===preferredId)?preferredId:selectedId&&rows.some(item=>item.id===selectedId)?selectedId:rows[0]?.id??null;
    setSelectedId(nextId);
    setMessage(`${rows.length} conversation${rows.length===1?"":"s"} available inside Hanami High.`);
    if(nextId)await loadMessages(nextId);
  },[accessToken,characterId,loadMessages,selectedId]);

  useEffect(()=>{let cancelled=false;async function load(){try{await loadConversations();}catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"Hanami Inbox could not be loaded.");}}load();return()=>{cancelled=true;};},[loadConversations]);

  async function chooseConversation(id:string){setSelectedId(id);setMessage("Loading conversation…");try{await loadMessages(id);setMessage("Conversation loaded.");}catch(error){setMessage(error instanceof Error?error.message:"Conversation could not be loaded.");}}

  async function startDirect(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const clean=targetHandle.trim().replace(/^@/,"").toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(clean)){setMessage("Enter an exact Hanami handle using lowercase letters, numbers, or underscores.");return;}
    setSending(true);setMessage(`Opening a private Hanami conversation with @${clean}…`);
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/start_direct_conversation`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({sender_character_id:characterId,target_handle:clean})});
      if(!response.ok){const detail=await response.text();throw new Error(detail.includes("No Hanami character")?"No Hanami character was found for that exact handle.":"The direct conversation could not be opened.");}
      const conversationId=await response.json() as string;
      setTargetHandle("");
      await loadConversations(conversationId);
      setMessage(`Private conversation with @${clean} ready.`);
    }catch(error){setMessage(error instanceof Error?error.message:"The direct conversation could not be opened.");}
    finally{setSending(false);}
  }

  async function sendMessage(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const clean=body.trim();
    if(!selectedId||!clean||sending)return;
    setSending(true);setMessage("Sending inside Hanami High…");
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/conversation_messages`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({conversation_id:selectedId,sender_character_id:characterId,body:clean})});
      if(!response.ok)throw new Error("Your Hanami message could not be sent.");
      setBody("");await loadMessages(selectedId);setMessage("Message sent inside Hanami High.");
    }catch(error){setMessage(error instanceof Error?error.message:"Your Hanami message could not be sent.");}
    finally{setSending(false);}
  }

  const selected=conversations.find(item=>item.id===selectedId)??null;
  const selectedParticipants=selectedId?participants[selectedId]??[]:[];
  const otherParticipants=selectedParticipants.filter(item=>item.character_id!==characterId);
  const titleFor=(conversation:Conversation)=>conversation.title||((participants[conversation.id]??[]).filter(item=>item.character_id!==characterId).map(item=>item.display_name).join(", ")||conversation.kind.replace(/^./,letter=>letter.toUpperCase()));
  const participantMap=useMemo(()=>new Map(selectedParticipants.map(item=>[item.character_id,item])),[selectedParticipants]);

  return <section className={styles.panel} aria-labelledby="inbox-title">
    <div className={styles.heading}><div><p className="eyebrow">HANAMI MESSAGES</p><h4 id="inbox-title">Website-native inbox</h4></div><span>{conversations.length} THREAD{conversations.length===1?"":"S"}</span></div>
    <div className={styles.status} aria-live="polite">{message}</div>
    <form className={styles.startForm} onSubmit={startDirect}><label><span>Start private message by exact Hanami handle</span><div><b>@</b><input value={targetHandle} onChange={event=>setTargetHandle(event.target.value)} placeholder="character_handle" maxLength={24} autoComplete="off"/><button type="submit" disabled={sending}>Start DM</button></div></label><small>No external email app or email address is used.</small></form>
    <div className={styles.workspace}>
      <aside className={styles.threads}>{conversations.length===0?<p>No conversations yet.</p>:conversations.map(conversation=><button type="button" key={conversation.id} className={conversation.id===selectedId?styles.selected:""} onClick={()=>chooseConversation(conversation.id)}><strong>{titleFor(conversation)}</strong><span>{conversation.kind.toUpperCase()} • {timeLabel(conversation.created_at)}</span></button>)}</aside>
      <div className={styles.conversation}>{selected?<><div className={styles.conversationHead}><div><strong>{titleFor(selected)}</strong><span>{otherParticipants.length?otherParticipants.map(item=>`@${item.handle}`).join(" • "):selected.kind.toUpperCase()}</span></div><b>{selected.kind.toUpperCase()}</b></div><div className={styles.messages}>{messages.length===0?<p className={styles.emptyMessage}>No messages yet. Start the conversation below.</p>:messages.map(item=>{const mine=item.sender_character_id===characterId;const sender=participantMap.get(item.sender_character_id);return <article key={item.id} className={mine?styles.mine:""}><div><strong>{mine?"You":sender?.display_name??"Participant"}</strong><span>{timeLabel(item.created_at)}</span></div><p>{item.body}</p></article>;})}</div><form className={styles.composer} onSubmit={sendMessage}><label><span>Message as your active character</span><textarea value={body} onChange={event=>setBody(event.target.value)} maxLength={8000} placeholder="Write a Hanami message…"/></label><button type="submit" disabled={sending||!body.trim()}>{sending?"Sending…":"Send message"}</button></form></>:<div className={styles.empty}><strong>Select a conversation</strong><p>Your private Hanami messages stay inside the school website.</p></div>}</div>
    </div>
  </section>;
}
