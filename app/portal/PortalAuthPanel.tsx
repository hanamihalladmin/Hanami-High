"use client";

import {useCallback,useEffect,useState} from "react";
import styles from "./PortalAuthPanel.module.css";
import CharacterManager from "./CharacterManager";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";

type PortalSession={accessToken:string;refreshToken:string;expiresAt:number;tokenType:string};
type AccountProfile={display_name:string;discord_username:string|null};
type ViewState="checking"|"signed-out"|"signed-in"|"error";

function saveSession(session:PortalSession){localStorage.setItem(SESSION_KEY,JSON.stringify(session));}
function clearSession(){localStorage.removeItem(SESSION_KEY);}
function readStoredSession():PortalSession|null{
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw)return null;
    const value=JSON.parse(raw) as Partial<PortalSession>;
    if(typeof value.accessToken!=="string"||typeof value.refreshToken!=="string"||typeof value.expiresAt!=="number")return null;
    return {accessToken:value.accessToken,refreshToken:value.refreshToken,expiresAt:value.expiresAt,tokenType:value.tokenType??"bearer"};
  }catch{return null;}
}
function sessionFromHash():PortalSession|null{
  if(!window.location.hash)return null;
  const params=new URLSearchParams(window.location.hash.slice(1));
  const accessToken=params.get("access_token");
  const refreshToken=params.get("refresh_token");
  if(!accessToken||!refreshToken)return null;
  const expiresIn=Number(params.get("expires_in")??3600);
  return {accessToken,refreshToken,expiresAt:Date.now()+Math.max(60,expiresIn)*1000,tokenType:params.get("token_type")??"bearer"};
}
function oauthErrorFromLocation(){
  const hash=new URLSearchParams(window.location.hash.slice(1));
  const query=new URLSearchParams(window.location.search);
  return hash.get("error_description")??query.get("error_description")??hash.get("error")??query.get("error");
}
async function refreshSession(session:PortalSession):Promise<PortalSession|null>{
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:"POST",
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({refresh_token:session.refreshToken}),
  });
  if(!response.ok)return null;
  const data=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;token_type?:string};
  if(!data.access_token||!data.refresh_token)return null;
  return {accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+(data.expires_in??3600)*1000,tokenType:data.token_type??"bearer"};
}
async function loadProfile(accessToken:string):Promise<AccountProfile|null>{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/account_profiles?select=display_name,discord_username&limit=1`,{
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`},
  });
  if(!response.ok)throw new Error("Your Hanami profile could not be loaded.");
  const rows=await response.json() as AccountProfile[];
  return rows[0]??null;
}

export default function PortalAuthPanel(){
  const [state,setState]=useState<ViewState>("checking");
  const [profile,setProfile]=useState<AccountProfile|null>(null);
  const [session,setSession]=useState<PortalSession|null>(null);
  const [message,setMessage]=useState("Checking this browser for an existing Hanami session.");

  const finishSignedIn=useCallback(async(activeSession:PortalSession)=>{
    saveSession(activeSession);
    const account=await loadProfile(activeSession.accessToken);
    setProfile(account);
    setSession(activeSession);
    setState("signed-in");
    setMessage("Discord authentication is active. Your private Hanami account is ready.");
  },[]);

  useEffect(()=>{
    let cancelled=false;
    async function initialize(){
      try{
        const authError=oauthErrorFromLocation();
        if(authError){
          clearSession();
          if(!cancelled){setState("error");setMessage(`Discord sign-in was not completed: ${authError}`);}
          history.replaceState({},document.title,window.location.pathname);
          return;
        }
        const returned=sessionFromHash();
        if(returned){
          history.replaceState({},document.title,window.location.pathname);
          if(!cancelled)await finishSignedIn(returned);
          return;
        }
        let stored=readStoredSession();
        if(!stored){if(!cancelled){setState("signed-out");setMessage("Sign in with Discord to open your private Hanami school desk.");}return;}
        if(stored.expiresAt-Date.now()<120000){
          stored=await refreshSession(stored);
          if(!stored){clearSession();if(!cancelled){setState("signed-out");setMessage("Your previous session expired. Sign in with Discord again.");}return;}
        }
        if(!cancelled)await finishSignedIn(stored);
      }catch(error){
        clearSession();
        if(!cancelled){setState("error");setMessage(error instanceof Error?error.message:"The Hanami session could not be restored.");}
      }
    }
    initialize();
    return()=>{cancelled=true;};
  },[finishSignedIn]);

  function signIn(){
    const redirectTo=`${window.location.origin}${window.location.pathname}`;
    const url=new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    url.searchParams.set("provider","discord");
    url.searchParams.set("redirect_to",redirectTo);
    window.location.assign(url.toString());
  }
  function signOut(){
    clearSession();
    setProfile(null);
    setSession(null);
    setState("signed-out");
    setMessage("Signed out on this device. Your Hanami account and characters remain safely stored.");
  }

  return <>
    <div className={`portal-status portal-status-${state}`} aria-live="polite"><strong>{state==="checking"?"CHECKING SESSION":state==="signed-in"?"SIGNED IN":state==="error"?"SIGN-IN NOTICE":"DISCORD ACCESS"}</strong><span>{message}</span></div>
    {state==="signed-in"&&session?<div className={styles.accountCard}><p className="eyebrow">CURRENT HANAMI ACCOUNT</p><h2>{profile?.display_name??"Hanami Member"}</h2>{profile?.discord_username&&<p className={styles.handle}>@{profile.discord_username}</p>}<p className={styles.note}>Authentication only uses Discord for identity. School communication stays inside Hanami High.</p><CharacterManager accessToken={session.accessToken}/><button className={`secondary-action ${styles.signout}`} type="button" onClick={signOut}>Sign out on this device</button></div>:<button className="discord-button" type="button" onClick={signIn} disabled={state==="checking"}><span>◉</span>{state==="checking"?" Checking session…":" Continue with Discord"}</button>}
    <small>Hanami High never asks for a portal password and never displays your Discord email address. Access to private school data is enforced by Supabase Row Level Security.</small>
  </>;
}
