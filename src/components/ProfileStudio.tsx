import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { getSignedProfileMediaUrl, uploadProfileImage } from '../lib/profileMedia'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfile, Json, ProfileWidget, SocialPost } from '../types/database'
import type { BoutiqueItem, InventoryItem } from '../types/database-rewards'
import type { BoutiqueWishlistRow, CharacterCosmeticLoadout } from '../types/database-customization'
import { ShellTopbar } from './ShellTopbar'

type Props = { onSearch: () => void; onNotifications: () => void; unreadCount: number }
type StudioTab = 'board' | 'activity' | 'wishlist'

type ThemeDraft = {
  background: string
  panel: string
  accent: string
  ink: string
  grid: boolean
  displayFont: string
  displayEffect: string
  displayColor: string
}

const defaultTheme: ThemeDraft = {
  background: '#111214', panel: '#f2f3f5', accent: '#d86f8b', ink: '#1e1f22', grid: false,
  displayFont: 'ui', displayEffect: 'solid', displayColor: '#e0b641',
}

const fontChoices = [
  ['ui','Aa'],['serif','Aa'],['rounded','Aa'],['script','Aa'],['pixel','Aa'],['slab','Aa'],['italic','Aa'],['mono','Aa'],
] as const
const effectChoices = ['solid','gradient','neon','toon','pop','gummy','prism'] as const
const colorChoices = ['#e0b641','#ffffff','#d86f8b','#a78bfa','#58c7f3','#57f287','#f23f43','#ff9f43','#f0b7d3','#99aab5']
const widgetPalette = [
  { type:'about', label:'About Me', content:'Write something about your character…' },
  { type:'text', label:'Text', content:'Add your own text…' },
  { type:'links', label:'Links', content:'Favorite places\nClub page\nBlog' },
  { type:'status', label:'Status', content:'What are you up to?' },
  { type:'sticker', label:'Sticker', content:'✿' },
] as const

function obj(value: Json) { return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, Json | undefined> : {} }
function text(value: Json, key: string, fallback = '') { const result = obj(value)[key]; return typeof result === 'string' ? result : fallback }
function normalizeTheme(value: Json): ThemeDraft {
  const source = obj(value)
  return {
    background: typeof source.background === 'string' ? source.background : defaultTheme.background,
    panel: typeof source.panel === 'string' ? source.panel : defaultTheme.panel,
    accent: typeof source.accent === 'string' ? source.accent : defaultTheme.accent,
    ink: typeof source.ink === 'string' ? source.ink : defaultTheme.ink,
    grid: typeof source.grid === 'boolean' ? source.grid : false,
    displayFont: typeof source.displayFont === 'string' ? source.displayFont : 'ui',
    displayEffect: typeof source.displayEffect === 'string' ? source.displayEffect : 'solid',
    displayColor: typeof source.displayColor === 'string' ? source.displayColor : '#e0b641',
  }
}
function withTheme(current: Json, patch: Partial<ThemeDraft>): Json { return { ...obj(current), ...patch } }
function withContent(current: Json, content: string): Json { return { ...obj(current), content } }
function cosmeticKey(itemType: string): keyof CharacterCosmeticLoadout | null {
  if (itemType === 'avatar_decoration') return 'avatar_decoration_item_id'
  if (itemType === 'frame') return 'frame_item_id'
  if (itemType === 'effect') return 'effect_item_id'
  if (itemType === 'nameplate') return 'nameplate_item_id'
  if (itemType === 'profile_card') return 'profile_card_item_id'
  if (itemType === 'background_pack') return 'background_pack_item_id'
  return null
}
function itemVisual(item: BoutiqueItem) { return `boutique-art visual-${item.preview_token || item.slug}` }

export function ProfileStudio({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter, account, refreshIdentity } = useIdentity()
  const [profile, setProfile] = useState<CharacterProfile | null>(null)
  const [widgets, setWidgets] = useState<ProfileWidget[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [items, setItems] = useState<BoutiqueItem[]>([])
  const [wishlist, setWishlist] = useState<BoutiqueWishlistRow[]>([])
  const [loadout, setLoadout] = useState<CharacterCosmeticLoadout | null>(null)
  const [activity, setActivity] = useState<SocialPost[]>([])
  const [mediaUrls, setMediaUrls] = useState<Record<string,string>>({})
  const [tab, setTab] = useState<StudioTab>('board')
  const [styleModal, setStyleModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const characterName = activeCharacter?.display_name || [activeCharacter?.first_name, activeCharacter?.last_name].filter(Boolean).join(' ') || 'Your Character'
  const handle = activeCharacter?.handle ? `.${activeCharacter.handle}` : '.hanami'

  const hydrateMedia = useCallback(async (nextProfile: CharacterProfile) => {
    const paths = [nextProfile.avatar_path,nextProfile.banner_path].filter((value): value is string => Boolean(value))
    const entries = await Promise.all(paths.map(async (path) => {
      try { const url = await getSignedProfileMediaUrl(path); return url ? [path,url] as const : null } catch { return null }
    }))
    setMediaUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string,string] => Boolean(entry))))
  }, [])

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter || !account) return
    setLoading(true); setError(null)
    const [profileResult,widgetResult,itemResult,inventoryResult,wishlistResult,loadoutResult,activityResult] = await Promise.all([
      client.from('character_profiles').select('*').eq('character_id',activeCharacter.id).single(),
      client.from('profile_widgets').select('*').eq('character_id',activeCharacter.id).order('y').order('x'),
      client.from('boutique_items').select('*').eq('state','published').order('featured',{ascending:false}).order('name'),
      client.from('inventory_items').select('*').eq('account_id',account.id),
      client.from('boutique_wishlist').select('*').eq('account_id',account.id).order('created_at',{ascending:false}),
      client.from('character_cosmetic_loadouts').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
      client.from('social_posts').select('*').eq('author_character_id',activeCharacter.id).eq('state','published').order('published_at',{ascending:false}).limit(8),
    ])
    const firstError = [profileResult.error,widgetResult.error,itemResult.error,inventoryResult.error,wishlistResult.error,loadoutResult.error,activityResult.error].find(Boolean)
    setLoading(false)
    if (firstError) return setError(firstError.message)
    setProfile(profileResult.data); setWidgets(widgetResult.data ?? []); setItems(itemResult.data ?? []); setInventory(inventoryResult.data ?? []); setWishlist(wishlistResult.data ?? []); setLoadout(loadoutResult.data); setActivity(activityResult.data ?? [])
    void hydrateMedia(profileResult.data)
  }, [account,activeCharacter,hydrateMedia])

  useEffect(() => { void load() }, [load])

  const theme = useMemo(() => normalizeTheme(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const ownedIds = useMemo(() => new Set(inventory.map((row) => row.item_id)), [inventory])
  const wishlistIds = useMemo(() => new Set(wishlist.map((row) => row.item_id)), [wishlist])
  const wishlistItems = useMemo(() => items.filter((item) => wishlistIds.has(item.id)), [items,wishlistIds])
  const ownedItems = useMemo(() => items.filter((item) => ownedIds.has(item.id)), [items,ownedIds])

  function patchProfile(patch: Partial<CharacterProfile>) { setProfile((current) => current ? { ...current, ...patch } : current) }
  function patchTheme(patch: Partial<ThemeDraft>) { if (profile) patchProfile({ theme_draft: withTheme(profile.theme_draft,patch) }) }

  async function saveProfile() {
    const client = supabase
    if (!client || !profile || !activeCharacter) return false
    setSaving(true); setError(null)
    const { error: saveError } = await client.from('character_profiles').update({
      avatar_path:profile.avatar_path,banner_path:profile.banner_path,bio:profile.bio,custom_status:profile.custom_status,pronouns:profile.pronouns,
      profile_visibility:profile.profile_visibility,guestbook_visibility:profile.guestbook_visibility,theme_draft:profile.theme_draft,updated_at:new Date().toISOString(),
    }).eq('character_id',activeCharacter.id)
    setSaving(false)
    if (saveError) { setError(saveError.message); return false }
    setNotice('Profile draft saved.')
    return true
  }

  async function publish() {
    const client = supabase
    if (!client || !activeCharacter) return
    setPublishing(true); setError(null)
    if (!await saveProfile()) { setPublishing(false); return }
    const { error: publishError } = await client.rpc('publish_character_profile',{p_character_id:activeCharacter.id})
    if (publishError) { setPublishing(false); return setError(publishError.message) }
    if (activeCharacter.school_role === 'new_student') await client.rpc('complete_orientation_task',{p_character_id:activeCharacter.id,p_task_code:'profile_customization'})
    setPublishing(false); setNotice('Profile published to Hanami.'); await refreshIdentity()
  }

  async function upload(kind: 'avatar'|'banner', file: File) {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setUploading(kind); setError(null)
    try {
      const uploaded = await uploadProfileImage(account.id,activeCharacter.id,kind,file)
      const patch = kind === 'avatar' ? {avatar_path:uploaded.path} : {banner_path:uploaded.path}
      const { error: updateError } = await client.from('character_profiles').update({...patch,updated_at:new Date().toISOString()}).eq('character_id',activeCharacter.id)
      if (updateError) throw updateError
      patchProfile(patch); setMediaUrls((current) => ({...current,[uploaded.path]:uploaded.url})); setNotice(`${kind === 'avatar' ? 'Avatar' : 'Banner'} updated.`)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Upload failed.') } finally { setUploading(null) }
  }

  async function toggleWishlist(item: BoutiqueItem) {
    const client = supabase
    if (!client || !account) return
    setError(null)
    if (wishlistIds.has(item.id)) {
      const { error: removeError } = await client.from('boutique_wishlist').delete().eq('account_id',account.id).eq('item_id',item.id)
      if (removeError) return setError(removeError.message)
      setWishlist((current) => current.filter((row) => row.item_id !== item.id))
    } else {
      const { data,error:addError } = await client.from('boutique_wishlist').insert({account_id:account.id,item_id:item.id}).select('*').single()
      if (addError) return setError(addError.message)
      setWishlist((current) => [data,...current])
    }
  }

  async function equip(item: BoutiqueItem | null, itemType: string) {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    const key = cosmeticKey(itemType)
    if (!key) return
    const base: CharacterCosmeticLoadout = loadout ?? {
      character_id:activeCharacter.id,account_id:account.id,avatar_decoration_item_id:null,frame_item_id:null,effect_item_id:null,nameplate_item_id:null,profile_card_item_id:null,background_pack_item_id:null,updated_at:new Date().toISOString(),
    }
    const next = { ...base, [key]: item?.id ?? null, updated_at:new Date().toISOString() }
    const { data,error:equipError } = await client.from('character_cosmetic_loadouts').upsert(next,{onConflict:'character_id'}).select('*').single()
    if (equipError) return setError(equipError.message)
    setLoadout(data); setNotice(item ? `${item.name} equipped.` : 'Cosmetic removed.')
  }

  async function addWidget(preset: (typeof widgetPalette)[number]) {
    const client = supabase
    if (!client || !activeCharacter) return
    const nextY = widgets.length ? Math.max(...widgets.map((widget) => widget.y + widget.height)) + 1 : 1
    const { data,error:insertError } = await client.from('profile_widgets').insert({character_id:activeCharacter.id,widget_type:preset.type,title:preset.label,config:{content:preset.content},x:1,y:nextY,width:4,height:3,z_index:widgets.length,is_visible:true}).select('*').single()
    if (insertError) return setError(insertError.message)
    setWidgets((current) => [...current,data]); setNotice(`${preset.label} widget added.`)
  }

  async function updateWidget(widget: ProfileWidget, patch: Partial<ProfileWidget>) {
    const client = supabase
    if (!client) return
    const next = {...widget,...patch,updated_at:new Date().toISOString()}
    setWidgets((current) => current.map((row) => row.id === widget.id ? next : row))
    const { error:updateError } = await client.from('profile_widgets').update(patch).eq('id',widget.id)
    if (updateError) setError(updateError.message)
  }

  async function removeWidget(id: string) {
    const client = supabase
    if (!client) return
    const { error:deleteError } = await client.from('profile_widgets').delete().eq('id',id)
    if (deleteError) return setError(deleteError.message)
    setWidgets((current) => current.filter((row) => row.id !== id))
  }

  function selectedItem(type: string) {
    const key = cosmeticKey(type)
    if (!key || !loadout) return null
    const id = loadout[key]
    return typeof id === 'string' ? items.find((item) => item.id === id) ?? null : null
  }

  if (!activeCharacter || !account) return null

  const previewStyle = {
    '--studio-accent':theme.accent,'--studio-panel':theme.panel,'--studio-ink':theme.ink,'--display-color':theme.displayColor,
  } as CSSProperties

  return <main className="content-area discord-profile-studio-page">
    <ShellTopbar eyebrow="PROFILE" title="Profiles" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}
    {loading || !profile ? <div className="studio-loading">Loading profile editor…</div> : <div className="discord-editor-shell" style={previewStyle}>
      <aside className="discord-editor-controls">
        <header><strong>Main Profile</strong><span>⌄</span><b>»</b></header>

        <section><h3>Nameplate</h3><button className="discord-slot-wide" type="button" onClick={() => setStyleModal(true)}><span className={`display-name-demo font-${theme.displayFont} effect-${theme.displayEffect}`}>{characterName}</span><b>＋</b></button></section>

        <section><h3>Avatar & Decoration</h3><div className="discord-slot-grid"><label className="discord-media-tile"><div className="editor-avatar-thumb">{profile.avatar_path && mediaUrls[profile.avatar_path] ? <img src={mediaUrls[profile.avatar_path]} alt="Avatar"/> : characterName.slice(0,2)}</div><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file=event.target.files?.[0]; if(file) void upload('avatar',file); event.currentTarget.value='' }}/><span>{uploading==='avatar'?'Uploading…':'Avatar'}</span></label><button className="discord-cosmetic-tile" type="button" onClick={() => setTab('wishlist')}><div className={selectedItem('avatar_decoration') ? itemVisual(selectedItem('avatar_decoration')!) : 'empty-cosmetic'}>{selectedItem('avatar_decoration') ? <span>✿</span> : <b>＋</b>}</div><span>{selectedItem('avatar_decoration')?.name || 'Decoration'}</span></button></div></section>

        <section><h3>Display Name Style</h3><button className="discord-name-style-button" type="button" onClick={() => setStyleModal(true)}><span className={`display-name-demo font-${theme.displayFont} effect-${theme.displayEffect}`}>{characterName}</span></button></section>

        <section><h3>Theme & Banner</h3><div className="discord-slot-grid"><button className="discord-theme-tile" type="button"><span style={{background:theme.panel}}/><span style={{background:theme.accent}}/></button><label className="discord-media-tile banner-tile"><div>{profile.banner_path && mediaUrls[profile.banner_path] ? <img src={mediaUrls[profile.banner_path]} alt="Banner"/> : <span>Banner</span>}</div><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event)=>{const file=event.target.files?.[0];if(file)void upload('banner',file);event.currentTarget.value=''}}/><span>{uploading==='banner'?'Uploading…':'Banner'}</span></label></div></section>

        <section><h3>Profile Effect & Frame</h3><div className="discord-slot-grid">{(['effect','frame'] as const).map((type) => { const selected=selectedItem(type); return <button className="discord-cosmetic-tile" type="button" key={type} onClick={() => setTab('wishlist')}><div className={selected ? itemVisual(selected) : 'empty-cosmetic'}>{selected ? <span>{type==='effect'?'✦':'▣'}</span> : <b>＋</b>}</div><span>{selected?.name || type}</span></button>})}</div></section>

        <section className="discord-editor-fields"><h3>Profile Info</h3><label>Status<input value={profile.custom_status ?? ''} onChange={(event)=>patchProfile({custom_status:event.target.value||null})}/></label><label>Pronouns<input value={profile.pronouns ?? ''} onChange={(event)=>patchProfile({pronouns:event.target.value||null})}/></label><label>Bio<textarea rows={4} value={profile.bio ?? ''} onChange={(event)=>patchProfile({bio:event.target.value||null})}/></label></section>

        <footer><button type="button" onClick={() => void saveProfile()} disabled={saving}>{saving?'Saving…':'Save'}</button><button className="primary-action" type="button" onClick={() => void publish()} disabled={publishing}>{publishing?'Publishing…':'Publish'}</button></footer>
      </aside>

      <section className="discord-editor-preview-column">
        <div className={`discord-live-profile effect-${theme.displayEffect} cosmetic-${text((loadout ?? {}) as unknown as Json,'effect_item_id','none')}`}>
          <div className="discord-live-banner" style={{background:theme.accent}}>{profile.banner_path && mediaUrls[profile.banner_path] && <img src={mediaUrls[profile.banner_path]} alt="Profile banner"/>}</div>
          <div className="discord-live-avatar-wrap"><div className="discord-live-avatar">{profile.avatar_path && mediaUrls[profile.avatar_path] ? <img src={mediaUrls[profile.avatar_path]} alt="Avatar"/> : characterName.slice(0,2)}</div><span className="discord-live-presence"/></div>
          <div className="discord-live-body"><h1 className={`display-name-demo font-${theme.displayFont} effect-${theme.displayEffect}`}>{characterName}</h1><div className="discord-live-handle"><span>{handle}</span>{profile.pronouns && <i>•</i>}{profile.pronouns && <em>{profile.pronouns}</em>}</div><div className="discord-live-badges"><span>🏅</span><span>◇</span><span>✿</span><span>💻</span><span>🎮</span></div><div className="discord-live-actions"><button type="button">Message</button><button type="button">♟</button><button type="button">•••</button></div><div className="discord-live-about"><strong>Bio</strong><p>{profile.bio || 'Tell Hanami something about yourself.'}</p><strong>Member Since</strong><p>{new Date(activeCharacter.created_at).toLocaleDateString()}</p><strong>Connections</strong><div className="discord-live-connections"><span>✿ Hanami High</span><span>🎓 {activeCharacter.school_role?.replaceAll('_',' ') || 'Member'}</span></div></div></div>
        </div>
      </section>

      <section className="discord-editor-board">
        <nav><button className={tab==='board'?'active':''} onClick={()=>setTab('board')}>Board</button><button className={tab==='activity'?'active':''} onClick={()=>setTab('activity')}>Activity</button><button className={tab==='wishlist'?'active':''} onClick={()=>setTab('wishlist')}>Wishlist</button></nav>
        {tab==='board' && <div className="discord-board-content"><header><strong>Customize your profile with Widgets</strong><p>Choose widgets to share more about yourself and your interests.</p></header><div className="discord-widget-add-row">{widgetPalette.map((preset)=><button key={preset.type} type="button" onClick={()=>void addWidget(preset)}>＋ {preset.label}</button>)}</div><div className="discord-widget-board">{widgets.length===0?<div className="discord-board-empty">Add your first widget.</div>:widgets.map((widget)=><article key={widget.id}><header><input value={widget.title??''} onChange={(event)=>void updateWidget(widget,{title:event.target.value||null})}/><button onClick={()=>void removeWidget(widget.id)}>×</button></header><textarea value={text(widget.config,'content')} onChange={(event)=>void updateWidget(widget,{config:withContent(widget.config,event.target.value)})}/><footer><label><input type="checkbox" checked={widget.is_visible} onChange={(event)=>void updateWidget(widget,{is_visible:event.target.checked})}/> Visible</label></footer></article>)}</div></div>}
        {tab==='activity' && <div className="discord-activity-board">{activity.length===0?<div className="discord-board-empty">Your published activity will appear here.</div>:activity.map((post)=><article key={post.id}><span>{post.post_type}</span><strong>{post.title || 'Post'}</strong><p>{post.body}</p><small>{new Date(post.published_at || post.created_at).toLocaleString()}</small></article>)}</div>}
        {tab==='wishlist' && <div className="discord-wishlist-board"><div className="discord-wishlist-toolbar"><strong>{wishlistItems.length} Items</strong><a href="#/boutique/featured">Add Item</a></div>{wishlistItems.length===0?<div className="discord-board-empty">Heart items in the Boutique to build your wishlist.</div>:<div className="discord-wishlist-grid">{wishlistItems.map((item)=><article key={item.id}><div className={itemVisual(item)}><span>{item.item_type==='avatar_decoration'?'✿':item.item_type==='frame'?'▣':item.item_type==='effect'?'✦':'◇'}</span></div><strong>{item.name}</strong><small>{item.item_type.replaceAll('_',' ')}</small><div><button type="button" onClick={()=>void toggleWishlist(item)}>Remove</button>{ownedIds.has(item.id)&&cosmeticKey(item.item_type)&&<button className="primary-action" type="button" onClick={()=>void equip(item,item.item_type)}>Equip</button>}</div></article>)}</div>}
          <div className="discord-owned-cosmetics"><h3>Owned Cosmetics</h3><div className="discord-wishlist-grid">{ownedItems.filter((item)=>cosmeticKey(item.item_type)).map((item)=><article key={item.id}><div className={itemVisual(item)}><span>✦</span></div><strong>{item.name}</strong><small>{item.item_type.replaceAll('_',' ')}</small><button className="primary-action" type="button" onClick={()=>void equip(item,item.item_type)}>Equip</button></article>)}</div></div>
        </div>}
      </section>
    </div>}

    {styleModal && <div className="discord-style-modal-backdrop" role="dialog" aria-modal="true"><section className="discord-style-modal"><button className="discord-style-close" type="button" onClick={()=>setStyleModal(false)}>×</button><div className="discord-style-controls"><h2>Change Display Name Style</h2><h3>Choose Font</h3><div className="discord-font-grid">{fontChoices.map(([id,label])=><button className={`font-${id} ${theme.displayFont===id?'selected':''}`} type="button" key={id} onClick={()=>patchTheme({displayFont:id})}>{label}</button>)}</div><h3>Choose Effect</h3><div className="discord-effect-grid">{effectChoices.map((effect)=><button className={`effect-${effect} ${theme.displayEffect===effect?'selected':''}`} type="button" key={effect} onClick={()=>patchTheme({displayEffect:effect})}>{effect}</button>)}</div><h3>Choose Color</h3><div className="discord-color-grid">{colorChoices.map((color)=><button type="button" key={color} className={theme.displayColor===color?'selected':''} style={{background:color}} onClick={()=>patchTheme({displayColor:color})} aria-label={`Use ${color}`}/>)}</div></div><div className="discord-style-preview"><div className="discord-style-preview-card"><div className="mini-banner" style={{background:theme.accent}}/><div className="mini-avatar">{characterName.slice(0,2)}</div><h3 className={`display-name-demo font-${theme.displayFont} effect-${theme.displayEffect}`}>{characterName}</h3><span>{handle} · {profile.pronouns || 'pronouns'}</span></div><div className="discord-style-message"><div className="mini-avatar">{characterName.slice(0,2)}</div><p><strong className={`display-name-demo font-${theme.displayFont} effect-${theme.displayEffect}`}>{characterName}</strong><small>12:00</small><br/>does anyone read this?</p></div></div><footer><button type="button" onClick={()=>{patchTheme({displayFont:fontChoices[Math.floor(Math.random()*fontChoices.length)][0],displayEffect:effectChoices[Math.floor(Math.random()*effectChoices.length)],displayColor:colorChoices[Math.floor(Math.random()*colorChoices.length)]})}}>🎲 Surprise Me</button><button className="primary-action" type="button" onClick={()=>{setStyleModal(false);void saveProfile()}}>Apply</button></footer></section></div>}
  </main>
}
