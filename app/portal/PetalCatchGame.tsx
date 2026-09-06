"use client";

import {useEffect,useRef,useState} from "react";
import styles from "./PetalCatchGame.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
function h(token:string){return{apikey:K,Authorization:`Bearer ${token}`,"Content-Type":"application/json"};}
function point(){return{x:8+Math.random()*78,y:12+Math.random()*68};}

export default function PetalCatchGame({accessToken,onReward}:{accessToken:string;onReward?:()=>void}){
 const [runId,setRunId]=useState("");const [active,setActive]=useState(false);const [remaining,setRemaining]=useState(30);const [score,setScore]=useState(0);const [target,setTarget]=useState(point());const [message,setMessage]=useState("Catch blossoms for up to 10 Petals per Tokyo day.");const finishing=useRef(false);
 async function start(){if(active)return;setMessage("Opening the school courtyard…");try{const r=await fetch(`${U}/rest/v1/rpc/start_petal_game`,{method:"POST",headers:h(accessToken),body:"{}"});if(!r.ok)throw new Error("The game could not start.");const id=String(await r.json()).replace(/^"|"$/g,"");setRunId(id);setScore(0);setRemaining(30);setTarget(point());setActive(true);finishing.current=false;setMessage("Catch as many blossoms as you can!");}catch(e){setMessage(e instanceof Error?e.message:"The game could not start.");}}
 async function finish(id:string,finalScore:number){if(finishing.current||!id)return;finishing.current=true;setActive(false);setMessage("Counting your blossoms…");try{const r=await fetch(`${U}/rest/v1/rpc/finish_petal_game`,{method:"POST",headers:h(accessToken),body:JSON.stringify({run_id:id,score:Math.min(100,finalScore)})});if(!r.ok){const body=await r.json().catch(()=>null) as {message?:string}|null;throw new Error(body?.message||"The run could not be scored.");}const reward=Number(await r.json());setMessage(reward>0?`You earned ${reward} Petal${reward===1?"":"s"}!`:`Run complete. You have reached today's game reward cap.`);if(reward>0){window.dispatchEvent(new CustomEvent("hanami-petals-earned",{detail:{amount:reward,source:"petal_game"}}));onReward?.();}}catch(e){setMessage(e instanceof Error?e.message:"The run could not be scored.");}finally{setRunId("");}}
 useEffect(()=>{if(!active)return;const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer);},[active]);
 useEffect(()=>{if(active&&remaining===0)void finish(runId,score);},[active,remaining,runId,score]);
 function catchPetal(){if(!active)return;setScore(value=>Math.min(100,value+1));setTarget(point());}
 return <section className={styles.game} aria-labelledby="petal-game-title"><div className={styles.heading}><div><p>PETAL ARCADE · 2006</p><h3 id="petal-game-title">Petal Catch</h3></div><div className={styles.score}><span>{remaining}s</span><strong>{score}</strong><small>caught</small></div></div><div className={styles.board} aria-live="off">{active?<button className={styles.petal} type="button" aria-label="Catch blossom" onClick={catchPetal} style={{left:`${target.x}%`,top:`${target.y}%`}}>✿</button>:<div className={styles.startCard}><span>✿</span><strong>HANAMI COURTYARD</strong><p>30 seconds · one server-verified reward pool per day</p><button type="button" onClick={()=>void start()}>Play Petal Catch</button></div>}</div><footer><span>{message}</span><small>Game rewards are capped at 10 Petals per Tokyo day.</small></footer></section>;
}
