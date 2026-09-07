import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { BoutiqueItem, InventoryItem } from '../types/database-rewards'
import type { CharacterCosmeticLoadout } from '../types/database-customization'
import { BoutiqueArtwork } from './BoutiqueArtwork'
import { ProfileBackgroundPage } from './ProfileBackgroundPage'
import { ProfileDisplayStylePage } from './ProfileDisplayStylePage'
import { ProfileLayoutPage } from './ProfileLayoutPage'

type ToolTab = 'style' | 'background' | 'layout' | 'cosmetics'
type LoadoutField = 'avatar_decoration_item_id' | 'frame_item_id' | 'effect_item_id' | 'nameplate_item_id' | 'profile_card_item_id' | 'background_pack_item_id'

const fieldByType: Record<string, LoadoutField | undefined> = {
  avatar_decoration: 'avatar_decoration_item_id',
  frame: 'frame_item_id',
  effect: 'effect_item_id',
  nameplate: 'nameplate_item_id',
  profile_card: 'profile_card_item_id',
  background_pack: 'background_pack_item_id',
}

const typeLabels: Record<string, string> = {
  avatar_decoration: 'Avatar Decorations',
  frame: 'Frames',
  effect: 'Profile Effects',
  nameplate: 'Nameplates',
  profile_card: 'Profile Cards',
  background_pack: 'Background Packs',
}

function emptyLoadout(characterId: string, accountId: string): CharacterCosmeticLoadout {
  return {
    character_id: characterId,
    account_id: accountId,
    avatar_decoration_item_id: null,
    frame_item_id: null,
    effect_item_id: null,
    nameplate_item_id: null,
    profile_card_item_id: null,
    background_pack_item_id: null,
    updated_at: new Date().toISOString(),
  }
}

export function ProfileStudioTools() {
  const { activeCharacter, account } = useIdentity()
  const [hash, setHash] = useState(() => window.location.hash)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ToolTab>('style')
  const [items, setItems] = useState<BoutiqueItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loadout, setLoadout] = useState<CharacterCosmeticLoadout | null>(null)
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash
      setHash(next)
      if (next.startsWith('#/profile/display-name-style')) {
        setTab('style')
        setOpen(true)
      }
    }
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const inProfileStudio = hash.startsWith('#/profile/profile-studio') || hash.startsWith('#/profile/display-name-style')

  const loadCosmetics = useCallback(async () => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setLoading(true)
    setError(null)
    const [itemResult, inventoryResult, loadoutResult] = await Promise.all([
      client.from('boutique_items').select('*').eq('state', 'published').order('collection_name').order('name'),
      client.from('inventory_items').select('*').eq('account_id', account.id),
      client.from('character_cosmetic_loadouts').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
    ])
    setLoading(false)
    const first = itemResult.error || inventoryResult.error || loadoutResult.error
    if (first) {
      setError(first.message)
      return
    }
    setItems((itemResult.data ?? []).filter((item) => Boolean(fieldByType[item.item_type])))
    setInventory(inventoryResult.data ?? [])
    setLoadout(loadoutResult.data ?? emptyLoadout(activeCharacter.id, account.id))
  }, [account, activeCharacter])

  useEffect(() => {
    if (open && tab === 'cosmetics') void loadCosmetics()
  }, [open, tab, loadCosmetics])

  const ownedIds = useMemo(() => new Set(inventory.map((row) => row.item_id)), [inventory])
  const ownedItems = useMemo(() => items.filter((item) => ownedIds.has(item.id)), [items, ownedIds])
  const grouped = useMemo(() => {
    const map = new Map<string, BoutiqueItem[]>()
    for (const item of ownedItems) {
      const current = map.get(item.item_type) ?? []
      current.push(item)
      map.set(item.item_type, current)
    }
    return Array.from(map.entries())
  }, [ownedItems])

  function isEquipped(item: BoutiqueItem) {
    if (!loadout) return false
    const field = fieldByType[item.item_type]
    return field ? loadout[field] === item.id : false
  }

  async function setEquipped(item: BoutiqueItem, enabled: boolean) {
    const client = supabase
    if (!client || !account || !activeCharacter || !loadout) return
    const field = fieldByType[item.item_type]
    if (!field) return
    setWorking(item.id)
    setError(null)
    setNotice(null)
    const next = { ...loadout, [field]: enabled ? item.id : null, updated_at: new Date().toISOString() } as CharacterCosmeticLoadout
    const result = await client.from('character_cosmetic_loadouts').upsert({
      character_id: activeCharacter.id,
      account_id: account.id,
      avatar_decoration_item_id: next.avatar_decoration_item_id,
      frame_item_id: next.frame_item_id,
      effect_item_id: next.effect_item_id,
      nameplate_item_id: next.nameplate_item_id,
      profile_card_item_id: next.profile_card_item_id,
      background_pack_item_id: next.background_pack_item_id,
      updated_at: next.updated_at,
    }, { onConflict: 'character_id' }).select('*').single()
    setWorking(null)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setLoadout(result.data)
    setNotice(enabled ? `${item.name} equipped to this character. Publish your profile to update the public snapshot.` : `${item.name} unequipped.`)
  }

  function close() {
    setOpen(false)
    if (window.location.hash.startsWith('#/profile/display-name-style')) window.location.hash = '#/profile/profile-studio'
  }

  if (!activeCharacter || !account || !inProfileStudio) return null

  return <>
    {!open && <div className="profile-studio-tools-launcher">
      <button type="button" onClick={() => { setTab('style'); setOpen(true) }}>Aa Name Style</button>
      <button type="button" onClick={() => { setTab('background'); setOpen(true) }}>▧ Page Background</button>
      <button type="button" onClick={() => { setTab('layout'); setOpen(true) }}>▦ Page Layout</button>
      <button type="button" onClick={() => { setTab('cosmetics'); setOpen(true) }}>✦ Cosmetics</button>
    </div>}

    {open && <div className="profile-studio-tools-backdrop" role="dialog" aria-modal="true" aria-label="Profile style and cosmetics">
      <section className="profile-studio-tools-modal">
        <header className="profile-studio-tools-header">
          <div><span className="eyebrow">PROFILE STUDIO</span><strong>SpaceHey Page Studio</strong></div>
          <nav>
            <button type="button" className={tab === 'style' ? 'active' : ''} onClick={() => setTab('style')}>Display Name</button>
            <button type="button" className={tab === 'background' ? 'active' : ''} onClick={() => setTab('background')}>Page Background</button>
            <button type="button" className={tab === 'layout' ? 'active' : ''} onClick={() => setTab('layout')}>Page Layout</button>
            <button type="button" className={tab === 'cosmetics' ? 'active' : ''} onClick={() => setTab('cosmetics')}>Cosmetics</button>
          </nav>
          <button className="profile-studio-tools-close" type="button" onClick={close}>×</button>
        </header>

        <div className="profile-studio-tools-body">
          {tab === 'style' && <ProfileDisplayStylePage onSearch={() => {}} onNotifications={() => {}} unreadCount={0}/>} 
          {tab === 'background' && <ProfileBackgroundPage />}
          {tab === 'layout' && <ProfileLayoutPage />}
          {tab === 'cosmetics' && <section className="profile-cosmetics-panel">
            <div className="profile-cosmetics-intro"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Equip profile cosmetics</h2><p>Cosmetics are owned by your Hanami account but equipped separately for each character. Animated items respect reduced-motion preferences.</p></div><a className="secondary-action" href="#/boutique/featured" onClick={() => setOpen(false)}>Open Boutique</a></div>
            {error && <div className="identity-notice error">{error}</div>}
            {notice && <div className="identity-notice success">{notice}</div>}
            {loading ? <div className="studio-loading">Loading your cosmetics…</div> : grouped.length === 0 ? <div className="profile-cosmetics-empty">You do not own equipable profile cosmetics yet. Visit the Boutique to collect some.</div> : <div className="profile-cosmetics-groups">
              {grouped.map(([type, groupItems]) => <section key={type}><header><h3>{typeLabels[type] ?? type.replaceAll('_', ' ')}</h3><span>{groupItems.length} owned</span></header><div className="profile-cosmetics-grid">{groupItems.map((item) => {
                const equipped = isEquipped(item)
                return <article className={`profile-cosmetic-card ${equipped ? 'equipped' : ''}`} key={item.id}>
                  <div className="profile-cosmetic-art"><BoutiqueArtwork token={item.preview_token} name={item.name} type={item.item_type}/>{equipped && <span>EQUIPPED</span>}</div>
                  <div><span className="eyebrow">{item.collection_name || item.rarity}</span><h4>{item.name}</h4><p>{item.description}</p></div>
                  <button type="button" className={equipped ? 'secondary-action' : 'primary-action'} disabled={working === item.id} onClick={() => void setEquipped(item, !equipped)}>{working === item.id ? 'Saving…' : equipped ? 'Unequip' : 'Equip'}</button>
                </article>
              })}</div></section>)}
            </div>}
          </section>}
        </div>
      </section>
    </div>}
  </>
}
