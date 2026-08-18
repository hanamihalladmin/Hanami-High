"use client";

import {FormEvent,useCallback,useEffect,useState} from "react";
import PrivilegedPortalLogin from "../PrivilegedPortalLogin";
import styles from "./OwnerPortalClient.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
type PortalSession={accessToken:string;refreshToken:string;expiresAt:number;tokenType:string};
function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function readSession():PortalSession|null{try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const value=JSON.parse(raw) as Partial<PortalSession>;if(typeof value.accessToken!=="string"||typeof value.refreshToken!=="string"||typeof value.expiresAt!=="number")return null;return {accessToken:value.accessToken,refreshToken:value.refreshToken,expiresAt:value.expiresAt,tokenType:value.tokenType??"bearer"};}catch{return null;}}

export default function OwnerPortalClient(){
 const [session,setSession]=useState<PortalSession|null>(null);
 const [state,setState]=useState<"loading"|"signin"|"ready"|"blocked">("loading");
 const [message,setMessage]=useState("Checking Owner identity…");
 const [adminHandle,setAdminHandle]=useState("");
 const [adminPassword,setAdminPassword]=useState("");
 const [adminDiscordId,setAdminDiscordId]=useState("");
 const [saving,setSaving]=useState(false);

 const initialize=useCallback(async()=>{
  const stored=readSession();
  if(!stored){setState("blocked");setMessage("Sign in through the Hanami Portal Gateway first.");return;}
  setSession(stored);
  const [ownerResponse,privilegedResponse]=await Promise.all([
   fetch(`${SUPABASE_URL}/rest/v1/rpc/current_owner_status`,{method:"POST",headers:headers(stored.accessToken,{"Content-Type":"application/json"}),body:"{}"}),
   fetch(`${SUPABASE_URL}/rest/v1/rpc/has_privileged_portal_session`,{method:"POST",headers:headers(stored.accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({requested_portal:"owner"})})
  ]);
  if(!ownerResponse.ok||!privilegedResponse.ok){setState("blocked");setMessage("Owner access could not be verified.");return;}
  const isOwner=Boolean(await ownerResponse.json());
  if(!isOwner){setState("blocked");setMessage("This Discord account is not the configured Hanami Owner account.");return;}
  const privileged=Boolean(await privilegedResponse.json());
  if(!privileged){setState("signin");setMessage("Owner identity confirmed. Enter the separate Owner credentials.");return;}
  setState("ready");
  setMessage("Owner identity and privileged sign-in verified.");
 },[]);
 useEffect(()=>{initialize();},[initialize]);

 async function createAdmin(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!session||saving)return;
  setSaving(true);setMessage("Creating administrator credential…");
  try{
   const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_create_admin_credential`,{method:"POST",headers:headers(session.accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({requested_handle:adminHandle.trim().toLowerCase(),requested_password:adminPassword,target_discord_user_id:adminDiscordId.trim()})});
   if(!response.ok)throw new Error("Administrator credential could not be created. Use a unique handle, 12+ character password, and the administrator's Discord user ID.");
   setAdminHandle("");setAdminPassword("");setAdminDiscordId("");
   setMessage("Administrator credential created and bound to that Discord user ID.");
  }catch(error){setMessage(error instanceof Error?error.message:"Administrator credential could not be created.");}
  finally{setSaving(false);}
 }
 async function lockOwner(){
  if(session)await fetch(`${SUPABASE_URL}/rest/v1/rpc/end_privileged_portal_session`,{method:"POST",headers:headers(session.accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({requested_portal:"owner"})});
  setState("signin");setMessage("Owner portal locked. Normal Hanami sign-in remains active.");
 }

 if(state==="signin")return <PrivilegedPortalLogin portalKind="owner" allowOwnerBootstrap onUnlocked={initialize}/>;
 if(state!=="ready"||!session)return <section className="portal-account-card"><p className="eyebrow">OWNER PORTAL</p><h2>{state==="loading"?"Verifying Owner access…":"Owner access unavailable"}</h2><p>{message}</p><a className="secondary-action" href="../">Return to Portal Gateway</a></section>;

 return <div className={styles.ownerShell}>
  <section className={styles.topBar}>
   <div><strong>Owner Control Center</strong><span>{message} • Owner controls are separate from Student, Faculty, and Administration roles.</span></div>
   <div className={styles.actions}><a href="../">Portal Gateway</a><button type="button" onClick={lockOwner}>Lock Owner Portal</button></div>
  </section>

  <div className={styles.grid}>
   <section className={`${styles.panel} ${styles.ownerOnly}`}>
    <div className={styles.label}>NETWORK OVERVIEW</div>
    <h3>Owner authority</h3>
    <p>This control center is available only after both the configured Owner Discord identity and the separate Owner handle/password have been verified.</p>
    <div className={styles.statusList}>
     <div className={styles.statusRow}><strong>Discord Owner identity</strong><span>VERIFIED</span></div>
     <div className={styles.statusRow}><strong>Owner credential gate</strong><span>UNLOCKED</span></div>
     <div className={styles.statusRow}><strong>Privileged session</strong><span>UP TO 8 HOURS</span></div>
     <div className={styles.statusRow}><strong>Character role required</strong><span>NO</span></div>
    </div>
   </section>

   <section className={styles.panel}>
    <div className={styles.label}>PORTAL ACCESS</div>
    <h3>Your network sections</h3>
    <p>These remain separate portals. Opening one does not convert the Owner portal into that role or remove your Owner authorization.</p>
    <div className={styles.portalGrid}>
     <a className={styles.portalCard} href="../admin/"><strong>Administration</strong><span>School operations, CMS, moderation, academics, Office Requests.</span></a>
     <a className={styles.portalCard} href="../student/"><strong>Student</strong><span>Open your active Student character portal when applicable.</span></a>
     <a className={styles.portalCard} href="../faculty/"><strong>Faculty</strong><span>Open your active Faculty or Owner-only TEST Faculty portal.</span></a>
    </div>
   </section>

   <section className={styles.panel}>
    <div className={styles.label}>ADMINISTRATOR PROVISIONING</div>
    <h3>Create a bound Administrator sign-in</h3>
    <p>Administrator credentials are a second gate and are bound to a specific Discord user account. Use a Discord user ID, not a Discord role ID.</p>
    <form className={styles.form} onSubmit={createAdmin}>
     <label><span>ADMIN HANDLE</span><input value={adminHandle} onChange={event=>setAdminHandle(event.target.value)} maxLength={32} required/></label>
     <label><span>ADMIN DISCORD USER ID</span><input value={adminDiscordId} onChange={event=>setAdminDiscordId(event.target.value)} inputMode="numeric" required/></label>
     <label><span>ADMIN PASSWORD • 12+ CHARACTERS</span><input type="password" value={adminPassword} onChange={event=>setAdminPassword(event.target.value)} minLength={12} required/></label>
     <button type="submit" disabled={saving}>{saving?"Saving…":"Create Administrator Credential"}</button>
    </form>
   </section>

   <section className={`${styles.panel} ${styles.ownerOnly}`}>
    <div className={styles.label}>OWNER TESTING</div>
    <h3>Owner-only test access</h3>
    <p>The TEST Faculty shortcut remains visible only to your Owner account. It lives in the Portal Gateway so test characters stay inside the same character-session flow as real characters.</p>
    <div className={styles.notice}>Go to the Portal Gateway → create or activate the Owner-only TEST Faculty character → enter the Faculty Portal. Ordinary users cannot see or call this fixture.</div>
    <div className={styles.actions} style={{marginTop:12}}><a href="../">Open Portal Gateway</a><a href="../faculty/">Open Faculty Portal</a></div>
   </section>
  </div>
  <div className={styles.notice} aria-live="polite">{message}</div>
 </div>;
}
