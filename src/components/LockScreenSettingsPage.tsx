import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { MyLockscreenStatus } from '../types/database-lockscreen'
import { ShellTopbar } from './ShellTopbar'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}

function extensionFor(file:File){
  if(file.type==='image/png')return 'png'
  if(file.type==='image/webp')return 'webp'
  if(file.type==='image/gif')return 'gif'
  return 'jpg'
}

export function LockScreenSettingsPage({onSearch,onNotifications,unreadCount}:Props){
  const {account}=useIdentity()
  const [status,setStatus]=useState<MyLockscreenStatus|null>(null)
  const [wallpaperUrl,setWallpaperUrl]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)

  const load=useCallback(async()=>{
    const client=supabase;if(!client||!account)return
    setLoading(true);setError(null)
    const {data,error:statusError}=await client.rpc('my_lockscreen_status')
    if(statusError){setError(statusError.message);setLoading(false);return}
    const next=(data?.[0]??{lock_enabled:false,wallpaper_path:null,pin_issued_at:null,locked_until:null}) as MyLockscreenStatus
    setStatus(next);setWallpaperUrl(null)
    if(next.wallpaper_path){const signed=await client.storage.from('lockscreen-wallpapers').createSignedUrl(next.wallpaper_path,3600);if(!signed.error)setWallpaperUrl(signed.data.signedUrl)}
    setLoading(false)
  },[account])
  useEffect(()=>{void load()},[load])

  async function chooseWallpaper(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';const client=supabase
    if(!client||!account||!file)return
    if(file.size>8*1024*1024){setError('Wallpaper files must be 8 MB or smaller.');return}
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){setError('Use a JPG, PNG, WebP, or GIF wallpaper.');return}
    setWorking(true);setError(null);setNotice(null)
    const oldPath=status?.wallpaper_path||null
    const path=`${account.id}/${crypto.randomUUID()}.${extensionFor(file)}`
    const uploaded=await client.storage.from('lockscreen-wallpapers').upload(path,file,{cacheControl:'3600',upsert:false})
    if(uploaded.error){setWorking(false);setError(uploaded.error.message);return}
    const saved=await client.rpc('set_my_lockscreen_wallpaper',{p_path:path})
    if(saved.error){await client.storage.from('lockscreen-wallpapers').remove([path]);setWorking(false);setError(saved.error.message);return}
    if(oldPath)await client.storage.from('lockscreen-wallpapers').remove([oldPath])
    setNotice('Your lock screen wallpaper was updated.');setWorking(false);await load()
  }

  async function removeWallpaper(){
    const client=supabase;if(!client)return
    setWorking(true);setError(null);setNotice(null)
    const oldPath=status?.wallpaper_path||null
    const result=await client.rpc('set_my_lockscreen_wallpaper',{p_path:''})
    if(result.error){setWorking(false);setError(result.error.message);return}
    if(oldPath)await client.storage.from('lockscreen-wallpapers').remove([oldPath])
    setNotice('Custom wallpaper removed. Hanami will use the default lock screen.');setWorking(false);await load()
  }

  return <main className="lockscreen-settings-page">
    <ShellTopbar eyebrow="SETTINGS · ACCOUNT" title="Lock Screen" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
    <section className="lockscreen-settings-hero"><div><span className="eyebrow">PERSONAL DEVICE FEEL</span><h1>Make your Hanami sign-in feel like your own device.</h1><p>Your wallpaper is account-wide because the lock screen appears before character selection. You can change the wallpaper yourself; only the Owner can generate or rotate the unlock PIN.</p></div><span className={`lockscreen-status-pill ${status?.lock_enabled?'enabled':'disabled'}`}>{status?.lock_enabled?'PIN enabled':'Awaiting Owner PIN'}</span></section>
    <div className="lockscreen-settings-grid">
      <section className="lockscreen-wallpaper-panel"><header><div><span className="eyebrow">WALLPAPER</span><h2>Your lock screen background</h2></div></header><div className="lockscreen-wallpaper-preview" style={wallpaperUrl?{backgroundImage:`linear-gradient(rgba(31,38,54,.15),rgba(31,38,54,.38)),url(${wallpaperUrl})`}:undefined}><div className="lockscreen-mini-clock"><strong>7:06</strong><span>Tuesday, April 7 · Tokyo</span></div><div className="lockscreen-mini-user">✿ <strong>{account?.discord_username||'Hanami Member'}</strong></div></div><div className="lockscreen-wallpaper-actions"><label className="primary-action"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={working} onChange={chooseWallpaper}/>{working?'Saving…':wallpaperUrl?'Change wallpaper':'Choose wallpaper'}</label><button className="secondary-action" type="button" disabled={working||!status?.wallpaper_path} onClick={()=>void removeWallpaper()}>Use Hanami default</button></div><small>JPG, PNG, WebP, or GIF · maximum 8 MB.</small></section>
      <aside className="lockscreen-settings-info"><section><span className="eyebrow">PIN CONTROL</span><h2>Owner-issued only</h2><p>Students cannot choose, reveal, or change their own PIN. The Owner generates a six-digit PIN and can rotate it if needed.</p><dl><div><dt>Status</dt><dd>{loading?'Checking…':status?.lock_enabled?'Enabled':'Not issued yet'}</dd></div><div><dt>Issued</dt><dd>{status?.pin_issued_at?new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',dateStyle:'medium'}).format(new Date(status.pin_issued_at)):'—'}</dd></div></dl></section><section><span className="eyebrow">HOW IT WORKS</span><h2>Discord → Lock Screen → Hanami</h2><p>Discord still authenticates your account. The Hanami PIN is a second, device-style privacy screen for entering the website after sign-in.</p>{status?.locked_until&&new Date(status.locked_until)>new Date()&&<div className="identity-notice error">PIN entry is temporarily locked after several incorrect attempts.</div>}</section></aside>
    </div>
  </main>
}
