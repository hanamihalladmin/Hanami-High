import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterAnimationSettings } from '../types/database-animation-presets'

type MotionRoute={active:boolean;surface:'profile'|'scene'|null;targetCharacterId:string|null}

function parseRoute(hash:string,activeId?:string):MotionRoute{
  const [section,subsection,target]=hash.replace(/^#\/?/,'').split('/')
  if(section!=='profile')return {active:false,surface:null,targetCharacterId:null}
  if(subsection==='view-profile')return {active:true,surface:'profile',targetCharacterId:target?decodeURIComponent(target):activeId||null}
  if(subsection==='scenes'){
    const decoded=target?decodeURIComponent(target):activeId||''
    const split=decoded.lastIndexOf('~')
    return {active:true,surface:'scene',targetCharacterId:split>=0?decoded.slice(0,split):decoded||activeId||null}
  }
  return {active:false,surface:null,targetCharacterId:null}
}

export function AnimationPresetLayer(){
  const {account,activeCharacter}=useIdentity()
  const [hash,setHash]=useState(window.location.hash)
  const [settings,setSettings]=useState<CharacterAnimationSettings|null>(null)
  const [viewerReduced,setViewerReduced]=useState(false)
  const route=useMemo(()=>parseRoute(hash,activeCharacter?.id),[hash,activeCharacter?.id])

  useEffect(()=>{const sync=()=>setHash(window.location.hash);window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])

  const load=useCallback(async()=>{
    const client=supabase
    if(!client||!route.active||!route.targetCharacterId){setSettings(null);return}
    const [motionResult,prefResult]=await Promise.all([
      client.from('character_animation_settings').select('*').eq('character_id',route.targetCharacterId).maybeSingle(),
      account?client.from('account_preferences').select('reduced_motion').eq('account_id',account.id).maybeSingle():Promise.resolve({data:null,error:null}),
    ])
    if(!motionResult.error)setSettings(motionResult.data)
    const systemReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false
    setViewerReduced(Boolean(prefResult.data?.reduced_motion)||systemReduced)
  },[account,route.active,route.targetCharacterId])
  useEffect(()=>{void load()},[load])

  const enabled=Boolean(settings&&route.active&&((route.surface==='profile'&&settings.profile_enabled)||(route.surface==='scene'&&settings.scenes_enabled))&&!viewerReduced)

  useEffect(()=>{
    const root=document.documentElement
    if(!enabled||!settings){
      root.dataset.hanamiMotion='off'
      return()=>{delete root.dataset.hanamiMotion}
    }
    root.dataset.hanamiMotion='on'
    root.dataset.hanamiPageEntrance=settings.page_entrance
    root.dataset.hanamiWidgetReveal=settings.widget_reveal
    root.dataset.hanamiSceneMotion=settings.scene_item_motion
    root.dataset.hanamiAmbient=settings.ambient_effect
    root.dataset.hanamiRouteTransition=settings.route_transition
    root.dataset.hanamiHoverMotion=settings.hover_motion
    root.dataset.hanamiClickMotion=settings.click_motion
    root.dataset.hanamiMotionIntensity=String(settings.intensity)
    root.style.setProperty('--hanami-motion-duration',`${settings.duration_ms}ms`)
    root.style.setProperty('--hanami-motion-stagger',`${settings.stagger_ms}ms`)
    return()=>{
      delete root.dataset.hanamiMotion;delete root.dataset.hanamiPageEntrance;delete root.dataset.hanamiWidgetReveal;delete root.dataset.hanamiSceneMotion;delete root.dataset.hanamiAmbient;delete root.dataset.hanamiRouteTransition;delete root.dataset.hanamiHoverMotion;delete root.dataset.hanamiClickMotion;delete root.dataset.hanamiMotionIntensity;root.style.removeProperty('--hanami-motion-duration');root.style.removeProperty('--hanami-motion-stagger')
    }
  },[enabled,settings])

  useEffect(()=>{
    if(!enabled||!settings)return
    const root=document.querySelector<HTMLElement>(route.surface==='scene'?'.profile-scene-stage':'.hanami-profile-page, .discord-profile-page, .profile-view-page')
    if(!root)return
    root.classList.remove('hanami-motion-enter')
    void root.offsetWidth
    root.classList.add('hanami-motion-enter')
    const candidates=root.querySelectorAll<HTMLElement>(route.surface==='scene'?'.profile-scene-item':'.profile-widget, .profile-section, .profile-card, .spacehey-profile-box, section')
    candidates.forEach((node,index)=>node.style.setProperty('--hanami-reveal-index',String(Math.min(index,18))))
    return()=>{root.classList.remove('hanami-motion-enter');candidates.forEach(node=>node.style.removeProperty('--hanami-reveal-index'))}
  },[enabled,hash,route.surface,settings])

  useEffect(()=>{
    if(!enabled||!settings)return
    const click=(event:MouseEvent)=>{
      const target=event.target instanceof Element?event.target.closest<HTMLElement>('button,a,.profile-scene-item'):null
      if(!target)return
      target.classList.remove('hanami-motion-clicked');void target.offsetWidth;target.classList.add('hanami-motion-clicked')
      window.setTimeout(()=>target.classList.remove('hanami-motion-clicked'),Math.min(settings.duration_ms,700))
    }
    document.addEventListener('click',click)
    return()=>document.removeEventListener('click',click)
  },[enabled,settings])

  if(!enabled||!settings||settings.ambient_effect==='none')return null
  const count=settings.ambient_density===1?8:settings.ambient_density===2?14:22
  const glyph=settings.ambient_effect==='petals'?'❀':settings.ambient_effect==='sparkles'?'✦':settings.ambient_effect==='stars'?'☆':settings.ambient_effect==='bubbles'?'○':settings.ambient_effect==='pixel-stars'?'✧':'·'
  return <div className={`hanami-ambient-layer ambient-${settings.ambient_effect}`} aria-hidden="true">{Array.from({length:count},(_,index)=><span key={index} style={{'--ambient-i':index} as React.CSSProperties}>{glyph}</span>)}</div>
}
