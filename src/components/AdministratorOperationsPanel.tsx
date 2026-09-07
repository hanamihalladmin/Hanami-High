import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { OwnerAccountRow, OwnerCharacterRow, OwnerPortalSnapshot } from '../types/database-owner'
import type { OwnerEconomyRow, SiteConfigurationRow } from '../types/database-platform'
import type { BoutiqueItem } from '../types/database-rewards'

type Tab = 'overview' | 'accounts' | 'characters' | 'economy' | 'boutique' | 'system'

type BoutiqueDraft = {
  name: string
  slug: string
  description: string
  itemType: string
  collection: string
  season: string
  rarity: string
  price: string
  state: string
  passDays: string
  previewToken: string
}

const emptyBoutiqueDraft: BoutiqueDraft = {
  name: '',
  slug: '',
  description: '',
  itemType: 'frame',
  collection: '',
  season: 'permanent',
  rarity: 'common',
  price: '50',
  state: 'draft',
  passDays: '7',
  previewToken: '',
}

function characterName(character: OwnerCharacterRow) {
  return character.display_name || [character.first_name, character.last_name].filter(Boolean).join(' ') || `Character ${character.slot_no}`
}

function characterRole(character: OwnerCharacterRow) {
  if (character.character_kind === 'faculty' && character.school_role === 'new_faculty') return 'New Teacher'
  if (character.character_kind === 'faculty' && (character.school_role === 'faculty' || character.school_role === null)) return 'Teacher'
  if (character.school_role === 'administration') return 'Staff (future portal)'
  if (!character.school_role) return 'Applicant'
  return character.school_role.split('_').map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ')
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
}

export function AdministratorOperationsPanel() {
  const { account, capabilities } = useIdentity()
  const canAccounts = capabilities.includes('accounts.manage')
  const canCharacters = capabilities.includes('characters.review')
  const canViewPortal = capabilities.includes('portals.view_as')
  const canEconomy = capabilities.includes('economy.manage')
  const canPlus = capabilities.includes('hanamiplus.manage')
  const canBoutique = capabilities.includes('boutique.manage')
  const canSystem = capabilities.includes('system.configure')
  const canSchool = capabilities.includes('school.configure')

  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Overview', enabled: true },
    { id: 'accounts' as const, label: 'Accounts', enabled: canAccounts },
    { id: 'characters' as const, label: 'Characters', enabled: canCharacters || canViewPortal || canSchool },
    { id: 'economy' as const, label: 'Economy', enabled: canEconomy || canPlus },
    { id: 'boutique' as const, label: 'Boutique', enabled: canBoutique },
    { id: 'system' as const, label: 'System', enabled: canSystem },
  ].filter((item) => item.enabled), [canAccounts, canBoutique, canCharacters, canEconomy, canPlus, canSchool, canSystem, canViewPortal])

  const [tab, setTab] = useState<Tab>('overview')
  const [accounts, setAccounts] = useState<OwnerAccountRow[]>([])
  const [characters, setCharacters] = useState<OwnerCharacterRow[]>([])
  const [economy, setEconomy] = useState<OwnerEconomyRow[]>([])
  const [configuration, setConfiguration] = useState<SiteConfigurationRow[]>([])
  const [boutique, setBoutique] = useState<BoutiqueItem[]>([])
  const [configurationDrafts, setConfigurationDrafts] = useState<Record<string, string>>({})
  const [boutiquePrices, setBoutiquePrices] = useState<Record<string, string>>({})
  const [boutiqueDraft, setBoutiqueDraft] = useState<BoutiqueDraft>(emptyBoutiqueDraft)
  const [economyDraft, setEconomyDraft] = useState({ accountId: '', amount: '25', note: '' })
  const [plusDraft, setPlusDraft] = useState({ accountId: '', days: '7', note: '' })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [portal, setPortal] = useState<OwnerPortalSnapshot | null>(null)
  const [portalCharacterId, setPortalCharacterId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client) return
    setLoading(true)
    setError(null)

    const accountPromise = canAccounts ? client.rpc('owner_console_accounts') : Promise.resolve({ data: [] as OwnerAccountRow[], error: null })
    const characterPromise = (canCharacters || canViewPortal || canSchool) ? client.rpc('owner_console_characters') : Promise.resolve({ data: [] as OwnerCharacterRow[], error: null })
    const economyPromise = canEconomy ? client.rpc('owner_console_economy') : Promise.resolve({ data: [] as OwnerEconomyRow[], error: null })
    const configurationPromise = canSystem ? client.from('site_configuration').select('*').order('key') : Promise.resolve({ data: [] as SiteConfigurationRow[], error: null })
    const boutiquePromise = canBoutique ? client.from('boutique_items').select('*').order('collection_name').order('name') : Promise.resolve({ data: [] as BoutiqueItem[], error: null })

    const [accountResult, characterResult, economyResult, configurationResult, boutiqueResult] = await Promise.all([
      accountPromise,
      characterPromise,
      economyPromise,
      configurationPromise,
      boutiquePromise,
    ])

    setLoading(false)
    const first = [accountResult.error, characterResult.error, economyResult.error, configurationResult.error, boutiqueResult.error].find(Boolean)
    if (first) {
      setError(first.message)
      return
    }

    const nextAccounts = accountResult.data ?? []
    const nextCharacters = characterResult.data ?? []
    const nextEconomy = economyResult.data ?? []
    const nextConfiguration = configurationResult.data ?? []
    const nextBoutique = boutiqueResult.data ?? []

    setAccounts(nextAccounts)
    setCharacters(nextCharacters)
    setEconomy(nextEconomy)
    setConfiguration(nextConfiguration)
    setBoutique(nextBoutique)
    setConfigurationDrafts(Object.fromEntries(nextConfiguration.map((item) => [item.key, formatJson(item.value)])))
    setBoutiquePrices(Object.fromEntries(nextBoutique.map((item) => [item.id, String(item.price_petals)])))

    const firstAccountId = nextAccounts[0]?.account_id || nextEconomy[0]?.account_id || ''
    setEconomyDraft((current) => ({ ...current, accountId: current.accountId || firstAccountId }))
    setPlusDraft((current) => ({ ...current, accountId: current.accountId || firstAccountId }))
  }, [canAccounts, canBoutique, canCharacters, canEconomy, canSchool, canSystem, canViewPortal])

  useEffect(() => { void load() }, [load])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredAccounts = useMemo(() => accounts.filter((item) => !normalizedQuery || `${item.discord_username || ''} ${item.account_state} ${item.platform_roles.join(' ')}`.toLowerCase().includes(normalizedQuery)), [accounts, normalizedQuery])
  const filteredCharacters = useMemo(() => characters.filter((item) => !normalizedQuery || `${characterName(item)} ${item.discord_username || ''} ${item.handle || ''} ${characterRole(item)} ${item.character_state}`.toLowerCase().includes(normalizedQuery)), [characters, normalizedQuery])
  const filteredBoutique = useMemo(() => boutique.filter((item) => !normalizedQuery || `${item.name} ${item.slug} ${item.item_type} ${item.collection_name || ''} ${item.state}`.toLowerCase().includes(normalizedQuery)), [boutique, normalizedQuery])

  async function run(key: string, action: () => Promise<{ error: { message: string } | null }>, success: string) {
    setWorking(key)
    setError(null)
    setNotice(null)
    const result = await action()
    setWorking(null)
    if (result.error) {
      setError(result.error.message)
      return false
    }
    setNotice(success)
    await load()
    return true
  }

  async function setAccountState(accountId: string, state: string) {
    const client = supabase
    if (!client || !canAccounts) return
    await run(`account:${accountId}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_account_state', { p_account_id: accountId, p_state: state })
      return { error: actionError }
    }, 'Account state updated.')
  }

  async function setCharacterState(characterId: string, state: string) {
    const client = supabase
    if (!client || !canCharacters) return
    await run(`character:${characterId}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_character_state', { p_character_id: characterId, p_state: state })
      return { error: actionError }
    }, 'Character lifecycle state updated.')
  }

  async function setTeacherStatus(character: OwnerCharacterRow, enabled: boolean) {
    const client = supabase
    if (!client || !canSchool) return
    await run(`teacher:${character.character_id}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_teacher_status', { p_character_id: character.character_id, p_enabled: enabled })
      return { error: actionError }
    }, enabled ? 'Teacher access assigned.' : 'Teacher access removed.')
  }

  async function openPortal(characterId: string) {
    const client = supabase
    if (!client || !canViewPortal) return
    setWorking(`portal:${characterId}`)
    setError(null)
    setNotice(null)
    const { data, error: portalError } = await client.rpc('owner_portal_snapshot', { p_character_id: characterId })
    setWorking(null)
    if (portalError) {
      setError(portalError.message)
      return
    }
    setPortal(data)
    setPortalCharacterId(characterId)
  }

  async function adjustPetals() {
    const client = supabase
    if (!client || !canEconomy || !economyDraft.accountId) return
    const success = await run('economy:petals', async () => {
      const { error: actionError } = await client.rpc('owner_adjust_petals', {
        p_account_id: economyDraft.accountId,
        p_amount: Number(economyDraft.amount),
        p_note: economyDraft.note,
        p_request_id: crypto.randomUUID(),
      })
      return { error: actionError }
    }, 'Petal adjustment posted to the audited ledger.')
    if (success) setEconomyDraft((current) => ({ ...current, note: '' }))
  }

  async function grantPlus() {
    const client = supabase
    if (!client || !canPlus || !plusDraft.accountId) return
    const success = await run('economy:plus', async () => {
      const { error: actionError } = await client.rpc('owner_grant_hanami_plus', {
        p_account_id: plusDraft.accountId,
        p_days: Number(plusDraft.days),
        p_note: plusDraft.note,
      })
      return { error: actionError }
    }, 'Hanami+ time granted.')
    if (success) setPlusDraft((current) => ({ ...current, note: '' }))
  }

  async function saveConfiguration(item: SiteConfigurationRow) {
    const client = supabase
    if (!client || !account || !canSystem) return
    let value: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(configurationDrafts[item.key] || '{}')
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Configuration must be a JSON object.')
      value = parsed as Record<string, unknown>
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Configuration JSON is invalid.')
      return
    }
    await run(`config:${item.key}`, async () => {
      const { error: actionError } = await client.from('site_configuration').update({ value, updated_by_account_id: account.id, updated_at: new Date().toISOString() }).eq('key', item.key)
      return { error: actionError }
    }, `${item.key.replaceAll('_', ' ')} configuration saved.`)
  }

  async function updateBoutiqueItem(item: BoutiqueItem, patch: Partial<BoutiqueItem>, message: string) {
    const client = supabase
    if (!client || !canBoutique) return
    await run(`boutique:${item.id}`, async () => {
      const { error: actionError } = await client.from('boutique_items').update(patch).eq('id', item.id)
      return { error: actionError }
    }, message)
  }

  async function saveBoutiquePrice(item: BoutiqueItem) {
    const nextPrice = Number(boutiquePrices[item.id])
    if (!Number.isFinite(nextPrice) || nextPrice < 1) {
      setError('Boutique price must be at least 1 Petal.')
      return
    }
    await updateBoutiqueItem(item, { price_petals: Math.round(nextPrice) }, `${item.name} price updated.`)
  }

  async function createBoutiqueItem() {
    const client = supabase
    if (!client || !canBoutique || !boutiqueDraft.name.trim() || !boutiqueDraft.description.trim()) return
    const slug = boutiqueDraft.slug.trim() || slugify(boutiqueDraft.name)
    const price = Math.max(1, Math.round(Number(boutiqueDraft.price) || 1))
    const passDays = boutiqueDraft.itemType === 'hanami_plus_pass' ? Math.max(1, Math.min(365, Math.round(Number(boutiqueDraft.passDays) || 7))) : null
    setWorking('boutique:create')
    setError(null)
    setNotice(null)
    const result = await client.from('boutique_items').insert({
      slug,
      name: boutiqueDraft.name.trim(),
      description: boutiqueDraft.description.trim(),
      item_type: boutiqueDraft.itemType,
      collection_name: boutiqueDraft.collection.trim() || null,
      season: boutiqueDraft.season,
      rarity: boutiqueDraft.rarity,
      price_petals: price,
      state: boutiqueDraft.state,
      featured: false,
      is_new: true,
      pass_days: passDays,
      preview_token: boutiqueDraft.previewToken.trim() || null,
    })
    setWorking(null)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setBoutiqueDraft(emptyBoutiqueDraft)
    setNotice('Boutique item created.')
    await load()
  }

  function renderPortal() {
    if (!portal || !portalCharacterId) return null
    return <section className="owner-portal-preview">
      <header><div><strong>ADMINISTRATOR VIEW MODE</strong><span>Read-only character portal snapshot</span></div><button type="button" onClick={() => { setPortal(null); setPortalCharacterId(null) }}>Exit View Mode</button></header>
      <div className="owner-portal-summary">
        <article><span>CHARACTER</span><strong>{portal.character.name}</strong><small>{portal.character.role === 'faculty' ? 'Teacher' : portal.character.role || portal.character.kind} · {portal.character.state}</small></article>
        <article><span>ACCOUNT</span><strong>{portal.account.discord_username || 'Connected member'}</strong><small>{portal.account.state}</small></article>
        <article><span>ACADEMICS</span><strong>{portal.academics.sections.length} sections</strong><small>{portal.academics.graded_assignments} grades · {portal.academics.attendance_records} attendance records</small></article>
        <article><span>SOCIAL</span><strong>{portal.social.friends} friends</strong><small>{portal.social.posts} published posts</small></article>
        <article><span>CAMPUS</span><strong>{portal.campus.groups.length} groups</strong><small>{portal.campus.groups.map((group) => group.name).join(', ') || 'No active groups'}</small></article>
        <article><span>WALLET</span><strong>❀ {portal.economy.petals}</strong><small>account-wide Petals</small></article>
      </div>
    </section>
  }

  function renderOverview() {
    return <div className="owner-operations-stack">
      <div className="owner-ops-stats">
        {canAccounts && <article><span>ACCOUNTS</span><strong>{accounts.length}</strong><small>manageable accounts</small></article>}
        {(canCharacters || canViewPortal) && <article><span>CHARACTERS</span><strong>{characters.length}</strong><small>visible character records</small></article>}
        {canEconomy && <article><span>WALLETS</span><strong>{economy.length}</strong><small>economy records</small></article>}
        {canBoutique && <article><span>BOUTIQUE</span><strong>{boutique.length}</strong><small>catalog items</small></article>}
      </div>
      <section className="owner-ops-panel"><header><div><span className="eyebrow">ADMINISTRATOR SCOPE</span><h2>Assigned platform capabilities</h2></div><strong>{capabilities.length}</strong></header><div className="owner-capability-grid">{capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div></section>
      <div className="owner-future-staff-note"><strong>Owner-only controls are intentionally absent.</strong><p>Administrator mode does not expose Student promotion, platform-role assignment, moderation review, or protected audit history unless those capabilities are explicitly granted in the platform model.</p></div>
    </div>
  }

  function renderAccounts() {
    return <section className="owner-ops-panel"><header><div><span className="eyebrow">ACCOUNT ADMINISTRATION</span><h2>Hanami accounts</h2></div><strong>{filteredAccounts.length}</strong></header><div className="owner-filter"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, state, or platform role…" /></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Account</th><th>Characters</th><th>State</th><th>Roles</th></tr></thead><tbody>{filteredAccounts.map((item) => <tr key={item.account_id}><td><strong>{item.discord_username || 'Connected member'}</strong></td><td>{item.character_count}</td><td><select disabled={working === `account:${item.account_id}`} value={item.account_state} onChange={(event) => void setAccountState(item.account_id, event.target.value)}><option value="active">active</option><option value="restricted">restricted</option><option value="suspended">suspended</option><option value="archived">archived</option></select></td><td><span>{item.platform_roles.join(', ') || 'member'}</span><small>Read-only in Administrator mode</small></td></tr>)}</tbody></table></div></section>
  }

  function renderCharacters() {
    return <div className="owner-operations-stack">{renderPortal()}<section className="owner-ops-panel"><header><div><span className="eyebrow">CHARACTER ADMINISTRATION</span><h2>Character directory</h2></div><strong>{filteredCharacters.length}</strong></header><div className="owner-filter"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search character, member, handle, or role…" /></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Character</th><th>Role</th><th>Lifecycle</th><th>Teacher</th><th>Portal</th></tr></thead><tbody>{filteredCharacters.map((item) => { const teacher = item.character_kind === 'faculty' && (item.school_role === 'faculty' || item.school_role === 'new_faculty' || item.school_role === null); return <tr key={item.character_id}><td><strong>{characterName(item)}</strong><small>{item.discord_username || 'Connected member'} · Slot {item.slot_no}{item.handle ? ` · @${item.handle}` : ''}</small></td><td>{characterRole(item)}</td><td><select disabled={!canCharacters || working === `character:${item.character_id}`} value={item.character_state} onChange={(event) => void setCharacterState(item.character_id, event.target.value)}><option value="active">active</option><option value="inactive">inactive</option><option value="archived">archived</option><option value="suspended">suspended</option>{!['active','inactive','archived','suspended'].includes(item.character_state) && <option value={item.character_state}>{item.character_state}</option>}</select></td><td><button type="button" disabled={!canSchool || item.character_state !== 'active' || working === `teacher:${item.character_id}`} className={teacher ? 'owner-toggle enabled' : 'owner-toggle'} onClick={() => void setTeacherStatus(item, !teacher)}>{teacher ? 'Teacher ✓' : 'Make Teacher'}</button></td><td><button type="button" disabled={!canViewPortal || working === `portal:${item.character_id}`} onClick={() => void openPortal(item.character_id)}>{working === `portal:${item.character_id}` ? 'Opening…' : 'View Portal'}</button></td></tr>})}</tbody></table></div></section></div>
  }

  function renderEconomy() {
    return <div className="owner-operations-stack"><div className="owner-ops-two">
      {canEconomy && <section className="owner-ops-panel"><header><div><span className="eyebrow">PETALS</span><h2>Ledger adjustment</h2></div></header><form className="owner-ops-form" onSubmit={(event) => { event.preventDefault(); void adjustPetals() }}><select required value={economyDraft.accountId} onChange={(event) => setEconomyDraft({ ...economyDraft, accountId: event.target.value })}>{economy.map((item) => <option key={item.account_id} value={item.account_id}>{item.discord_username || item.account_id} · ❀ {item.balance}</option>)}</select><input required type="number" min="-10000" max="10000" value={economyDraft.amount} onChange={(event) => setEconomyDraft({ ...economyDraft, amount: event.target.value })}/><input placeholder="Audit note" value={economyDraft.note} onChange={(event) => setEconomyDraft({ ...economyDraft, note: event.target.value })}/><button className="primary-action" disabled={working === 'economy:petals'}>Post adjustment</button></form></section>}
      {canPlus && <section className="owner-ops-panel"><header><div><span className="eyebrow">HANAMI+</span><h2>Grant cosmetic access time</h2></div></header><form className="owner-ops-form" onSubmit={(event) => { event.preventDefault(); void grantPlus() }}><select required value={plusDraft.accountId} onChange={(event) => setPlusDraft({ ...plusDraft, accountId: event.target.value })}>{economy.map((item) => <option key={item.account_id} value={item.account_id}>{item.discord_username || item.account_id}</option>)}</select><input required type="number" min="1" max="3650" value={plusDraft.days} onChange={(event) => setPlusDraft({ ...plusDraft, days: event.target.value })}/><input placeholder="Audit note" value={plusDraft.note} onChange={(event) => setPlusDraft({ ...plusDraft, note: event.target.value })}/><button className="primary-action" disabled={working === 'economy:plus'}>Grant Hanami+</button></form></section>}
    </div><section className="owner-ops-panel"><header><div><span className="eyebrow">ACCOUNT ECONOMY</span><h2>Wallets & entitlements</h2></div><strong>{economy.length}</strong></header><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Account</th><th>Balance</th><th>Lifetime earned</th><th>Lifetime spent</th><th>Hanami+</th></tr></thead><tbody>{economy.map((item) => <tr key={item.account_id}><td><strong>{item.discord_username || 'Connected member'}</strong></td><td>❀ {item.balance}</td><td>{item.lifetime_earned}</td><td>{item.lifetime_spent}</td><td>{item.hanami_plus_ends_at ? new Date(item.hanami_plus_ends_at).toLocaleString() : 'Inactive'}</td></tr>)}</tbody></table></div></section></div>
  }

  function renderBoutique() {
    return <div className="owner-operations-stack"><section className="owner-ops-panel"><header><div><span className="eyebrow">CATALOG EDITOR</span><h2>Create Boutique item</h2></div><span>boutique.manage</span></header><form className="owner-ops-form" onSubmit={(event) => { event.preventDefault(); void createBoutiqueItem() }}><input required placeholder="Item name" value={boutiqueDraft.name} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, name: event.target.value, slug: boutiqueDraft.slug || slugify(event.target.value) })}/><input required placeholder="Slug" value={boutiqueDraft.slug} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, slug: slugify(event.target.value) })}/><textarea required placeholder="Description" value={boutiqueDraft.description} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, description: event.target.value })}/><div className="academic-inline-fields"><select value={boutiqueDraft.itemType} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, itemType: event.target.value })}><option value="avatar_decoration">Avatar Decoration</option><option value="frame">Frame</option><option value="effect">Effect</option><option value="nameplate">Nameplate</option><option value="profile_card">Profile Card</option><option value="background_pack">Background Pack</option><option value="sticker">Sticker</option><option value="hanami_plus_pass">Hanami+ Pass</option></select><select value={boutiqueDraft.season} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, season: event.target.value })}><option value="permanent">Permanent</option><option value="spring">Spring</option><option value="summer">Summer</option><option value="fall">Fall</option><option value="winter">Winter</option></select><select value={boutiqueDraft.rarity} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, rarity: event.target.value })}><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary">Legendary</option></select><select value={boutiqueDraft.state} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, state: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option></select></div><input placeholder="Collection name" value={boutiqueDraft.collection} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, collection: event.target.value })}/><input required type="number" min="1" value={boutiqueDraft.price} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, price: event.target.value })}/>{boutiqueDraft.itemType === 'hanami_plus_pass' && <input required type="number" min="1" max="365" value={boutiqueDraft.passDays} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, passDays: event.target.value })}/>}<input placeholder="Artwork preview token (optional)" value={boutiqueDraft.previewToken} onChange={(event) => setBoutiqueDraft({ ...boutiqueDraft, previewToken: event.target.value })}/><button className="primary-action" disabled={working === 'boutique:create'}>{working === 'boutique:create' ? 'Creating…' : 'Create item'}</button></form></section><section className="owner-ops-panel"><header><div><span className="eyebrow">BOUTIQUE CATALOG</span><h2>Items</h2></div><strong>{filteredBoutique.length}</strong></header><div className="owner-filter"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, collection, type, or state…" /></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Item</th><th>Type</th><th>Price</th><th>State</th><th>Flags</th></tr></thead><tbody>{filteredBoutique.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.collection_name || item.slug}</small></td><td>{item.item_type.replaceAll('_', ' ')}</td><td><div className="owner-role-buttons"><input type="number" min="1" value={boutiquePrices[item.id] ?? String(item.price_petals)} onChange={(event) => setBoutiquePrices({ ...boutiquePrices, [item.id]: event.target.value })}/><button type="button" disabled={working === `boutique:${item.id}`} onClick={() => void saveBoutiquePrice(item)}>Save</button></div></td><td><select disabled={working === `boutique:${item.id}`} value={item.state} onChange={(event) => void updateBoutiqueItem(item, { state: event.target.value }, `${item.name} state updated.`)}><option value="draft">draft</option><option value="published">published</option><option value="retired">retired</option></select></td><td><div className="owner-role-buttons"><button type="button" className={item.featured ? 'enabled' : ''} disabled={working === `boutique:${item.id}`} onClick={() => void updateBoutiqueItem(item, { featured: !item.featured }, `${item.name} feature status updated.`)}>Featured</button><button type="button" className={item.is_new ? 'enabled' : ''} disabled={working === `boutique:${item.id}`} onClick={() => void updateBoutiqueItem(item, { is_new: !item.is_new }, `${item.name} new-item flag updated.`)}>New</button></div></td></tr>)}</tbody></table></div></section></div>
  }

  function renderSystem() {
    return <section className="owner-ops-panel"><header><div><span className="eyebrow">SYSTEM CONFIGURATION</span><h2>Hanami network settings</h2></div><span>system.configure</span></header><div className="owner-config-list">{configuration.map((item) => <article key={item.key}><header><div><strong>{item.key.replaceAll('_', ' ')}</strong><span>{item.description}</span></div><small>{new Date(item.updated_at).toLocaleString()}</small></header><textarea spellCheck={false} value={configurationDrafts[item.key] ?? formatJson(item.value)} onChange={(event) => setConfigurationDrafts({ ...configurationDrafts, [item.key]: event.target.value })}/><button className="primary-action" disabled={working === `config:${item.key}`} onClick={() => void saveConfiguration(item)}>Save configuration</button></article>)}</div></section>
  }

  return <section className="owner-operations administrator-operations"><header className="owner-operations-heading"><div><span className="eyebrow">PLATFORM ADMINISTRATION</span><h2>Administrator Operations</h2><p>Capability-scoped account-level controls. Owner-only authority is not included here.</p></div><button type="button" onClick={() => void load()} disabled={loading || Boolean(working)}>Refresh data</button></header><nav className="owner-operations-tabs" aria-label="Administrator operations">{tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); setQuery('') }}>{item.label}</button>)}</nav>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="owner-empty">Loading Administrator operations…</div> : tab === 'overview' ? renderOverview() : tab === 'accounts' ? renderAccounts() : tab === 'characters' ? renderCharacters() : tab === 'economy' ? renderEconomy() : tab === 'boutique' ? renderBoutique() : renderSystem()}</section>
}
