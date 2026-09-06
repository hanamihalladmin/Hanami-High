"use client";

import {useEffect} from "react";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";

type Session={accessToken?:string;expiresAt?:number};

export default function DailyPetalLoginRuntime(){
 useEffect(()=>{
  let dead=false;
  async function claim(){
   try{
    const raw=localStorage.getItem(SESSION_KEY);if(!raw)return;
    const session=JSON.parse(raw) as Session;if(!session.accessToken||!session.expiresAt||session.expiresAt<=Date.now())return;
    const response=await fetch(`${U}/rest/v1/rpc/claim_daily_petals`,{method:"POST",headers:{apikey:K,Authorization:`Bearer ${session.accessToken}`,"Content-Type":"application/json"},body:"{}",cache:"no-store"});
    if(!response.ok||dead)return;
    const awarded=Number(await response.json());
    if(awarded>0)window.dispatchEvent(new CustomEvent("hanami-petals-earned",{detail:{amount:awarded,source:"daily_login"}}));
   }catch{}
  }
  void claim();return()=>{dead=true;};
 },[]);
 return null;
}
