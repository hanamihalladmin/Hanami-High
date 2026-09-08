import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { ConversationMember, ConversationThread, Json } from '../types/database'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type {
  AccountNotificationProfile,
  CharacterDashboardCustomization,
  CharacterMessageCustomization,
  ConversationMemberOrganization,
} from '../types/database-dashboard-messaging'
import { ShellTopbar } from './ShellTopbar'

type Props = { onSearch: () => void; onNotifications: () => void; unreadCount: number }
type Tab = 'dashboard' | 'messages' | 'inbox' | 'notifications'

function asObject(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, Json | undefined> : {}
}
function asLinks(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

const widgetLabels: Record<string,string> = {
  school_id: 'School ID', today: 'Today at Hanami', note: 'Little Note', schedule: 'Schedule', announcement: 'Announcement', calendar: 'Calendar', petals: 'Petals & Hanami+',
}

export function InterfaceCustomizationStudio({ onSearch,onNotifications,unreadCount }: Props) {
  const { account,activeCharacter } = useIdentity()
  const [tab,setTab] = useState<Tab>('dashboard')
  const [snapshot,setSnapshot] = useState<HanamiPlusHubSnapshot|null>(null)
  const [dashboard,setDashboard] = useState<CharacterDashboardCustomization|null>(null)
  const [messages,setMessages] = useState<CharacterMessageCustomization|null>(null)
  const [members,setMembers] = useState<ConversationMember[]>([])
  const [threads,setThreads] = useState<ConversationThread[]>([])
  const [organization,setOrganization] = useState<ConversationMemberOrganization[]>([])
  const [profiles,setProfiles] = useState<AccountNotificationProfile[]>([])
  const [loading,setLoading] = useState(true)
  const [working,setWorking] = useState<string|null>(null)
  const [error,setError] = useState<string|null>(null)
  const [notice,setNotice] = useState<string|null>(null)
  const [profileDraft,setProfileDraft] = useState({ name:'', kind:'custom' as AccountNotificationProfile['profile_kind'], messages:true, social:true, school:true })

  const load = useCallback(async()=>{
    const client=supabase
    if(!client||!account||!activeCharacter)return
    setLoading(true);setError(null)
    const hub=await client.rpc('current_hanami_plus_hub')
    if(hub.error){setLoading(false);setError(hub.error.message);return}
    const nextSnapshot=hub.data?.[0]??null
    setSnapshot(nextSnapshot)
    if(nextSnapshot?.active){
      const ensure=await client.rpc('ensure_my_plus_interface_customization',{p_character_id:activeCharacter.id})
      if(ensure.error){setLoading(false);setError(ensure.error.message);return}
    }
    const [dashResult,msgResult,memberResult,orgResult,profileResult]=await Promise.all([
      client.from('character_dashboard_customization').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
      client.from('character_message_customization').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
      client.from('conversation_members').select('*').eq('character_id',activeCharacter.id),
      client.from('conversation_member_organization').select('*').eq('character_id',activeCharacter.id),
      client.from('account_notification_profiles').select('*').eq('account_id',account.id).order('updated_at',{ascending:false}),
    ])
    const first=dashResult.error||msgResult.error||memberResult.error||orgResult.error||profileResult.error
    if(first){setLoading(false);setError(first.message);return}
    setDashboard(dashResult.data);setMessages(msgResult.data);setMembers(memberResult.data??[]);setOrganization(orgResult.data??[]);setProfiles(profileResult.data??[])
    const ids=(memberResult.data??[]).map(row=>row.conversation_id)
    if(ids.length){
      const threadResult=await client.from('conversation_threads').select('*').in('id',ids).order('last_message_at',{ascending:false})
      if(threadResult.error)setError(threadResult.error.message);else setThreads(threadResult.data??[])
    }else setThreads([])
    setLoading(false)
  },[account,activeCharacter])

  useEffect(()=>{void load()},[load])
  const plusActive=Boolean(snapshot?.active)

  async function updateDashboard(patch:Partial<CharacterDashboardCustomization>){
    const client=supabase;if(!client||!activeCharacter||!plusActive)return
    setWorking('dashboard');setError(null);setNotice(null)
    const result=await client.from('character_dashboard_customization').update(patch).eq('character_id',activeCharacter.id)
    setWorking(null);if(result.error)return setError(result.error.message)
    setDashboard(current=>current?{...current,...patch}:current);setNotice('Dashboard customization saved.')
  }
  async function updateMessages(patch:Partial<CharacterMessageCustomization>){
    const client=supabase;if(!client||!activeCharacter||!plusActive)return
    setWorking('messages');setError(null);setNotice(null)
    const result=await client.from('character_message_customization').update(patch).eq('character_id',activeCharacter.id)
    setWorking(null);if(result.error)return setError(result.error.message)
    setMessages(current=>current?{...current,...patch}:current);setNotice('Message appearance saved.')
  }
  async function updateConversation(threadId:string,patch:Partial<ConversationMemberOrganization>){
    const client=supabase;if(!client||!activeCharacter)return
    setWorking(`thread:${threadId}`);setError(null);setNotice(null)
    const existing=organization.find(row=>row.conversation_id===threadId)
    const result=await client.from('conversation_member_organization').upsert({
      conversation_id:threadId,character_id:activeCharacter.id,
      folder_name:patch.folder_name??existing?.folder_name??null,pinned:patch.pinned??existing?.pinned??false,
      muted:patch.muted??existing?.muted??false,archived:patch.archived??existing?.archived??false,
    },{onConflict:'conversation_id,character_id'})
    setWorking(null);if(result.error)return setError(result.error.message)
    setNotice('Conversation organization saved.');await load()
  }
  async function createProfile(){
    const client=supabase;if(!client||!account||!plusActive||!profileDraft.name.trim())return
    setWorking('profile');setError(null);setNotice(null)
    const result=await client.from('account_notification_profiles').insert({account_id:account.id,profile_name:profileDraft.name.trim(),profile_kind:profileDraft.kind,notify_messages:profileDraft.messages,notify_social:profileDraft.social,notify_school:profileDraft.school})
    setWorking(null);if(result.error)return setError(result.error.message)
    setProfileDraft({name:'',kind:'custom',messages:true,social:true,school:true});setNotice('Notification profile created.');await load()
  }
  async function applyProfile(id:string){
    const client=supabase;if(!client)return
    setWorking(`apply:${id}`);setError(null);setNotice(null)
    const result=await client.rpc('apply_notification_profile',{p_profile_id:id})
    setWorking(null);if(result.error)return setError(result.error.message)
    setNotice('Notification profile applied to your account preferences.')
  }

  const visibility=useMemo(()=>asObject(dashboard?.widget_visibility??{}),[dashboard?.widget_visibility])
  const links=useMemo(()=>asLinks(dashboard?.quick_links??[]),[dashboard?.quick_links])
  const threadLabel=(thread:ConversationThread)=>thread.title|| (thread.conversation_type==='group'?'Group conversation':'Direct message')

  if(!activeCharacter)return null
  return <main className="interface-studio-page">
    <ShellTopbar eyebrow="HANAMI+ · INTERFACE STUDIO" title="Dashboard & Messages" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <section className="interface-studio-hero"><div><span className="eyebrow">YOUR CAMPUS INTERFACE</span><h1>Make the network feel like yours.</h1><p>Arrange your dashboard, style your character’s messages, organize conversations, and save notification modes.</p></div><div className={plusActive?'interface-plus active':'interface-plus'}><span>{plusActive?'CREATIVE EDITING':'SAVED VIEW'}</span><strong>{plusActive?'Hanami+ active':'Hanami standard'}</strong><small>Inbox folders remain available to everyone. Creative appearance editing uses Hanami+.</small></div></section>
    <nav className="interface-studio-tabs">{(['dashboard','messages','inbox','notifications'] as Tab[]).map(item=><button type="button" key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item==='dashboard'?'Dashboard':item==='messages'?'Message Style':item==='inbox'?'Inbox Organizer':'Notification Profiles'}</button>)}</nav>
    {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
    {loading?<section className="interface-loading">Opening Interface Studio…</section>:<>
      {tab==='dashboard'&&<section className="interface-editor-grid"><div className="interface-panel"><span className="eyebrow">LAYOUT & THEME</span>{dashboard?<div className="interface-form"><label>Dashboard layout<select disabled={!plusActive} value={dashboard.layout_style} onChange={e=>void updateDashboard({layout_style:e.target.value as CharacterDashboardCustomization['layout_style']})}><option value="classic">Classic</option><option value="balanced">Balanced</option><option value="focus">Focus</option><option value="social">Social</option><option value="compact">Compact</option></select></label><label>Dashboard theme<select disabled={!plusActive} value={dashboard.theme_key} onChange={e=>void updateDashboard({theme_key:e.target.value as CharacterDashboardCustomization['theme_key']})}><option value="hanami-classic">Hanami Classic</option><option value="sage-study">Sage Study</option><option value="navy-night">Navy Night</option><option value="rose-notebook">Rose Notebook</option><option value="ivory-campus">Ivory Campus</option><option value="pixel-2006">Pixel 2006</option></select></label><label>Wallpaper URL<input disabled={!plusActive} value={dashboard.wallpaper_url??''} onChange={e=>setDashboard({...dashboard,wallpaper_url:e.target.value})} onBlur={()=>void updateDashboard({wallpaper_url:dashboard.wallpaper_url||null})} placeholder="Optional image URL"/></label></div>:<p>Activate Hanami+ once to initialize dashboard customization.</p>}</div><div className="interface-panel"><span className="eyebrow">VISIBLE WIDGETS</span><div className="interface-check-grid">{Object.entries(widgetLabels).map(([key,label])=><label key={key}><input type="checkbox" disabled={!plusActive||!dashboard} checked={visibility[key]!==false} onChange={e=>void updateDashboard({widget_visibility:{...visibility,[key]:e.target.checked}})}/>{label}</label>)}</div></div><div className="interface-panel interface-quick-links"><span className="eyebrow">QUICK SWITCH</span><p>Choose up to six routes for the small floating shortcut bar on Home.</p>{dashboard&&<div>{links.map((link,index)=><label key={index}>Shortcut {index+1}<input disabled={!plusActive} value={link} onChange={e=>{const next=[...links];next[index]=e.target.value;setDashboard({...dashboard,quick_links:next})}} onBlur={()=>void updateDashboard({quick_links:links})}/></label>)}{links.length<6&&<button type="button" disabled={!plusActive} onClick={()=>void updateDashboard({quick_links:[...links,'#/social/feed']})}>+ Add shortcut</button>}</div>}</div></section>}
      {tab==='messages'&&<section className="interface-editor-grid">{messages?<><div className="interface-panel"><span className="eyebrow">MESSAGE LOOK</span><div className="interface-form"><label>Bubble style<select disabled={!plusActive} value={messages.bubble_style} onChange={e=>void updateMessages({bubble_style:e.target.value as CharacterMessageCustomization['bubble_style']})}><option value="classic">Classic</option><option value="soft">Soft</option><option value="compact">Compact</option><option value="notebook">Notebook</option><option value="pixel">Pixel</option><option value="rounded-card">Rounded Card</option></select></label><label>Font<select disabled={!plusActive} value={messages.message_font} onChange={e=>void updateMessages({message_font:e.target.value as CharacterMessageCustomization['message_font']})}><option value="system">System</option><option value="serif">Serif</option><option value="mono">Mono</option><option value="rounded">Rounded</option><option value="handwritten">Handwritten</option></select></label><label>Accent<select disabled={!plusActive} value={messages.accent_key} onChange={e=>void updateMessages({accent_key:e.target.value as CharacterMessageCustomization['accent_key']})}><option value="rose">Rose</option><option value="sage">Sage</option><option value="navy">Navy</option><option value="ivory">Ivory</option><option value="lavender">Lavender</option><option value="bluebell">Bluebell</option></select></label></div></div><div className="interface-panel"><span className="eyebrow">CONVERSATION CANVAS</span><div className="interface-form"><label>DM background URL<input disabled={!plusActive} value={messages.dm_background_url??''} onChange={e=>setMessages({...messages,dm_background_url:e.target.value})} onBlur={()=>void updateMessages({dm_background_url:messages.dm_background_url||null})}/></label><label>Timestamps<select disabled={!plusActive} value={messages.timestamp_style} onChange={e=>void updateMessages({timestamp_style:e.target.value as CharacterMessageCustomization['timestamp_style']})}><option value="compact">Compact</option><option value="full">Full</option><option value="minimal">Minimal</option><option value="hidden">Hidden</option></select></label><label>Arrival effect<select disabled={!plusActive} value={messages.message_effect} onChange={e=>void updateMessages({message_effect:e.target.value as CharacterMessageCustomization['message_effect']})}><option value="none">None</option><option value="soft-fade">Soft Fade</option><option value="sparkle-arrival">Sparkle Arrival</option><option value="slide-in">Slide In</option></select></label></div></div></>:<div className="interface-panel"><p>Activate Hanami+ once to initialize message appearance.</p></div>}</section>}
      {tab==='inbox'&&<section className="interface-panel interface-inbox-panel"><header><div><span className="eyebrow">CORE ORGANIZATION</span><h2>Conversation organizer</h2><p>Pin, mute, archive, or place conversations into named folders. These controls do not require Hanami+.</p></div><strong>{threads.length}</strong></header><div className="interface-thread-list">{threads.length?threads.map(thread=>{const org=organization.find(row=>row.conversation_id===thread.id);return <article key={thread.id}><div><strong>{threadLabel(thread)}</strong><small>{thread.conversation_type} · {new Date(thread.last_message_at).toLocaleDateString()}</small></div><label>Folder<input maxLength={32} value={org?.folder_name??''} onChange={e=>setOrganization(current=>{const rest=current.filter(row=>row.conversation_id!==thread.id);return [...rest,{conversation_id:thread.id,character_id:activeCharacter.id,folder_name:e.target.value,pinned:org?.pinned??false,muted:org?.muted??false,archived:org?.archived??false,created_at:org?.created_at??'',updated_at:org?.updated_at??''}]})} onBlur={()=>void updateConversation(thread.id,{folder_name:organization.find(row=>row.conversation_id===thread.id)?.folder_name||null})}/></label><div className="interface-thread-toggles"><button type="button" className={org?.pinned?'active':''} onClick={()=>void updateConversation(thread.id,{pinned:!org?.pinned})}>★ Pin</button><button type="button" className={org?.muted?'active':''} onClick={()=>void updateConversation(thread.id,{muted:!org?.muted})}>Mute</button><button type="button" className={org?.archived?'active':''} onClick={()=>void updateConversation(thread.id,{archived:!org?.archived})}>Archive</button></div></article>}):<p>No conversations yet.</p>}</div></section>}
      {tab==='notifications'&&<section className="interface-editor-grid"><div className="interface-panel"><span className="eyebrow">NEW PRESET</span><p>Save combinations of the existing Messages, Social, and School notification switches.</p><div className="interface-form"><label>Profile name<input disabled={!plusActive} value={profileDraft.name} onChange={e=>setProfileDraft({...profileDraft,name:e.target.value})}/></label><label>Profile type<select disabled={!plusActive} value={profileDraft.kind} onChange={e=>setProfileDraft({...profileDraft,kind:e.target.value as AccountNotificationProfile['profile_kind']})}><option value="custom">Custom</option><option value="focus">Focus</option><option value="social">Social</option><option value="school">School</option><option value="quiet">Quiet</option></select></label><div className="interface-check-grid"><label><input type="checkbox" checked={profileDraft.messages} disabled={!plusActive} onChange={e=>setProfileDraft({...profileDraft,messages:e.target.checked})}/>Messages</label><label><input type="checkbox" checked={profileDraft.social} disabled={!plusActive} onChange={e=>setProfileDraft({...profileDraft,social:e.target.checked})}/>Social</label><label><input type="checkbox" checked={profileDraft.school} disabled={!plusActive} onChange={e=>setProfileDraft({...profileDraft,school:e.target.checked})}/>School</label></div><button type="button" disabled={!plusActive||working==='profile'||!profileDraft.name.trim()} onClick={()=>void createProfile()}>Save notification profile</button></div></div><div className="interface-panel"><span className="eyebrow">SAVED PROFILES</span><div className="notification-profile-list">{profiles.length?profiles.map(profile=><article key={profile.id}><div><strong>{profile.profile_name}</strong><small>{profile.profile_kind} · {profile.notify_messages?'messages ':''}{profile.notify_social?'social ':''}{profile.notify_school?'school':''}</small></div><button type="button" disabled={working===`apply:${profile.id}`} onClick={()=>void applyProfile(profile.id)}>Apply</button></article>):<p>No saved profiles yet.</p>}</div></div></section>}
    </>}
  </main>
}
