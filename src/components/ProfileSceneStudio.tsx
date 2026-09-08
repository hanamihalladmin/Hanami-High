import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CharacterProfileScene, CharacterProfileSceneItem, ProfileSceneKind, ProfileSceneLayout, ProfileSceneVisibility } from '../types/database-profile-scenes'
import { ShellTopbar } from './ShellTopbar'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type ItemKind=CharacterProfileSceneItem['item_kind']
type Draft={itemKind:ItemKind;title:string;body:string;assetUrl:string;targetUrl:string}

const meta:Record<ProfileSceneKind,{icon:string;label:string;description:string;defaultItem:ItemKind;items:ItemKind[]}>= {
  'music-room':{icon:'♫',label:'Music Room',description:'Playlists, favorite tracks, records, posters, and music notes.',defaultItem:'playlist',items:['playlist','track','image','sticker','note','link','button']},
  'photo-wall':{icon:'▧',label:'Photo Wall',description:'Photos, memories, captions, stickers, and scrapbook links.',defaultItem:'photo',items:['photo','image','sticker','note','link']},
  journal:{icon:'✎',label:'Journal',description:'Notebook cards, thoughts, images, doodles, and private-feeling entries.',defaultItem:'journal-card',items:['journal-card','note','image','sticker']},
  'gaming-room':{icon:'★',label:'Gaming Room',description:'Favorite games, scores, consoles, links, and playful buttons.',defaultItem:'game-card',items:['game-card','image','sticker','link','counter','button']},
  portfolio:{icon:'◇',label:'Portfolio',description:'Art, writing, projects, club work, accomplishments, and links.',defaultItem:'project-card',items:['project-card','image','link','note','button']},
  'friends-page':{icon:'♡',label:'Friends Page',description:'A room for accepted friends, memories, photos, and friendship cards.',defaultItem:'friend-card',items:['friend-card','photo','sticker','note','link']},
  'seasonal-room':{icon:'✿',label:'Seasonal Room',description:'A rotating room for festivals, seasons, school events, and decorations.',defaultItem:'seasonal-decoration',items:['seasonal-decoration','image','sticker','note','button']},
}

const kinds=Object.keys(meta) as ProfileSceneKind[]
const layoutOptions:ProfileSceneLayout[]=['room','gallery','notebook','desktop','showcase','scrapbook','seasonal']

function displayKind(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}

export function ProfileSceneStudio({onSearch,onNotifications,unreadCount}:Props){
  const {activeCharacter}=useIdentity()
  const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
  const [scenes,setScenes]=useState<CharacterProfileScene[]>([])
  const [items,setItems]=useState<CharacterProfileSceneItem[]>([])
  const [selectedKind,setSelectedKind]=useState<ProfileSceneKind>('music-room')
  const [draft,setDraft]=useState<Draft>({itemKind:'playlist',title:'',body:'',assetUrl:'',targetUrl:''})
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)
  const canvasRef=useRef<HTMLDivElement|null>(null)

  useEffect(()=>setDraft({itemKind:meta[selectedKind].defaultItem,title:'',body:'',assetUrl:'',targetUrl:''}),[selectedKind])

  const load=useCallback(async()=>{
    const client=supabase;if(!client||!activeCharacter)return
    setLoading(true);setError(null)
    const hub=await client.rpc('current_hanami_plus_hub')
    if(hub.error){setLoading(false);setError(hub.error.message);return}
    const next=hub.data?.[0]??null;setSnapshot(next)
    if(next?.active){const ensure=await client.rpc('ensure_my_profile_scenes',{p_character_id:activeCharacter.id});if(ensure.error){setLoading(false);setError(ensure.error.message);return}}
    const [sceneResult,itemResult]=await Promise.all([
      client.from('character_profile_scenes').select('*').eq('character_id',activeCharacter.id).order('sort_order'),
      client.from('character_profile_scene_items').select('*').eq('character_id',activeCharacter.id).order('z_index').order('created_at'),
    ])
    const first=sceneResult.error||itemResult.error
    if(first){setLoading(false);setError(first.message);return}
    setScenes(sceneResult.data??[]);setItems(itemResult.data??[]);setLoading(false)
  },[activeCharacter])
  useEffect(()=>{void load()},[load])

  const plus=Boolean(snapshot?.active)
  const scene=useMemo(()=>scenes.find(row=>row.scene_kind===selectedKind)??null,[scenes,selectedKind])
  const sceneItems=useMemo(()=>scene?items.filter(item=>item.scene_id===scene.id):[],[items,scene])

  function patchLocal(patch:Partial<CharacterProfileScene>){setScenes(current=>current.map(row=>row.id===scene?.id?{...row,...patch}:row))}

  async function saveScene(){
    const client=supabase;if(!client||!scene||!plus)return
    setWorking('scene');setError(null);setNotice(null)
    const result=await client.from('character_profile_scenes').update({
      title:scene.title,description:scene.description,visibility:scene.visibility,layout_style:scene.layout_style,
      background_url:scene.background_url,accent_color:scene.accent_color,settings:scene.settings,
    }).eq('id',scene.id)
    setWorking(null);if(result.error)return setError(result.error.message);setNotice(`${scene.title} saved.`);await load()
  }

  async function togglePublished(){
    const client=supabase;if(!client||!scene||!plus)return
    setWorking('publish');setError(null);setNotice(null)
    const next=!scene.is_published
    const result=await client.from('character_profile_scenes').update({is_published:next,published_at:next?new Date().toISOString():null}).eq('id',scene.id)
    setWorking(null);if(result.error)return setError(result.error.message);setNotice(next?`${scene.title} is now part of your living profile.`:`${scene.title} returned to draft.`);await load()
  }

  async function addItem(){
    const client=supabase;if(!client||!activeCharacter||!scene||!plus)return
    setWorking('add');setError(null);setNotice(null)
    const offset=sceneItems.length%7
    const result=await client.from('character_profile_scene_items').insert({
      scene_id:scene.id,character_id:activeCharacter.id,item_kind:draft.itemKind,
      title:draft.title.trim()||null,body:draft.body.trim()||null,asset_url:draft.assetUrl.trim()||null,target_url:draft.targetUrl.trim()||null,
      position_x:7+offset*7,position_y:12+offset*6,width_pct:['photo','image','project-card'].includes(draft.itemKind)?28:22,height_pct:['journal-card','project-card','game-card'].includes(draft.itemKind)?24:18,rotation_deg:0,z_index:sceneItems.length+1,
    })
    setWorking(null);if(result.error)return setError(result.error.message)
    setDraft(current=>({...current,title:'',body:'',assetUrl:'',targetUrl:''}));setNotice(`${displayKind(draft.itemKind)} added.`);await load()
  }

  async function removeItem(id:string){
    const client=supabase;if(!client||!plus)return
    setWorking(`delete:${id}`);const result=await client.from('character_profile_scene_items').delete().eq('id',id);setWorking(null)
    if(result.error)return setError(result.error.message);setNotice('Scene item removed.');await load()
  }

  async function persistPosition(item:CharacterProfileSceneItem,x:number,y:number){
    const client=supabase;if(!client||!plus)return
    const result=await client.from('character_profile_scene_items').update({position_x:x,position_y:y}).eq('id',item.id)
    if(result.error)setError(result.error.message)
  }

  function beginDrag(event:React.PointerEvent<HTMLDivElement>,item:CharacterProfileSceneItem){
    if(!plus||!canvasRef.current)return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
    const rect=canvasRef.current.getBoundingClientRect();const startX=event.clientX;const startY=event.clientY;const initialX=item.position_x;const initialY=item.position_y
    let finalX=initialX,finalY=initialY
    const move=(pointer:PointerEvent)=>{const dx=((pointer.clientX-startX)/rect.width)*100;const dy=((pointer.clientY-startY)/rect.height)*100;finalX=Math.max(0,Math.min(100-item.width_pct,initialX+dx));finalY=Math.max(0,Math.min(100-item.height_pct,initialY+dy));setItems(current=>current.map(row=>row.id===item.id?{...row,position_x:finalX,position_y:finalY}:row))}
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);void persistPosition(item,finalX,finalY)}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})
  }

  function face(item:CharacterProfileSceneItem){
    if(item.asset_url&&['image','photo','sticker','seasonal-decoration'].includes(item.item_kind))return <img src={item.asset_url} alt=""/>
    const icon=item.item_kind==='playlist'||item.item_kind==='track'?'♫':item.item_kind==='game-card'?'★':item.item_kind==='project-card'?'◇':item.item_kind==='friend-card'?'♡':item.item_kind==='journal-card'?'✎':item.item_kind==='counter'?'#':'✿'
    return <><span>{icon}</span><strong>{item.title||displayKind(item.item_kind)}</strong>{item.body&&<p>{item.body}</p>}</>
  }

  if(!activeCharacter)return null
  return <main className="profile-scene-studio-page">
    <ShellTopbar eyebrow="HANAMI+ · LIVING PROFILES" title="Scene Studio" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <section className="scene-studio-hero"><div><span className="eyebrow">PROFILE SCENES</span><h1>Build rooms beyond the main profile.</h1><p>Every scene stays attached to this character. Publish only the rooms you want visitors to enter, and make individual rooms more private whenever you need to.</p></div><div className={plus?'scene-plus-card active':'scene-plus-card'}><span>{plus?'EDITING UNLOCKED':'SAVED VIEW'}</span><strong>{plus?'Hanami+':'Hanami'}</strong><small>Published rooms remain viewable after Plus expires. Editing waits until Hanami+ is active again.</small></div></section>
    <nav className="scene-studio-tabs">{kinds.map(kind=><button key={kind} type="button" className={selectedKind===kind?'active':''} onClick={()=>setSelectedKind(kind)}><span>{meta[kind].icon}</span><strong>{meta[kind].label}</strong><small>{scenes.find(row=>row.scene_kind===kind)?.is_published?'live':'draft'}</small></button>)}</nav>
    {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
    {loading?<section className="scene-studio-loading">Opening Scene Studio…</section>:scene?<section className="scene-studio-workspace">
      <aside className="scene-studio-tools">
        <article><span className="eyebrow">ROOM SETTINGS</span><label>Title<input maxLength={60} disabled={!plus} value={scene.title} onChange={e=>patchLocal({title:e.target.value})}/></label><label>Description<textarea maxLength={240} rows={3} disabled={!plus} value={scene.description??''} onChange={e=>patchLocal({description:e.target.value||null})}/></label><label>Visibility<select disabled={!plus} value={scene.visibility} onChange={e=>patchLocal({visibility:e.target.value as ProfileSceneVisibility})}><option value="inherit">Inherit profile visibility</option><option value="friends">Friends only</option><option value="private">Private</option></select></label><label>Layout<select disabled={!plus} value={scene.layout_style} onChange={e=>patchLocal({layout_style:e.target.value as ProfileSceneLayout})}>{layoutOptions.map(value=><option value={value} key={value}>{displayKind(value)}</option>)}</select></label><label>Accent<input type="color" disabled={!plus} value={scene.accent_color} onChange={e=>patchLocal({accent_color:e.target.value})}/></label><label>Background URL<input disabled={!plus} value={scene.background_url??''} onChange={e=>patchLocal({background_url:e.target.value||null})} placeholder="https://…"/></label><div className="scene-setting-actions"><button type="button" disabled={!plus||working==='scene'} onClick={()=>void saveScene()}>{working==='scene'?'Saving…':'Save room'}</button><button className={scene.is_published?'unpublish':''} type="button" disabled={!plus||working==='publish'} onClick={()=>void togglePublished()}>{working==='publish'?'Working…':scene.is_published?'Return to draft':'Publish room'}</button></div></article>
        <article><span className="eyebrow">ADD TO ROOM</span><label>Item type<select disabled={!plus} value={draft.itemKind} onChange={e=>setDraft(current=>({...current,itemKind:e.target.value as ItemKind}))}>{meta[selectedKind].items.map(value=><option key={value} value={value}>{displayKind(value)}</option>)}</select></label><label>Title<input maxLength={80} disabled={!plus} value={draft.title} onChange={e=>setDraft(current=>({...current,title:e.target.value}))}/></label><label>Text<textarea rows={4} disabled={!plus} value={draft.body} onChange={e=>setDraft(current=>({...current,body:e.target.value}))}/></label><label>Image / asset URL<input disabled={!plus} value={draft.assetUrl} onChange={e=>setDraft(current=>({...current,assetUrl:e.target.value}))} placeholder="Optional"/></label><label>Link / Hanami route<input disabled={!plus} value={draft.targetUrl} onChange={e=>setDraft(current=>({...current,targetUrl:e.target.value}))} placeholder="#/social/feed or https://…"/></label><button type="button" disabled={!plus||working==='add'} onClick={()=>void addItem()}>{working==='add'?'Adding…':`Add ${displayKind(draft.itemKind)}`}</button></article>
      </aside>
      <section className="scene-editor-column"><header><div><span>{meta[selectedKind].icon}</span><div><strong>{scene.title}</strong><small>{scene.is_published?'published':'draft'} · {scene.visibility}</small></div></div><a href={`#/profile/scenes/${encodeURIComponent(`${activeCharacter.id}~${scene.scene_kind}`)}`}>open visitor view →</a></header><div className={`scene-editor-canvas layout-${scene.layout_style}`} ref={canvasRef} style={{'--scene-accent':scene.accent_color,backgroundImage:scene.background_url?`url(${scene.background_url})`:undefined} as React.CSSProperties}>{sceneItems.length===0?<div className="scene-editor-empty"><span>{meta[selectedKind].icon}</span><strong>Start decorating this room.</strong><small>Add an item from the panel, then drag it into place.</small></div>:sceneItems.map(item=><div className={`scene-editor-item kind-${item.item_kind}`} key={item.id} onPointerDown={e=>beginDrag(e,item)} style={{left:`${item.position_x}%`,top:`${item.position_y}%`,width:`${item.width_pct}%`,height:`${item.height_pct}%`,transform:`rotate(${item.rotation_deg}deg)`,zIndex:item.z_index}}>{face(item)}{plus&&<button type="button" aria-label="Remove scene item" disabled={working===`delete:${item.id}`} onPointerDown={e=>e.stopPropagation()} onClick={()=>void removeItem(item.id)}>×</button>}</div>)}</div></section>
    </section>:<section className="scene-studio-loading">Activate Hanami+ once to initialize this character's profile rooms.</section>}
  </main>
}
