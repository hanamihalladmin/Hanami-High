import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfileScene, ProfileSceneKind } from '../types/database-profile-scenes'

const icons:Record<ProfileSceneKind,string>={'music-room':'♫','photo-wall':'▧',journal:'✎','gaming-room':'★',portfolio:'◇','friends-page':'♡','seasonal-room':'✿'}

function targetFromHash(hash:string,activeId?:string){
  const [section,subsection,target]=hash.replace(/^#\/?/,'').split('/')
  if(section!=='profile'||subsection!=='view-profile')return null
  return target?decodeURIComponent(target):activeId||null
}

export function ProfileScenePortal(){
  const {activeCharacter}=useIdentity()
  const [hash,setHash]=useState(window.location.hash)
  const [scenes,setScenes]=useState<CharacterProfileScene[]>([])
  const targetId=targetFromHash(hash,activeCharacter?.id)

  useEffect(()=>{const sync=()=>setHash(window.location.hash);window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
  const load=useCallback(async()=>{
    const client=supabase
    if(!client||!targetId){setScenes([]);return}
    const result=await client.from('character_profile_scenes').select('*').eq('character_id',targetId).eq('is_published',true).order('sort_order')
    if(!result.error)setScenes(result.data??[])
  },[targetId])
  useEffect(()=>{void load()},[load])

  if(!targetId||scenes.length===0)return null
  return <aside className="profile-scene-portal" aria-label="Living profile rooms">
    <div><span>✦</span><strong>visit my rooms</strong></div>
    <nav>{scenes.map(scene=><a href={`#/profile/scenes/${encodeURIComponent(`${targetId}~${scene.scene_kind}`)}`} key={scene.id} title={scene.description??scene.title}><span>{icons[scene.scene_kind]}</span>{scene.title}</a>)}</nav>
  </aside>
}
