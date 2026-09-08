import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { OwnerLockscreenStatus } from '../types/database-lockscreen'

export function OwnerLockscreenPanel(){
  const {capabilities}=useIdentity()
  const [rows,setRows]=useState<OwnerLockscreenStatus[]>([])
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)
  const [issued,setIssued]=useState<{accountId:string;username:string;pin:string}|null>(null)
  const canManage=capabilities.includes('accounts.manage')

  const load=useCallback(async()=>{const client=supabase;if(!client)return;setLoading(true);setError(null);const {data,error:loadError}=await client.rpc('owner_account_lockscreen_statuses');if(loadError){setError(loadError.message);setLoading(false);return}setRows(data??[]);setLoading(false)},[])
  useEffect(()=>{void load()},[load])
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter(row=>!q||`${row.discord_username||''} ${row.account_id}`.toLowerCase().includes(q))},[query,rows])

  async function generate(row:OwnerLockscreenStatus){const client=supabase;if(!client)return;setWorking(row.account_id);setError(null);setNotice(null);setIssued(null);const {data,error:actionError}=await client.rpc('owner_generate_account_lockscreen_pin',{p_account_id:row.account_id});setWorking(null);if(actionError){setError(actionError.message);return}setIssued({accountId:row.account_id,username:row.discord_username||'Connected member',pin:data});setNotice(row.lock_enabled?'PIN rotated. The previous PIN no longer works.':'PIN generated. The account lock screen is now enabled.');await load()}
  async function disable(row:OwnerLockscreenStatus){const client=supabase;if(!client)return;if(!window.confirm(`Disable the Hanami lock screen for ${row.discord_username||'this account'}?`))return;setWorking(row.account_id);setError(null);setNotice(null);setIssued(null);const {error:actionError}=await client.rpc('owner_disable_account_lockscreen',{p_account_id:row.account_id});setWorking(null);if(actionError){setError(actionError.message);return}setNotice('Account lock screen disabled.');await load()}
  async function copyPin(){if(!issued)return;await navigator.clipboard.writeText(issued.pin);setNotice('PIN copied. Share it with the member through your approved private channel.')}

  return <section className="owner-lockscreen-panel">
    <header className="owner-lockscreen-heading"><div><span className="eyebrow">ACCOUNT LOCK SCREENS</span><h2>Owner PIN Console</h2><p>Generate or rotate member PINs. Students can customize only their wallpaper; they cannot create or change these PINs.</p></div><button type="button" onClick={()=>void load()} disabled={loading||Boolean(working)}>Refresh</button></header>
    {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
    {issued&&<section className="owner-issued-pin"><span className="eyebrow">SHOW ONCE · NEW PIN</span><h3>{issued.username}</h3><strong>{issued.pin}</strong><p>This readable PIN is only returned at generation time. Hanami stores a one-way hash after this.</p><div><button className="primary-action" type="button" onClick={()=>void copyPin()}>Copy PIN</button><button className="secondary-action" type="button" onClick={()=>setIssued(null)}>I’ve saved it</button></div></section>}
    <div className="owner-filter"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search Discord member or account ID…"/></div>
    <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Account</th><th>PIN</th><th>Wallpaper</th><th>Lockout</th><th>Owner actions</th></tr></thead><tbody>{filtered.map(row=><tr key={row.account_id}><td><strong>{row.discord_username||'Connected member'}</strong><small>{row.account_id}</small></td><td><span className={`owner-state ${row.lock_enabled?'active':'inactive'}`}>{row.lock_enabled?'enabled':'not issued'}</span><small>{row.pin_issued_at?`Issued ${new Date(row.pin_issued_at).toLocaleDateString()}`:'No PIN yet'}</small></td><td>{row.wallpaper_configured?'Custom':'Hanami default'}</td><td>{row.locked_until&&new Date(row.locked_until)>new Date()?`Until ${new Date(row.locked_until).toLocaleTimeString()}`:'Clear'}</td><td><div className="owner-lockscreen-actions"><button className="primary-action" type="button" disabled={!canManage||working===row.account_id} onClick={()=>void generate(row)}>{working===row.account_id?'Working…':row.lock_enabled?'Rotate PIN':'Generate PIN'}</button>{row.lock_enabled&&<button className="secondary-action" type="button" disabled={!canManage||working===row.account_id} onClick={()=>void disable(row)}>Disable</button>}</div></td></tr>)}</tbody></table></div>
    {!loading&&filtered.length===0&&<div className="owner-empty">No matching accounts.</div>}
  </section>
}
