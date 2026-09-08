import { type FormEvent, type PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { isLockscreenUnlocked, markLockscreenUnlocked } from '../lib/lockscreenSession'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { MyLockscreenStatus } from '../types/database-lockscreen'

function tokyoClock(date:Date){
  return {
    time:new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',minute:'2-digit'}).format(date),
    date:new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',weekday:'long',month:'long',day:'numeric'}).format(date),
  }
}

export function AccountLockGate({children}:PropsWithChildren){
  const {account,signOut}=useIdentity()
  const [status,setStatus]=useState<MyLockscreenStatus|null>(null)
  const [wallpaperUrl,setWallpaperUrl]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [pin,setPin]=useState('')
  const [working,setWorking]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const [now,setNow]=useState(()=>new Date())

  const locallyUnlocked=Boolean(account&&isLockscreenUnlocked(account.id))

  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),30000);return()=>window.clearInterval(timer)},[])
  useEffect(()=>{
    let active=true
    async function load(){
      const client=supabase
      if(!client||!account){if(active){setStatus(null);setLoading(false)};return}
      setLoading(true);setError(null)
      const {data,error:statusError}=await client.rpc('my_lockscreen_status')
      if(!active)return
      if(statusError){setError(statusError.message);setLoading(false);return}
      const next=(data?.[0]??{lock_enabled:false,wallpaper_path:null,pin_issued_at:null,locked_until:null}) as MyLockscreenStatus
      setStatus(next)
      if(next.wallpaper_path){const signed=await client.storage.from('lockscreen-wallpapers').createSignedUrl(next.wallpaper_path,3600);if(active&&!signed.error)setWallpaperUrl(signed.data.signedUrl)}else setWallpaperUrl(null)
      setLoading(false)
    }
    void load();return()=>{active=false}
  },[account])

  const clock=useMemo(()=>tokyoClock(now),[now])

  async function unlock(event:FormEvent){
    event.preventDefault();const client=supabase;if(!client||!account||pin.length!==6)return
    setWorking(true);setError(null)
    const {data,error:verifyError}=await client.rpc('verify_my_lockscreen_pin',{p_pin:pin})
    setWorking(false)
    if(verifyError){setPin('');setError(verifyError.message);return}
    if(!data){setPin('');setError('That PIN was not accepted. Please try again.');return}
    markLockscreenUnlocked(account.id);setPin('')
  }

  if(loading)return <main className="account-lockscreen account-lockscreen-loading"><div><strong>Opening your Hanami lock screen…</strong><span>Checking this account’s device-style privacy settings.</span></div></main>
  if(error&&!status)return <main className="account-lockscreen account-lockscreen-loading"><div><strong>Lock screen unavailable</strong><span>{error}</span><button type="button" onClick={()=>void signOut()}>Sign out</button></div></main>
  if(!status?.lock_enabled||locallyUnlocked)return <>{children}</>

  return <main className="account-lockscreen" style={wallpaperUrl?{backgroundImage:`linear-gradient(rgba(28,35,49,.18),rgba(28,35,49,.42)),url(${wallpaperUrl})`}:undefined}>
    <div className="account-lockscreen-shade"/>
    <section className="account-lockscreen-clock"><strong>{clock.time}</strong><span>{clock.date} · Tokyo</span></section>
    <section className="account-lockscreen-card">
      <div className="account-lockscreen-avatar">✿</div>
      <span className="eyebrow">HANAMI HIGH · ACCOUNT LOCK</span>
      <h1>{account?.discord_username||'Hanami Member'}</h1>
      <p>Enter the six-digit PIN issued by the Owner to unlock this Hanami session.</p>
      <form onSubmit={unlock}>
        <input aria-label="Six-digit Hanami PIN" autoFocus autoComplete="off" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="••••••" type="password" value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,6))}/>
        <button type="submit" disabled={working||pin.length!==6}>{working?'Unlocking…':'Unlock Hanami'}</button>
      </form>
      {error&&<div className="account-lockscreen-error">{error}</div>}
      <footer><span>PINs are issued and rotated by the Owner.</span><button type="button" onClick={()=>void signOut()}>Sign out</button></footer>
    </section>
  </main>
}
