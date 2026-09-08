import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { ProfileDesignCredit } from '../types/database-design-credits'

type RouteState={active:boolean;characterId:string|null}

function routeState(hash:string,activeCharacterId?:string):RouteState{
  const [section,subsection,target]=hash.replace(/^#\/?/,'').split('/')
  if(section!=='profile'||subsection!=='view-profile')return {active:false,characterId:null}
  return {active:true,characterId:target?decodeURIComponent(target):activeCharacterId||null}
}
function formatDate(value:string){return new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'short',day:'numeric',year:'numeric'}).format(new Date(value))}
function creatorHref(accountId:string){return `#/hanami-plus/creators/${encodeURIComponent(accountId)}`}

export function ProfileDesignCredits(){
  const {activeCharacter}=useIdentity()
  const [hash,setHash]=useState(window.location.hash)
  const [credits,setCredits]=useState<ProfileDesignCredit[]>([])
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(false)
  const route=useMemo(()=>routeState(hash,activeCharacter?.id),[hash,activeCharacter?.id])
  useEffect(()=>{const sync=()=>{setHash(window.location.hash);setOpen(false)};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
  const load=useCallback(async()=>{const client=supabase;if(!client||!route.active||!route.characterId){setCredits([]);return}setLoading(true);const result=await client.rpc('profile_design_credits',{p_character_id:route.characterId});setLoading(false);if(result.error){setCredits([]);return}setCredits(result.data??[])},[route.active,route.characterId])
  useEffect(()=>{void load()},[load])
  if(!route.active||!route.characterId||(!loading&&credits.length===0))return null
  const theme=credits.find(row=>row.credit_type==='theme')
  const components=credits.filter(row=>row.credit_type==='component')
  return <aside className={`profile-design-credits ${open?'open':''}`} aria-label="Profile design credits">
    <button className="profile-design-credits-toggle" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}><span>✦</span><strong>Design Credits</strong><small>{loading?'…':credits.length}</small></button>
    {open&&<div className="profile-design-credits-body">
      <header><div><span className="eyebrow">COMMUNITY DESIGN PROVENANCE</span><strong>Who helped shape this page?</strong></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close design credits">×</button></header>
      <p>Credits describe community themes and creator components currently attached to this visible profile. The character owner still controls and edits their own page.</p>
      {theme&&<section className="design-credit-theme"><span className="design-credit-kind">FULL THEME SOURCE</span><h3>{theme.source_title}</h3><a href={creatorHref(theme.source_creator_account_id)}>{theme.source_creator}</a><small>{theme.version_label} · applied {formatDate(theme.applied_at)}</small><p>{theme.attribution_text}</p><div className="design-credit-links"><a href={creatorHref(theme.source_creator_account_id)}>Creator Portfolio →</a><a href="#/hanami-plus/marketplace">Theme Marketplace →</a></div></section>}
      {components.length>0&&<section><div className="design-credit-section-title"><span>CREATOR COMPONENTS</span><small>{components.reduce((sum,row)=>sum+row.item_count,0)} widgets</small></div><div className="design-credit-component-list">{components.map((credit,index)=><article key={`${credit.source_id}:${credit.version_label}:${index}`}><div><strong>{credit.source_title}</strong><small><a href={creatorHref(credit.source_creator_account_id)}>{credit.source_creator}</a> · {credit.version_label}</small></div><span>{credit.item_count} widget{credit.item_count===1?'':'s'}</span><p>{credit.attribution_text}</p></article>)}</div><div className="design-credit-links"><a href="#/hanami-plus/creators">Browse Creators →</a><a className="design-credit-library-link" href="#/hanami-plus/component-library">Component Library →</a></div></section>}
      <footer>Credits are generated from Hanami's recorded creator lineage and installed-component sources.</footer>
    </div>}
  </aside>
}
