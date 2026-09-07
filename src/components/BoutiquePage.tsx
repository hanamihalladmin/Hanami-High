import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { BoutiqueItem, HanamiPlusEntitlement, InventoryItem, PetalWallet } from '../types/database-rewards'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'featured' | 'new' | 'seasonal' | 'frames' | 'effects' | 'nameplates' | 'hanami-plus-passes' | 'my-inventory'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

const modeMeta: Record<Mode, { title: string; description: string }> = {
  featured: { title: 'Featured', description: 'Featured cosmetics and Hanami rewards.' },
  new: { title: 'New', description: 'Recently added Boutique items.' },
  seasonal: { title: 'Seasonal', description: 'Seasonal collections inspired by the 2006 school year.' },
  frames: { title: 'Frames', description: 'Profile and avatar frame cosmetics.' },
  effects: { title: 'Effects', description: 'Decorative profile effects.' },
  nameplates: { title: 'Nameplates', description: 'Character nameplate styles.' },
  'hanami-plus-passes': { title: 'Hanami+ Passes', description: 'Time-limited Hanami+ cosmetic access purchased with Petals.' },
  'my-inventory': { title: 'My Inventory', description: 'Everything owned by this account.' },
}

export function BoutiquePage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account, capabilities } = useIdentity()
  const [wallet, setWallet] = useState<PetalWallet | null>(null)
  const [items, setItems] = useState<BoutiqueItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [plus, setPlus] = useState<HanamiPlusEntitlement | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', slug: '', description: '', type: 'frame', collection: '', season: 'permanent', rarity: 'common', price: '50', state: 'published', featured: false, passDays: '7', token: '' })
  const canManage = capabilities.includes('boutique.manage')

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    setLoading(true); setError(null)
    const [walletResult, itemResult, inventoryResult, plusResult] = await Promise.all([
      client.from('petal_wallets').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('boutique_items').select('*').order('featured', { ascending: false }).order('created_at', { ascending: false }),
      client.from('inventory_items').select('*').eq('account_id', account.id).order('acquired_at', { ascending: false }),
      client.from('hanami_plus_entitlements').select('*').eq('account_id', account.id).maybeSingle(),
    ])
    const firstError = [walletResult.error, itemResult.error, inventoryResult.error, plusResult.error].find(Boolean)
    if (firstError) { setLoading(false); setError(firstError.message); return }
    setWallet(walletResult.data); setItems(itemResult.data ?? []); setInventory(inventoryResult.data ?? []); setPlus(plusResult.data); setLoading(false)
  }, [account])

  useEffect(() => { void load() }, [load])

  const ownedByItem = useMemo(() => new Map(inventory.map((item) => [item.item_id, item])), [inventory])
  const visible = useMemo(() => {
    if (mode === 'my-inventory') return items.filter((item) => ownedByItem.has(item.id))
    if (mode === 'featured') return items.filter((item) => item.featured)
    if (mode === 'new') return items.filter((item) => item.is_new)
    if (mode === 'seasonal') return items.filter((item) => item.season !== 'permanent')
    if (mode === 'frames') return items.filter((item) => item.item_type === 'frame')
    if (mode === 'effects') return items.filter((item) => item.item_type === 'effect')
    if (mode === 'nameplates') return items.filter((item) => item.item_type === 'nameplate')
    return items.filter((item) => item.item_type === 'hanami_plus_pass')
  }, [items, mode, ownedByItem])

  async function purchase(item: BoutiqueItem) {
    const client = supabase
    if (!client) return
    setWorking(item.id); setError(null); setNotice(null)
    const { data, error: purchaseError } = await client.rpc('purchase_boutique_item', { p_item_id: item.id, p_request_id: crypto.randomUUID() })
    setWorking(null)
    if (purchaseError) return setError(purchaseError.message)
    setNotice(`${item.name} added to your account. ${data?.[0]?.balance ?? wallet?.balance ?? 0} Petals remaining.`)
    await load()
  }

  async function createItem() {
    const client = supabase
    if (!client) return
    setWorking('create'); setError(null); setNotice(null)
    const { error: createError } = await client.from('boutique_items').insert({
      name: draft.name.trim(), slug: draft.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'), description: draft.description.trim(),
      item_type: draft.type, collection_name: draft.collection.trim() || null, season: draft.season, rarity: draft.rarity,
      price_petals: Number(draft.price), state: draft.state, featured: draft.featured, is_new: true,
      pass_days: draft.type === 'hanami_plus_pass' ? Number(draft.passDays) : null, preview_token: draft.token.trim() || null,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setDraft({ name: '', slug: '', description: '', type: 'frame', collection: '', season: 'permanent', rarity: 'common', price: '50', state: 'published', featured: false, passDays: '7', token: '' })
    setNotice('Boutique item created.')
    await load()
  }

  async function toggleState(item: BoutiqueItem) {
    const client = supabase
    if (!client) return
    setWorking(item.id)
    const { error: updateError } = await client.from('boutique_items').update({ state: item.state === 'published' ? 'retired' : 'published' }).eq('id', item.id)
    setWorking(null)
    if (updateError) return setError(updateError.message)
    setNotice('Boutique item state updated.')
    await load()
  }

  const plusActive = plus && new Date(plus.ends_at).getTime() > Date.now()

  return <main className="content-area boutique-page">
    <ShellTopbar eyebrow="BOUTIQUE" title={modeMeta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <div className="boutique-intro"><div><span className="eyebrow">HANAMI BOUTIQUE</span><p>{modeMeta[mode].description}</p></div><div><span>WALLET</span><strong>❀ {wallet?.balance ?? 0}</strong>{plusActive && <small>Hanami+ until {new Date(plus.ends_at).toLocaleDateString()}</small>}</div></div>
    {error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}
    {canManage && mode === 'featured' && <section className="rewards-panel"><header><div><span className="eyebrow">BOUTIQUE MANAGEMENT</span><h2>Create item</h2></div></header><form className="boutique-admin-form" onSubmit={(event) => { event.preventDefault(); void createItem() }}><div className="reward-inline"><input required placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/><input required placeholder="Slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })}/><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="frame">Frame</option><option value="effect">Effect</option><option value="nameplate">Nameplate</option><option value="hanami_plus_pass">Hanami+ pass</option></select></div><textarea required placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/><div className="reward-inline"><input placeholder="Collection" value={draft.collection} onChange={(event) => setDraft({ ...draft, collection: event.target.value })}/><select value={draft.season} onChange={(event) => setDraft({ ...draft, season: event.target.value })}><option value="permanent">Permanent</option><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select><select value={draft.rarity} onChange={(event) => setDraft({ ...draft, rarity: event.target.value })}><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary">Legendary</option></select></div><div className="reward-inline"><input required type="number" min="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })}/>{draft.type === 'hanami_plus_pass' && <input required type="number" min="1" max="365" placeholder="Pass days" value={draft.passDays} onChange={(event) => setDraft({ ...draft, passDays: event.target.value })}/>}<input placeholder="Preview token" value={draft.token} onChange={(event) => setDraft({ ...draft, token: event.target.value })}/><select value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value })}><option value="published">Publish</option><option value="draft">Draft</option></select></div><label className="profile-blog-check"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}/> Feature item</label><button className="primary-action" disabled={working === 'create'}>Create item</button></form></section>}
    {loading ? <div className="rewards-empty">Loading Boutique…</div> : visible.length === 0 ? <div className="rewards-empty">No items in this collection yet.</div> : <div className="boutique-grid">{visible.map((item) => { const owned = ownedByItem.get(item.id); const canBuy = (wallet?.balance ?? 0) >= item.price_petals && (!owned || item.item_type === 'hanami_plus_pass'); return <article className={`boutique-card rarity-${item.rarity}`} key={item.id}><div className={`boutique-preview preview-${item.preview_token || item.item_type}`}><span>{item.item_type === 'frame' ? '▣' : item.item_type === 'effect' ? '✦' : item.item_type === 'nameplate' ? '▰' : '✿+'}</span></div><div className="boutique-card-body"><span className="eyebrow">{item.rarity} · {item.collection_name || item.season}</span><h2>{item.name}</h2><p>{item.description}</p><div className="boutique-meta"><span>{item.item_type.replaceAll('_',' ')}</span>{item.pass_days && <span>{item.pass_days} days</span>}{owned && <strong>Owned ×{owned.quantity}</strong>}</div></div><footer><strong>❀ {item.price_petals}</strong>{canManage && <button disabled={working === item.id} onClick={() => void toggleState(item)}>{item.state}</button>}{mode !== 'my-inventory' && <button className="primary-action" disabled={!canBuy || working === item.id} onClick={() => void purchase(item)}>{owned && item.item_type !== 'hanami_plus_pass' ? 'Owned' : !canBuy ? 'Not enough Petals' : working === item.id ? 'Purchasing…' : 'Purchase'}</button>}</footer></article>})}</div>}
  </main>
}
