import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import { GuestView } from './GuestView'
import { StudentPortal } from './StudentPortal'
import { FacultyPortal } from './FacultyPortal'
import { CampusLifePortal } from './CampusLifePortal'
import { SocialExtrasPortal } from './SocialExtrasPortal'
import { ManagementPortal } from './ManagementPortal'

type PortalKind='student'|'faculty'|'campus'|'social'|'owner'|'admin'|'moderator'
type FlagRow={flag_key:string;label:string;description:string;enabled:boolean}

const defaults:Record<PortalKind,string>={student:'today',faculty:'today',campus:'chronicle',social:'status-history',owner:'overview',admin:'overview',moderator:'reports'}
const flagForHash=(hash:string)=>{
 if(hash.startsWith('#/boutique/'))return'boutique'
 if(hash.startsWith('#/hanami-plus/labs'))return'labs'
 if(hash.startsWith('#/hanami-plus/marketplace')||hash.startsWith('#/hanami-plus/creators')||hash.startsWith('#/hanami-plus/following')||hash.startsWith('#/hanami-plus/creator-')||hash.startsWith('#/hanami-plus/remix')||hash.startsWith('#/hanami-plus/component'))return'creator_marketplace'
 if(hash.startsWith('#/hanami-plus/'))return'hanami_plus'
 if(hash.startsWith('#/profile/guestbook'))return'guestbook'
 if(hash.startsWith('#/campus/clubs'))return'clubs'
 if(hash.startsWith('#/profile/view-profile'))return'public_profiles'
 return null
}
function humanizeHash(hash:string){const parts=hash.replace(/^#\/?/,'').split('/').filter(Boolean);if(!parts.length)return'Hanami Home';return parts.map(p=>decodeURIComponent(p).replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase())).join(' · ')}
function portalRoute(){const match=window.location.hash.match(/^#\/portal\/(student|faculty|campus|social|owner|admin|moderator)(?:\/([^/]+))?/);if(!match)return null;const kind=match[1] as PortalKind;return{kind,mode:match[2]?decodeURIComponent(match[2]):defaults[kind]}}
function openPortal(kind:PortalKind,mode?:string){window.location.hash=`#/portal/${kind}/${mode||defaults[kind]}`}

export function PortalExpansionLayer(){
 const {session,account,activeCharacter,roles,capabilities,ownerMode,adminMode}=useIdentity();const client=supabase as any
 const [hash,setHash]=useState(()=>window.location.hash);const [menu,setMenu]=useState(false);const [flags,setFlags]=useState<FlagRow[]>([]);const [notice,setNotice]=useState<string|null>(null)
 useEffect(()=>{const sync=()=>{setHash(window.location.hash);setMenu(false);setNotice(null)};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
 useEffect(()=>{if(!client||!session||!account)return;let alive=true;(async()=>{const r=await client.from('school_feature_flags').select('flag_key,label,description,enabled').order('flag_key');if(alive&&!r.error)setFlags(r.data||[])})();return()=>{alive=false}},[client,session?.user.id,account?.id])
 const route=useMemo(portalRoute,[hash]);const guest=hash.startsWith('#/guest/');const role=activeCharacter?.school_role||'';const canStudent=Boolean(activeCharacter&&['student','new_student'].includes(role));const canFaculty=Boolean(activeCharacter&&role==='teacher');const canOwner=ownerMode&&roles.includes('owner');const canAdmin=adminMode&&roles.includes('platform_admin');const canModerate=roles.includes('moderator')&&(capabilities.includes('moderation.review_reports')||capabilities.includes('moderation.take_action')||ownerMode||adminMode)
 const disabledFlag=useMemo(()=>{if(!session||ownerMode||adminMode||hash.startsWith('#/portal/'))return null;const key=flagForHash(hash);return key?flags.find(f=>f.flag_key===key&&f.enabled===false)||null:null},[session,ownerMode,adminMode,hash,flags])

 const recordRecent=useCallback(async(nextHash:string)=>{if(!client||!account||!activeCharacter||!nextHash.startsWith('#/')||nextHash.startsWith('#/guest/')||nextHash.startsWith('#/portal/'))return;const parts=nextHash.replace(/^#\/?/,'').split('/');const type=parts[0]||'page';const id=nextHash;await client.from('recent_views').upsert({account_id:account.id,character_id:activeCharacter.id,resource_type:type,resource_id:id,label:humanizeHash(nextHash),route_hash:nextHash,viewed_at:new Date().toISOString()},{onConflict:'account_id,resource_type,resource_id'})},[client,account?.id,activeCharacter?.id])
 useEffect(()=>{void recordRecent(hash)},[hash,recordRecent])

 async function bookmarkPage(){if(!client||!account||!activeCharacter)return;const routeHash=hash.startsWith('#/portal/')?'#/home/overview':hash||'#/home/overview';const r=await client.from('global_bookmarks').upsert({account_id:account.id,character_id:activeCharacter.id,resource_type:'page',resource_id:routeHash,label:humanizeHash(routeHash),route_hash:routeHash},{onConflict:'account_id,resource_type,resource_id'});if(r.error){setNotice(r.error.message);return}setNotice('Page bookmarked.');setTimeout(()=>setNotice(null),2200)}
 function close(){window.location.hash='#/home/overview'}
 function setMode(mode:string){if(route)openPortal(route.kind,mode)}

 if(guest)return <div className="portal-expansion-overlay guest-overlay"><GuestView/></div>

 let portal:React.ReactNode=null
 if(route){
  if(route.kind==='student'&&canStudent)portal=<StudentPortal mode={route.mode as any} onMode={m=>setMode(m)} onClose={close}/>
  else if(route.kind==='faculty'&&canFaculty)portal=<FacultyPortal mode={route.mode as any} onMode={m=>setMode(m)} onClose={close}/>
  else if(route.kind==='campus'&&activeCharacter)portal=<CampusLifePortal mode={route.mode as any} onMode={m=>setMode(m)} onClose={close}/>
  else if(route.kind==='social'&&activeCharacter)portal=<SocialExtrasPortal mode={route.mode as any} onMode={m=>setMode(m)} onClose={close}/>
  else if(route.kind==='owner'&&canOwner)portal=<ManagementPortal kind="owner" mode={route.mode} onMode={m=>setMode(m)} onClose={()=>window.location.hash='#/home/overview'}/>
  else if(route.kind==='admin'&&canAdmin)portal=<ManagementPortal kind="admin" mode={route.mode} onMode={m=>setMode(m)} onClose={()=>window.location.hash='#/home/overview'}/>
  else if(route.kind==='moderator'&&canModerate)portal=<ManagementPortal kind="moderator" mode={route.mode} onMode={m=>setMode(m)} onClose={close}/>
  else portal=<section className="portal-window portal-access-denied"><header className="portal-titlebar"><div><span>HANAMI HIGH</span><strong>Portal unavailable</strong></div><button onClick={close}>×</button></header><div className="portal-access-message"><span>ACCESS CHECK</span><h1>This portal does not belong to the current role.</h1><p>Switch to the appropriate character or account-level access mode, then try again.</p><button onClick={close}>Return to Hanami</button></div></section>
 }

 return <>{portal&&<div className="portal-expansion-overlay" role="presentation">{portal}</div>}{disabledFlag&&<div className="feature-disabled-overlay"><section><span>HANAMI NETWORK NOTICE</span><h2>{disabledFlag.label} is temporarily unavailable.</h2><p>{disabledFlag.description}</p><small>This feature has been disabled by school/platform management.</small><button onClick={()=>{window.location.hash='#/home/overview'}}>Return home</button></section></div>}{session&&account&&<div className="portal-launch-cluster">{notice&&<div className="portal-toast">{notice}</div>}{menu&&<div className="portal-launch-menu"><header><span>SCHOOL TOOLS</span><strong>Open a workspace</strong></header>{canStudent&&<button onClick={()=>openPortal('student')}><b>🎓 Student Portal</b><span>Today, planner, ID, progress, mail, Passport</span></button>}{canFaculty&&<button onClick={()=>openPortal('faculty')}><b>🍎 Faculty Portal</b><span>Gradebook, seating, planning, office hours</span></button>}{activeCharacter&&<button onClick={()=>openPortal('campus')}><b>✿ Campus Life</b><span>Chronicle, Yearbook, radio, Photo Booth & more</span></button>}{activeCharacter&&<button onClick={()=>openPortal('social')}><b>♡ Social Extras</b><span>Status history, polls, reposts, memories</span></button>}{canOwner&&<button onClick={()=>openPortal('owner')}><b>◆ Owner Control Center</b><span>View As, economy, Boutique, seasonal events</span></button>}{canAdmin&&<button onClick={()=>openPortal('admin')}><b>▣ Administration Portal</b><span>Enrollment, faculty, calendar, announcements</span></button>}{canModerate&&<button onClick={()=>openPortal('moderator')}><b>⚑ Moderator Portal</b><span>Reports, content review, history</span></button>}{activeCharacter&&<button onClick={()=>void bookmarkPage()}><b>☆ Bookmark this page</b><span>{humanizeHash(hash||'#/home/overview')}</span></button>}<button onClick={()=>{window.location.hash='#/portal/student/help'}} disabled={!canStudent}><b>? Help Center</b><span>Hanami guides and support information</span></button></div>}<button className="portal-launcher" type="button" onClick={()=>setMenu(v=>!v)} aria-expanded={menu}><span>花</span><b>School Tools</b></button></div>}</>
}
