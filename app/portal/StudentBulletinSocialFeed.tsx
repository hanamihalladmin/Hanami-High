"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import styles from "./StudentBulletinSocialFeed.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type Post={id:string;character_id:string;request_type:string;title:string;body:string;visibility:string;status:string;created_at:string};
type Like={post_id:string;character_id:string;created_at:string};
type Comment={id:string;post_id:string;character_id:string;body:string;created_at:string};
type Character={id:string;display_name:string;handle:string};

type Props={accessToken:string;characterId:string};

function headers(token:string,extra:Record<string,string>={}){return{apikey:K,Authorization:`Bearer ${token}`,...extra}}
function stamp(value:string){return new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value))}
function label(value:string){return value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
async function json<T>(token:string,path:string){const r=await fetch(`${U}/rest/v1/${path}`,{headers:headers(token),cache:"no-store"});if(!r.ok)throw new Error(await r.text());return r.json() as Promise<T>}
async function mutate(token:string,path:string,method:string,body?:unknown){const r=await fetch(`${U}/rest/v1/${path}`,{method,headers:headers(token,{"Content-Type":"application/json",Prefer:"return=minimal"}),body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text())}

export default function StudentBulletinSocialFeed({accessToken,characterId}:Props){
 const [posts,setPosts]=useState<Post[]>([]),[likes,setLikes]=useState<Like[]>([]),[comments,setComments]=useState<Comment[]>([]),[characters,setCharacters]=useState<Character[]>([]);
 const [drafts,setDrafts]=useState<Record<string,string>>({}),[openLikes,setOpenLikes]=useState<Record<string,boolean>>({}),[message,setMessage]=useState("Loading bulletin activity…");
 const names=useMemo(()=>new Map(characters.map(c=>[c.id,c])),[characters]);

 async function load(){
  try{
   const [p,l,c,ch]=await Promise.all([
    json<Post[]>(accessToken,"student_request_board?select=id,character_id,request_type,title,body,visibility,status,created_at&status=eq.open&visibility=eq.school&order=created_at.desc&limit=30"),
    json<Like[]>(accessToken,"student_request_board_likes?select=post_id,character_id,created_at&order=created_at.asc"),
    json<Comment[]>(accessToken,"student_request_board_comments?select=id,post_id,character_id,body,created_at&order=created_at.asc"),
    json<Character[]>(accessToken,"characters?select=id,display_name,handle&role=eq.student")
   ]);
   setPosts(p);setLikes(l);setComments(c);setCharacters(ch);setMessage("Student bulletin ready.");
  }catch(e){setMessage(e instanceof Error?e.message:"Bulletin activity could not be loaded.")}
 }
 useEffect(()=>{void load()},[accessToken,characterId]);

 async function toggleLike(postId:string){
  const mine=likes.some(row=>row.post_id===postId&&row.character_id===characterId);
  try{
   if(mine)await mutate(accessToken,`student_request_board_likes?post_id=eq.${encodeURIComponent(postId)}&character_id=eq.${encodeURIComponent(characterId)}`,"DELETE");
   else await mutate(accessToken,"student_request_board_likes","POST",{post_id:postId,character_id:characterId});
   await load();setMessage(mine?"Like removed.":"You liked this bulletin post.");
  }catch(e){setMessage(e instanceof Error?e.message:"Like could not be updated.")}
 }

 async function comment(e:FormEvent,postId:string){
  e.preventDefault();const body=(drafts[postId]??"").trim();if(!body)return;
  try{await mutate(accessToken,"student_request_board_comments","POST",{post_id:postId,character_id:characterId,body});setDrafts(v=>({...v,[postId]:""}));await load();setMessage("Comment posted.")}catch(err){setMessage(err instanceof Error?err.message:"Comment could not be posted.")}
 }

 async function removeComment(row:Comment){
  if(row.character_id!==characterId)return;
  try{await mutate(accessToken,`student_request_board_comments?id=eq.${encodeURIComponent(row.id)}`,"DELETE");await load();setMessage("Comment removed.")}catch(e){setMessage(e instanceof Error?e.message:"Comment could not be removed.")}
 }

 return <section className={styles.panel} aria-label="Student bulletin social feed">
  <header className={styles.header}><div><p>STUDENT NETWORK · BULLETIN BOARD</p><h3>Student bulletin</h3><span>School posts with the small social touches of a 2006 community site.</span></div><small>{message}</small></header>
  <div className={styles.feed}>{posts.length?posts.map(post=>{
   const author=names.get(post.character_id);const postLikes=likes.filter(row=>row.post_id===post.id);const mine=postLikes.some(row=>row.character_id===characterId);const postComments=comments.filter(row=>row.post_id===post.id);
   return <article className={styles.post} key={post.id}>
    <div className={styles.meta}><div className={styles.avatar}>{author?.display_name?.slice(0,1).toUpperCase()??"H"}</div><div><strong>{author?.display_name??"Hanami Student"}</strong><span>@{author?.handle??"student"} · {label(post.request_type)}</span></div><time>{stamp(post.created_at)} JST</time></div>
    <h4>{post.title}</h4><p className={styles.body}>{post.body}</p>
    <div className={styles.actions}>
     <button type="button" aria-pressed={mine} onClick={()=>void toggleLike(post.id)}>{mine?"Unlike":"♡ Like"}</button>
     <button type="button" onClick={()=>setOpenLikes(v=>({...v,[post.id]:!v[post.id]}))}>{postLikes.length} like{postLikes.length===1?"":"s"} · See who liked this</button>
     <span>{postComments.length} comment{postComments.length===1?"":"s"}</span>
    </div>
    {openLikes[post.id]&&<div className={styles.likedBy}>{postLikes.length?postLikes.map(row=><span key={row.character_id}>{names.get(row.character_id)?.display_name??"Hanami Student"}</span>):<span>No likes yet.</span>}</div>}
    <div className={styles.comments}>{postComments.map(row=>{const person=names.get(row.character_id);return <div className={styles.comment} key={row.id}><div><strong>{person?.display_name??"Hanami Student"}</strong><small>@{person?.handle??"student"} · {stamp(row.created_at)}</small></div><p>{row.body}</p>{row.character_id===characterId&&<button type="button" onClick={()=>void removeComment(row)}>Delete</button>}</div>})}</div>
    <form className={styles.commentForm} onSubmit={e=>void comment(e,post.id)}><input maxLength={800} value={drafts[post.id]??""} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} placeholder="Write a comment…" aria-label={`Comment on ${post.title}`}/><button type="submit">Post comment</button></form>
   </article>
  }):<div className={styles.empty}>No open school-wide bulletin posts yet. Use the Classifieds board below to publish the first one.</div>}</div>
 </section>;
}
