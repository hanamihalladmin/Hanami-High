import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { SearchDocument } from '../types/database'
import type { CharacterProfileScene, CharacterProfileSceneItem, ProfileSceneKind } from '../types/database-profile-scenes'
import { ShellTopbar } from './ShellTopbar'

type Props={targetId?:string;onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type IdentitySummary=Pick<SearchDocument,'entity_id'|'title'|'subtitle'>

const sceneIcons:Record<ProfileSceneKind,string>={
  'music-room':'♫','photo-wall':'▧',journal:'✎','gaming-room':'★',portfolio:'◇','friends-page':'♡','seasonal-room':'✿',
}

function parseTarget(value:string|undefined,activeId:string|undefined){
  if(!value)return {characterId:activeId??null,sceneKind:null as ProfileSceneKind|null}
  const split=value.lastIndexOf('~')
  if(split<0)return {characterId:value,sceneKind:null as ProfileSceneKind|null}
  const kind=value.slice(split+1) as ProfileSceneKind
  return {characterId:value.slice(0,split),sceneKind:kind}
}

function sceneHash(characterId:string,kind:ProfileSceneKind){
  return `#/profile/scenes/${encodeURIComponent(`${characterId}~${kind}`)}`
}

function itemFace(item:CharacterProfileSceneItem){
  if(item.asset_url&&['image','photo','sticker','seasonal-decoration'].includes(item.item_kind))return <img src={item.asset_url} alt={item.title??''}/>
  if(item.item_kind==='playlist'||item.item_kind==='track')return <><span className="scene-item-icon">♫</span><strong>{item.title||'Music'}</strong>{item.body&&<p>{item.body}</p>}</>
  if(item.item_kind==='game-card')return <><span className="scene-item-icon">★</span><strong>{item.title||'Game'}</strong>{item.body&&<p>{item.body}</p>}</>
  if(item.item_kind==='project-card')return <><span className="scene-item-icon">◇</span><strong>{item.title||'Project'}</strong>{item.body&&<p>{item.body}</p>}</>
  if(item.item_kind==='friend-card')return <><span className="scene-item-icon">♡</span><strong>{item.title||'Friend'}</strong>{item.body&&<p>{item.body}</p>}</>
  if(item.item_kind==='journal-card')return <><span className="scene-item-icon">✎</span><strong>{item.title||'Journal'}</strong>{item.body&&<p>{item.body}</p>}</>
  if(item.item_kind==='counter')return <><span className="scene-item-icon">#</span><strong>{item.title||'Counter'}</strong><p>{item.body||'0'}</p></>
  if(item.item_kind==='button'||item.item_kind==='link')return <><span className="scene-item-icon">→</span><strong>{item.title||'Link'}</strong>{item.body&&<p>{item.body}</p>}</>
  return <><span className="scene-item-icon">{item.item_kind==='sticker'?'✿':'▱'}</span><strong>{item.title||'Note'}</strong>{item.body&&<p>{item.body}</p>}</>
}

export function ProfileScenesPage({targetId,onSearch,onNotifications,unreadCount}:Props){
  const {activeCharacter}=useIdentity()
  const parsed=useMemo(()=>parseTarget(targetId,activeCharacter?.id),[targetId,activeCharacter?.id])
  const [scenes,setScenes]=useState<CharacterProfileScene[]>([])
  const [items,setItems]=useState<CharacterProfileSceneItem[]>([])
  const [identity,setIdentity]=useState<IdentitySummary|null>(null)
  const [selectedKind,setSelectedKind]=useState<ProfileSceneKind|null>(parsed.sceneKind)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  const load=useCallback(async()=>{
    const client=supabase
    if(!client||!parsed.characterId)return
    setLoading(true);setError(null)
    const [sceneResult,identityResult]=await Promise.all([
      client.from('character_profile_scenes').select('*').eq('character_id',parsed.characterId).order('sort_order'),
      client.from('search_documents').select('entity_id,title,subtitle').eq('document_type','character').eq('entity_id',parsed.characterId).maybeSingle(),
    ])
    if(sceneResult.error){setLoading(false);setError(sceneResult.error.message);return}
    const nextScenes=sceneResult.data??[]
    setScenes(nextScenes)
    if(!identityResult.error)setIdentity(identityResult.data)
    const requested=parsed.sceneKind&&nextScenes.some(scene=>scene.scene_kind===parsed.sceneKind)?parsed.sceneKind:null
    setSelectedKind(requested??nextScenes[0]?.scene_kind??null)
    setLoading(false)
  },[parsed.characterId,parsed.sceneKind])
  useEffect(()=>{void load()},[load])

  const selectedScene=useMemo(()=>scenes.find(scene=>scene.scene_kind===selectedKind)??null,[scenes,selectedKind])
  useEffect(()=>{
    const client=supabase
    if(!client||!selectedScene){setItems([]);return}
    let cancelled=false
    void client.from('character_profile_scene_items').select('*').eq('scene_id',selectedScene.id).order('z_index').order('created_at').then(result=>{
      if(cancelled)return
      if(result.error)setError(result.error.message);else setItems(result.data??[])
    })
    return()=>{cancelled=true}
  },[selectedScene])

  if(!parsed.characterId)return null
  const owner=parsed.characterId===activeCharacter?.id
  const ownerName=identity?.title||activeCharacter?.display_name||activeCharacter?.first_name||'Hanami Character'

  return <main className="profile-scenes-page">
    <ShellTopbar eyebrow="LIVING PROFILE" title={`${ownerName}'s Scenes`} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <section className="profile-scenes-hero"><div><span className="eyebrow">ALTERNATE PROFILE ROOMS</span><h1>{ownerName}'s little corners of Hanami.</h1><p>Each room belongs to the same character profile. Scene privacy can only narrow the profile's existing visibility.</p></div><a href={`#/profile/view-profile/${encodeURIComponent(parsed.characterId)}`}>← main profile</a></section>
    {error&&<div className="identity-notice error">{error}</div>}
    {loading?<section className="profile-scenes-empty">Opening profile scenes…</section>:scenes.length===0?<section className="profile-scenes-empty"><strong>No scenes are available.</strong><span>{owner?'Publish a room from Hanami+ Scene Studio when you are ready.':'This character has not published any rooms you can view.'}</span></section>:<>
      <nav className="profile-scenes-tabs" aria-label="Profile scenes">{scenes.map(scene=><a key={scene.id} className={selectedScene?.id===scene.id?'active':''} href={sceneHash(parsed.characterId!,scene.scene_kind)} onClick={()=>setSelectedKind(scene.scene_kind)}><span>{sceneIcons[scene.scene_kind]}</span><strong>{scene.title}</strong>{owner&&!scene.is_published&&<small>draft</small>}</a>)}</nav>
      {selectedScene&&<section className={`profile-scene-stage scene-layout-${selectedScene.layout_style}`} style={{'--scene-accent':selectedScene.accent_color,backgroundImage:selectedScene.background_url?`url(${selectedScene.background_url})`:undefined} as React.CSSProperties}>
        <header className="profile-scene-titlebar"><div><span>{sceneIcons[selectedScene.scene_kind]}</span><div><h2>{selectedScene.title}</h2><p>{selectedScene.description||'A living profile room.'}</p></div></div><small>{selectedScene.visibility==='inherit'?'profile visibility':selectedScene.visibility==='friends'?'friends only':'private'}{owner&&!selectedScene.is_published?' · draft':''}</small></header>
        <div className="profile-scene-canvas">
          {items.length===0?<div className="profile-scene-empty-room"><span>{sceneIcons[selectedScene.scene_kind]}</span><strong>This room is quiet right now.</strong></div>:items.map(item=>{
            const content=<div className={`profile-scene-item kind-${item.item_kind}`} style={{left:`${item.position_x}%`,top:`${item.position_y}%`,width:`${item.width_pct}%`,height:`${item.height_pct}%`,transform:`rotate(${item.rotation_deg}deg)`,zIndex:item.z_index}}>{itemFace(item)}</div>
            return item.target_url?(item.target_url.startsWith('#')?<a className="profile-scene-item-link" href={item.target_url} key={item.id}>{content}</a>:<a className="profile-scene-item-link" href={item.target_url} target="_blank" rel="noreferrer" key={item.id}>{content}</a>):<div key={item.id}>{content}</div>
          })}
        </div>
      </section>}
    </>}
  </main>
}
