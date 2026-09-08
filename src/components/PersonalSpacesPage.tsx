import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CharacterPersonalSpace, CharacterSpaceItem, PersonalSpaceKind } from '../types/database-personal-spaces'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  targetSpace?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type ItemDraft = { itemKind: string; label: string; body: string; assetUrl: string; targetRoute: string }

const spaceMeta: Record<PersonalSpaceKind, { label: string; icon: string; description: string; defaultItem: string; itemOptions: string[] }> = {
  locker: {
    label: 'Digital Locker', icon: '▥', description: 'Cover your locker with photos, posters, magnets, notes, charms, stickers, and collectibles.',
    defaultItem: 'sticker', itemOptions: ['sticker','poster','magnet','photo','keychain','note','charm','collectible'],
  },
  desk: {
    label: 'Desk', icon: '▱', description: 'Build a small study space with notes, photos, collectibles, and decorative desk objects.',
    defaultItem: 'desk_object', itemOptions: ['desk_object','photo','note','sticker','collectible','charm'],
  },
  phone: {
    label: 'Character Phone', icon: '▯', description: 'Style a fictional phone with wallpaper, widgets, contacts, and Hanami shortcuts.',
    defaultItem: 'phone_widget', itemOptions: ['phone_widget','phone_contact','phone_shortcut','photo','sticker','charm'],
  },
  desktop: {
    label: 'Character Desktop', icon: '▣', description: 'Create a 2000s computer desktop with wallpaper, icons, widgets, notes, and shortcuts.',
    defaultItem: 'desktop_icon', itemOptions: ['desktop_icon','desktop_widget','shortcut','photo','note','sticker'],
  },
}

function normalizeSpace(value?: string): PersonalSpaceKind {
  return value === 'desk' || value === 'phone' || value === 'desktop' ? value : 'locker'
}

function displayItemKind(kind: string) {
  return kind.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function PersonalSpacesPage({ targetSpace, onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter } = useIdentity()
  const spaceKind = normalizeSpace(targetSpace)
  const [snapshot, setSnapshot] = useState<HanamiPlusHubSnapshot | null>(null)
  const [spaces, setSpaces] = useState<CharacterPersonalSpace[]>([])
  const [items, setItems] = useState<CharacterSpaceItem[]>([])
  const [draft, setDraft] = useState<ItemDraft>({ itemKind: spaceMeta[spaceKind].defaultItem, label: '', body: '', assetUrl: '', targetRoute: '' })
  const [working, setWorking] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setDraft({ itemKind: spaceMeta[spaceKind].defaultItem, label: '', body: '', assetUrl: '', targetRoute: '' })
  }, [spaceKind])

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setLoading(true); setError(null)
    const hubResult = await client.rpc('current_hanami_plus_hub')
    if (hubResult.error) { setLoading(false); setError(hubResult.error.message); return }
    const nextSnapshot = hubResult.data?.[0] ?? null
    setSnapshot(nextSnapshot)
    if (nextSnapshot?.active) {
      const ensureResult = await client.rpc('ensure_my_character_personal_spaces', { p_character_id: activeCharacter.id })
      if (ensureResult.error) { setLoading(false); setError(ensureResult.error.message); return }
    }
    const [spaceResult, itemResult] = await Promise.all([
      client.from('character_personal_spaces').select('*').eq('character_id', activeCharacter.id),
      client.from('character_space_items').select('*').eq('character_id', activeCharacter.id).order('z_index').order('created_at'),
    ])
    const firstError = spaceResult.error || itemResult.error
    if (firstError) { setLoading(false); setError(firstError.message); return }
    setSpaces(spaceResult.data ?? [])
    setItems(itemResult.data ?? [])
    setLoading(false)
  }, [account, activeCharacter])

  useEffect(() => { void load() }, [load])

  const active = Boolean(snapshot?.active)
  const currentSpace = spaces.find((space) => space.space_kind === spaceKind) ?? null
  const currentItems = useMemo(() => items.filter((item) => item.space_kind === spaceKind), [items, spaceKind])
  const pageMeta = spaceMeta[spaceKind]

  async function saveSpace(patch: Partial<CharacterPersonalSpace>) {
    const client = supabase
    if (!client || !activeCharacter || !active) return
    setWorking('space'); setError(null); setNotice(null)
    const payload = {
      character_id: activeCharacter.id,
      space_kind: spaceKind,
      visibility: patch.visibility ?? currentSpace?.visibility ?? 'private',
      title: patch.title ?? currentSpace?.title ?? pageMeta.label,
      theme_key: patch.theme_key ?? currentSpace?.theme_key ?? null,
      wallpaper_url: patch.wallpaper_url ?? currentSpace?.wallpaper_url ?? null,
      settings: patch.settings ?? currentSpace?.settings ?? {},
    }
    const { error: saveError } = await client.from('character_personal_spaces').upsert(payload, { onConflict: 'character_id,space_kind' })
    setWorking(null)
    if (saveError) return setError(saveError.message)
    setNotice(`${pageMeta.label} settings saved.`)
    await load()
  }

  async function addItem() {
    const client = supabase
    if (!client || !activeCharacter || !active) return
    setWorking('add'); setError(null); setNotice(null)
    const offset = currentItems.length % 6
    const { error: addError } = await client.from('character_space_items').insert({
      character_id: activeCharacter.id,
      space_kind: spaceKind,
      item_kind: draft.itemKind,
      label: draft.label.trim() || displayItemKind(draft.itemKind),
      body: draft.body.trim() || null,
      asset_url: draft.assetUrl.trim() || null,
      target_route: draft.targetRoute.trim() || null,
      position_x: 8 + offset * 9,
      position_y: 10 + offset * 8,
      width_pct: draft.itemKind.includes('widget') ? 28 : draft.itemKind === 'note' ? 24 : 18,
      height_pct: draft.itemKind.includes('widget') ? 24 : 18,
      rotation_deg: 0,
      z_index: currentItems.length + 1,
    })
    setWorking(null)
    if (addError) return setError(addError.message)
    setDraft((current) => ({ ...current, label: '', body: '', assetUrl: '', targetRoute: '' }))
    setNotice(`${displayItemKind(draft.itemKind)} added. Drag it around your ${pageMeta.label.toLowerCase()}.`)
    await load()
  }

  async function removeItem(itemId: string) {
    const client = supabase
    if (!client || !active) return
    setWorking(`delete:${itemId}`); setError(null)
    const { error: deleteError } = await client.from('character_space_items').delete().eq('id', itemId)
    setWorking(null)
    if (deleteError) return setError(deleteError.message)
    setNotice('Decoration removed.')
    await load()
  }

  async function persistPosition(item: CharacterSpaceItem, x: number, y: number) {
    const client = supabase
    if (!client || !active) return
    const { error: moveError } = await client.from('character_space_items').update({ position_x: x, position_y: y }).eq('id', item.id)
    if (moveError) setError(moveError.message)
  }

  function beginDrag(event: React.PointerEvent<HTMLDivElement>, item: CharacterSpaceItem) {
    if (!active || !canvasRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const initialX = item.position_x
    const initialY = item.position_y
    let finalX = initialX
    let finalY = initialY

    const move = (pointer: PointerEvent) => {
      const dx = ((pointer.clientX - startX) / rect.width) * 100
      const dy = ((pointer.clientY - startY) / rect.height) * 100
      finalX = Math.max(0, Math.min(100 - item.width_pct, initialX + dx))
      finalY = Math.max(0, Math.min(100 - item.height_pct, initialY + dy))
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, position_x: finalX, position_y: finalY } : entry))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      void persistPosition(item, finalX, finalY)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
  }

  function itemFace(item: CharacterSpaceItem) {
    if (item.asset_url) return <img src={item.asset_url} alt="" />
    if (item.item_kind === 'note') return <><strong>{item.label || 'Note'}</strong><p>{item.body || 'Write something here.'}</p></>
    if (item.item_kind === 'phone_contact') return <><span className="space-item-icon">☎</span><strong>{item.label || 'Contact'}</strong></>
    if (item.item_kind.includes('shortcut') || item.item_kind === 'desktop_icon') return <><span className="space-item-icon">▣</span><strong>{item.label || 'Shortcut'}</strong></>
    if (item.item_kind.includes('widget')) return <><span className="space-item-icon">✦</span><strong>{item.label || 'Widget'}</strong><small>{item.body || displayItemKind(item.item_kind)}</small></>
    return <><span className="space-item-icon">{item.item_kind === 'photo' ? '▧' : item.item_kind === 'charm' ? '◇' : item.item_kind === 'magnet' ? '●' : '✿'}</span><strong>{item.label || displayItemKind(item.item_kind)}</strong></>
  }

  if (!activeCharacter) return null

  return <main className="personal-spaces-page">
    <ShellTopbar eyebrow="HANAMI+ · PERSONAL SPACES" title={pageMeta.label} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount} />

    <section className="spaces-intro">
      <div><span className="eyebrow">{activeCharacter.display_name || activeCharacter.first_name || 'CHARACTER'}'S SPACE</span><h1>{pageMeta.label}</h1><p>{pageMeta.description}</p></div>
      <div className={`spaces-plus-status ${active ? 'active' : ''}`}><span>{active ? 'EDITING UNLOCKED' : 'VIEW MODE'}</span><strong>{active ? 'Hanami+' : 'Hanami+ required to edit'}</strong><small>Your saved space stays with this character even if Plus expires.</small></div>
    </section>

    <nav className="spaces-tabs" aria-label="Personal spaces">
      {(Object.keys(spaceMeta) as PersonalSpaceKind[]).map((kind) => <a key={kind} className={spaceKind === kind ? 'active' : ''} href={`#/profile/personal-spaces/${kind}`}><span>{spaceMeta[kind].icon}</span>{spaceMeta[kind].label}</a>)}
    </nav>

    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}

    {loading ? <section className="spaces-loading">Opening your personal space…</section> : <section className="spaces-workspace">
      <aside className="spaces-tools">
        <div className="spaces-tool-card"><span className="eyebrow">SPACE SETTINGS</span><label>Title<input disabled={!active} value={currentSpace?.title ?? pageMeta.label} onChange={(event) => setSpaces((current) => current.map((space) => space.space_kind === spaceKind ? { ...space, title: event.target.value } : space))} /></label><label>Visibility<select disabled={!active} value={currentSpace?.visibility ?? 'private'} onChange={(event) => setSpaces((current) => current.map((space) => space.space_kind === spaceKind ? { ...space, visibility: event.target.value as CharacterPersonalSpace['visibility'] } : space))}><option value="private">Private</option><option value="friends">Friends</option><option value="public">Public</option></select></label><label>Theme key<input disabled={!active} value={currentSpace?.theme_key ?? ''} onChange={(event) => setSpaces((current) => current.map((space) => space.space_kind === spaceKind ? { ...space, theme_key: event.target.value } : space))} placeholder="school-locker" /></label><label>Wallpaper / image URL<input disabled={!active} value={currentSpace?.wallpaper_url ?? ''} onChange={(event) => setSpaces((current) => current.map((space) => space.space_kind === spaceKind ? { ...space, wallpaper_url: event.target.value } : space))} placeholder="https://…" /></label><button type="button" disabled={!active || working === 'space'} onClick={() => void saveSpace(currentSpace ?? {})}>{working === 'space' ? 'Saving…' : 'Save space'}</button></div>

        <div className="spaces-tool-card"><span className="eyebrow">ADD DECORATION</span><label>Type<select disabled={!active} value={draft.itemKind} onChange={(event) => setDraft((current) => ({ ...current, itemKind: event.target.value }))}>{pageMeta.itemOptions.map((kind) => <option key={kind} value={kind}>{displayItemKind(kind)}</option>)}</select></label><label>Label<input disabled={!active} value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Favorite photo" /></label><label>Text / note<textarea disabled={!active} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} rows={3} /></label><label>Asset URL<input disabled={!active} value={draft.assetUrl} onChange={(event) => setDraft((current) => ({ ...current, assetUrl: event.target.value }))} placeholder="Optional image" /></label>{(spaceKind === 'phone' || spaceKind === 'desktop') && <label>Hanami shortcut<input disabled={!active} value={draft.targetRoute} onChange={(event) => setDraft((current) => ({ ...current, targetRoute: event.target.value }))} placeholder="#/profile/view-profile" /></label>}<button type="button" disabled={!active || working === 'add'} onClick={() => void addItem()}>{working === 'add' ? 'Adding…' : `Add ${displayItemKind(draft.itemKind)}`}</button></div>
      </aside>

      <section className="spaces-stage-column">
        <div className={`personal-space-canvas space-${spaceKind}`} ref={canvasRef} style={currentSpace?.wallpaper_url ? { backgroundImage: `url(${currentSpace.wallpaper_url})` } : undefined}>
          <div className="space-chrome"><span>{currentSpace?.title || pageMeta.label}</span><small>{currentItems.length} items · {currentSpace?.visibility || 'private'}</small></div>
          {spaceKind === 'locker' && <div className="locker-vents" aria-hidden="true">≡ ≡ ≡</div>}
          {spaceKind === 'desk' && <div className="desk-edge" aria-hidden="true" />}
          {spaceKind === 'phone' && <><div className="phone-speaker" aria-hidden="true" /><div className="phone-home" aria-hidden="true">○</div></>}
          {spaceKind === 'desktop' && <div className="desktop-taskbar"><span>Start</span><small>Hanami High · 2006</small></div>}
          {currentItems.map((item) => <div key={item.id} className={`space-item kind-${item.item_kind}`} style={{ left:`${item.position_x}%`, top:`${item.position_y}%`, width:`${item.width_pct}%`, height:`${item.height_pct}%`, transform:`rotate(${item.rotation_deg}deg)`, zIndex:item.z_index }} onPointerDown={(event) => beginDrag(event,item)} title={active ? 'Drag to reposition' : undefined}>{itemFace(item)}{active && <button type="button" className="space-item-delete" aria-label={`Remove ${item.label || item.item_kind}`} disabled={working === `delete:${item.id}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); void removeItem(item.id) }}>×</button>}</div>)}
        </div>
        <div className="spaces-stage-note"><strong>{active ? 'Drag decorations directly on the space.' : 'This is a saved Hanami+ space.'}</strong><span>{active ? 'Positions save when you release an item. Asset Library uploads will plug into the same decoration records later.' : 'Reactivate Hanami+ whenever you want to edit it again.'}</span></div>
      </section>
    </section>}
  </main>
}
