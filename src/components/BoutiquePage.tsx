import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { BoutiqueItem, HanamiPlusEntitlement, InventoryItem, PetalWallet } from '../types/database-rewards'
import { BoutiqueArtwork } from './BoutiqueArtwork'
import { ShellTopbar } from './ShellTopbar'

type Mode =
  | 'featured'
  | 'new'
  | 'seasonal'
  | 'avatar-decorations'
  | 'frames'
  | 'effects'
  | 'nameplates'
  | 'profile-cards'
  | 'background-packs'
  | 'stickers'
  | 'hanami-plus-passes'
  | 'my-inventory'

type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

const modeMeta: Record<Mode, { title: string; description: string }> = {
  featured: { title: 'Featured', description: 'Hanami’s current collectible drops and highlighted cosmetics.' },
  new: { title: 'New', description: 'Recently added cosmetics, decorations, cards, and effects.' },
  seasonal: { title: 'Seasonal', description: 'Limited collections tied to the 2006 Hanami school year.' },
  'avatar-decorations': { title: 'Avatar Decorations', description: 'Collectible decorations that frame and orbit your avatar.' },
  frames: { title: 'Frames', description: 'Profile and avatar frames for your Hanami identity card.' },
  effects: { title: 'Effects', description: 'Decorative profile effects and animated-style visual treatments.' },
  nameplates: { title: 'Nameplates', description: 'Character nameplate styles for profiles and social surfaces.' },
  'profile-cards': { title: 'Profile Cards', description: 'Alternative identity-card treatments for your profile.' },
  'background-packs': { title: 'Background Packs', description: 'Collectible background scenes for profile customization.' },
  stickers: { title: 'Stickers', description: 'Sticker sheets and decorative profile pieces.' },
  'hanami-plus-passes': { title: 'Hanami+ Passes', description: 'Time-limited Hanami+ cosmetic access purchased with Petals.' },
  'my-inventory': { title: 'My Inventory', description: 'Everything currently owned by this account.' },
}

const typeLabels: Record<string, string> = {
  avatar_decoration: 'Avatar Decoration',
  frame: 'Frame',
  effect: 'Profile Effect',
  nameplate: 'Nameplate',
  profile_card: 'Profile Card',
  background_pack: 'Background Pack',
  sticker: 'Sticker',
  hanami_plus_pass: 'Hanami+ Pass',
}

export function BoutiquePage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account } = useIdentity()
  const [wallet, setWallet] = useState<PetalWallet | null>(null)
  const [items, setItems] = useState<BoutiqueItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [plus, setPlus] = useState<HanamiPlusEntitlement | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    setLoading(true)
    setError(null)
    const [walletResult, itemResult, inventoryResult, plusResult] = await Promise.all([
      client.from('petal_wallets').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('boutique_items').select('*').eq('state', 'published').order('featured', { ascending: false }).order('created_at', { ascending: false }),
      client.from('inventory_items').select('*').eq('account_id', account.id).order('acquired_at', { ascending: false }),
      client.from('hanami_plus_entitlements').select('*').eq('account_id', account.id).maybeSingle(),
    ])
    const firstError = [walletResult.error, itemResult.error, inventoryResult.error, plusResult.error].find(Boolean)
    if (firstError) {
      setLoading(false)
      setError(firstError.message)
      return
    }
    setWallet(walletResult.data)
    setItems(itemResult.data ?? [])
    setInventory(inventoryResult.data ?? [])
    setPlus(plusResult.data)
    setLoading(false)
  }, [account])

  useEffect(() => { void load() }, [load])

  const ownedByItem = useMemo(() => new Map(inventory.map((item) => [item.item_id, item])), [inventory])

  const visible = useMemo(() => {
    if (mode === 'my-inventory') return items.filter((item) => ownedByItem.has(item.id))
    if (mode === 'featured') return items.filter((item) => item.featured)
    if (mode === 'new') return items.filter((item) => item.is_new)
    if (mode === 'seasonal') return items.filter((item) => item.season !== 'permanent')
    if (mode === 'avatar-decorations') return items.filter((item) => item.item_type === 'avatar_decoration')
    if (mode === 'frames') return items.filter((item) => item.item_type === 'frame')
    if (mode === 'effects') return items.filter((item) => item.item_type === 'effect')
    if (mode === 'nameplates') return items.filter((item) => item.item_type === 'nameplate')
    if (mode === 'profile-cards') return items.filter((item) => item.item_type === 'profile_card')
    if (mode === 'background-packs') return items.filter((item) => item.item_type === 'background_pack')
    if (mode === 'stickers') return items.filter((item) => item.item_type === 'sticker')
    return items.filter((item) => item.item_type === 'hanami_plus_pass')
  }, [items, mode, ownedByItem])

  const hero = useMemo(() => {
    const selected = previewId ? items.find((item) => item.id === previewId) : null
    return selected || visible.find((item) => item.featured) || visible[0] || items.find((item) => item.featured) || items[0] || null
  }, [items, previewId, visible])

  async function purchase(item: BoutiqueItem) {
    const client = supabase
    if (!client) return
    setWorking(item.id)
    setError(null)
    setNotice(null)
    const { data, error: purchaseError } = await client.rpc('purchase_boutique_item', {
      p_item_id: item.id,
      p_request_id: crypto.randomUUID(),
    })
    setWorking(null)
    if (purchaseError) return setError(purchaseError.message)
    setNotice(`${item.name} added to your account. ${data?.[0]?.balance ?? wallet?.balance ?? 0} Petals remaining.`)
    await load()
  }

  const plusActive = plus && new Date(plus.ends_at).getTime() > Date.now()

  function actionFor(item: BoutiqueItem, compact = false) {
    const owned = ownedByItem.get(item.id)
    const enough = (wallet?.balance ?? 0) >= item.price_petals
    const repeatable = item.item_type === 'hanami_plus_pass'
    const canBuy = enough && (!owned || repeatable)
    if (mode === 'my-inventory') return <span className="boutique-owned-badge">Owned ×{owned?.quantity ?? 1}</span>
    return <button className="boutique-buy-button" disabled={!canBuy || working === item.id} onClick={(event) => { event.stopPropagation(); void purchase(item) }}>
      {working === item.id ? 'Purchasing…' : owned && !repeatable ? 'Owned' : !enough ? 'Need more Petals' : compact ? `❀ ${item.price_petals}` : `Purchase · ❀ ${item.price_petals}`}
    </button>
  }

  return <main className="content-area boutique-page boutique-storefront">
    <ShellTopbar eyebrow="BOUTIQUE" title={modeMeta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>

    <div className="boutique-storebar">
      <div><span className="eyebrow">HANAMI COLLECTIBLES</span><p>{modeMeta[mode].description}</p></div>
      <div className="boutique-wallet-chip"><span>YOUR PETALS</span><strong>❀ {wallet?.balance ?? 0}</strong>{plusActive && <small>Hanami+ · {new Date(plus.ends_at).toLocaleDateString()}</small>}</div>
    </div>

    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}

    {loading ? <div className="rewards-empty">Loading the Boutique…</div> : <>
      {hero && mode !== 'my-inventory' && <section className={`boutique-feature-hero rarity-${hero.rarity}`}>
        <div className="boutique-feature-art"><BoutiqueArtwork token={hero.preview_token} name={hero.name} type={hero.item_type} large/></div>
        <div className="boutique-feature-copy">
          <div className="boutique-feature-tags"><span>{typeLabels[hero.item_type] || hero.item_type}</span><span>{hero.rarity}</span>{hero.is_new && <span>NEW</span>}</div>
          <span className="eyebrow">{hero.collection_name || `${hero.season} collection`}</span>
          <h1>{hero.name}</h1>
          <p>{hero.description}</p>
          <div className="boutique-feature-price"><strong>❀ {hero.price_petals}</strong>{hero.pass_days && <span>{hero.pass_days} days of Hanami+</span>}</div>
          <div className="boutique-feature-actions">{actionFor(hero)}<button type="button" onClick={() => setPreviewId(null)}>Reset preview</button></div>
        </div>
      </section>}

      <section className="boutique-shelf">
        <header><div><span className="eyebrow">{mode === 'my-inventory' ? 'OWNED COLLECTION' : 'BROWSE'}</span><h2>{modeMeta[mode].title}</h2></div><strong>{visible.length} item{visible.length === 1 ? '' : 's'}</strong></header>
        {visible.length === 0 ? <div className="rewards-empty">No items are available in this collection yet.</div> : <div className="boutique-orb-grid">{visible.map((item) => {
          const owned = ownedByItem.get(item.id)
          return <article className={`boutique-orb-card rarity-${item.rarity} ${hero?.id === item.id ? 'previewing' : ''}`} key={item.id} onClick={() => setPreviewId(item.id)}>
            <div className="boutique-orb-art"><BoutiqueArtwork token={item.preview_token} name={item.name} type={item.item_type}/>{item.is_new && <span className="boutique-new-flag">NEW</span>}{owned && <span className="boutique-owned-flag">OWNED</span>}</div>
            <div className="boutique-orb-copy"><span className="eyebrow">{item.collection_name || item.season}</span><h3>{item.name}</h3><p>{item.description}</p><div className="boutique-orb-meta"><span>{typeLabels[item.item_type] || item.item_type}</span><span>{item.rarity}</span>{item.pass_days && <span>{item.pass_days} days</span>}</div></div>
            <footer><strong>❀ {item.price_petals}</strong>{actionFor(item, true)}</footer>
          </article>
        })}</div>}
      </section>
    </>}
  </main>
}
