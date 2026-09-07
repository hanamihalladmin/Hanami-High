import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { OwnerAccountRow, OwnerAuditRow, OwnerCharacterRow, OwnerPortalSnapshot } from '../types/database-owner'
import type { ModerationReportRow, OwnerEconomyRow, SiteConfigurationRow } from '../types/database-platform'

type Tab = 'overview' | 'accounts' | 'characters' | 'economy' | 'moderation' | 'system' | 'audit'
type PlatformRole = { id: string; code: string; label: string; description: string }

type ReportEdit = { status: string; note: string }

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'characters', label: 'Characters' },
  { id: 'economy', label: 'Economy' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'system', label: 'System' },
  { id: 'audit', label: 'Audit' },
]

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

function friendlyAction(action: string) {
  return action.replace(/^owner\./, '').replaceAll('_', ' ').replaceAll('.', ' · ')
}

function formatJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
}

export function OwnerOperationsPanel() {
  const { account, capabilities } = useIdentity()
  const [tab, setTab] = useState<Tab>('overview')
  const [accounts, setAccounts] = useState<OwnerAccountRow[]>([])
  const [characters, setCharacters] = useState<OwnerCharacterRow[]>([])
  const [economy, setEconomy] = useState<OwnerEconomyRow[]>([])
  const [audit, setAudit] = useState<OwnerAuditRow[]>([])
  const [configuration, setConfiguration] = useState<SiteConfigurationRow[]>([])
  const [reports, setReports] = useState<ModerationReportRow[]>([])
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [portal, setPortal] = useState<OwnerPortalSnapshot | null>(null)
  const [portalCharacterId, setPortalCharacterId] = useState<string | null>(null)
  const [economyDraft, setEconomyDraft] = useState({ accountId: '', amount: '25', note: '' })
  const [plusDraft, setPlusDraft] = useState({ accountId: '', days: '7', note: '' })
  const [configurationDrafts, setConfigurationDrafts] = useState<Record<string, string>>({})
  const [reportEdits, setReportEdits] = useState<Record<string, ReportEdit>>({})
  const [query, setQuery] = useState('')

  const canAccounts = capabilities.includes('accounts.manage')
  const canCharacters = capabilities.includes('characters.review')
  const canPermissions = capabilities.includes('permissions.manage')
  const canViewPortal = capabilities.includes('portals.view_as')
  const canEconomy = capabilities.includes('economy.manage')
  const canPlus = capabilities.includes('hanamiplus.manage')
  const canModerate = capabilities.includes('moderation.review_reports')
  const canSystem = capabilities.includes('system.configure')
  const canAudit = capabilities.includes('audit.view')
  const canSchool = capabilities.includes('school.configure')

  const load = useCallback(async () => {
    const client = supabase
    if (!client) return
    setLoading(true)
    setError(null)

    const accountPromise = canAccounts ? client.rpc('owner_console_accounts') : Promise.resolve({ data: [] as OwnerAccountRow[], error: null })
    const characterPromise = (canCharacters || canViewPortal) ? client.rpc('owner_console_characters') : Promise.resolve({ data: [] as OwnerCharacterRow[], error: null })
    const economyPromise = canEconomy ? client.rpc('owner_console_economy') : Promise.resolve({ data: [] as OwnerEconomyRow[], error: null })
    const auditPromise = canAudit ? client.rpc('owner_console_audit', { p_limit: 150 }) : Promise.resolve({ data: [] as OwnerAuditRow[], error: null })
    const configurationPromise = client.from('site_configuration').select('*').order('key')
    const reportsPromise = canModerate ? client.from('moderation_reports').select('*').order('created_at', { ascending: false }).limit(250) : Promise.resolve({ data: [] as ModerationReportRow[], error: null })
    const rolesPromise = client.from('platform_roles').select('id,code,label,description').order('code')

    const [accountResult, characterResult, economyResult, auditResult, configurationResult, reportResult, roleResult] = await Promise.all([
      accountPromise,
      characterPromise,
      economyPromise,
      auditPromise,
      configurationPromise,
      reportsPromise,
      rolesPromise,
    ])

    const firstError = [accountResult.error, characterResult.error, economyResult.error, auditResult.error, configurationResult.error, reportResult.error, roleResult.error].find(Boolean)
    if (firstError) {
      setLoading(false)
      setError(firstError.message)
      return
    }

    const nextAccounts = accountResult.data ?? []
    const nextCharacters = characterResult.data ?? []
    const nextEconomy = economyResult.data ?? []
    const nextConfiguration = configurationResult.data ?? []
    const nextReports = reportResult.data ?? []

    setAccounts(nextAccounts)
    setCharacters(nextCharacters)
    setEconomy(nextEconomy)
    setAudit(auditResult.data ?? [])
    setConfiguration(nextConfiguration)
    setReports(nextReports)
    setRoles((roleResult.data ?? []).map((role) => ({ ...role, code: String(role.code), description: role.description || '' })))
    setConfigurationDrafts(Object.fromEntries(nextConfiguration.map((item) => [item.key, formatJson(item.value)])))
    setReportEdits(Object.fromEntries(nextReports.map((item) => [item.id, { status: item.status, note: item.resolution_note || '' }])))
    setEconomyDraft((current) => ({ ...current, accountId: current.accountId || nextAccounts[0]?.account_id || nextEconomy[0]?.account_id || '' }))
    setPlusDraft((current) => ({ ...current, accountId: current.accountId || nextAccounts[0]?.account_id || nextEconomy[0]?.account_id || '' }))
    setLoading(false)
  }, [canAccounts, canAudit, canCharacters, canEconomy, canModerate, canViewPortal])

  useEffect(() => { void load() }, [load])

  const characterById = useMemo(() => new Map(characters.map((item) => [item.character_id, item])), [characters])
  const accountById = useMemo(() => new Map(accounts.map((item) => [item.account_id, item])), [accounts])
  const normalizedQuery = query.trim().toLowerCase()
  const filteredAccounts = useMemo(() => accounts.filter((item) => !normalizedQuery || `${item.discord_username || ''} ${item.account_state} ${item.platform_roles.join(' ')}`.toLowerCase().includes(normalizedQuery)), [accounts, normalizedQuery])
  const filteredCharacters = useMemo(() => characters.filter((item) => !normalizedQuery || `${characterName(item)} ${item.discord_username || ''} ${item.handle || ''} ${characterRole(item)} ${item.character_state}`.toLowerCase().includes(normalizedQuery)), [characters, normalizedQuery])

  async function run(label: string, action: () => Promise<{ error: { message: string } | null }>, success: string) {
    setWorking(label)
    setError(null)
    setNotice(null)
    const result = await action()
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice(success)
    await load()
  }

  async function setAccountState(accountId: string, state: string) {
    const client = supabase
    if (!client) return
    await run(`account:${accountId}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_account_state', { p_account_id: accountId, p_state: state })
      return { error: actionError }
    }, 'Account state updated.')
  }

  async function toggleRole(accountRow: OwnerAccountRow, roleCode: string) {
    const client = supabase
    if (!client) return
    const enabled = !accountRow.platform_roles.includes(roleCode)
    await run(`role:${accountRow.account_id}:${roleCode}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_platform_role', { p_account_id: accountRow.account_id, p_role_code: roleCode, p_enabled: enabled })
      return { error: actionError }
    }, `${roleCode.replaceAll('_', ' ')} ${enabled ? 'enabled' : 'disabled'}.`)
  }

  async function setCharacterState(characterId: string, state: string) {
    const client = supabase
    if (!client) return
    await run(`character:${characterId}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_character_state', { p_character_id: characterId, p_state: state })
      return { error: actionError }
    }, 'Character lifecycle state updated.')
  }

  async function setTeacherStatus(character: OwnerCharacterRow, enabled: boolean) {
    const client = supabase
    if (!client) return
    await run(`teacher:${character.character_id}`, async () => {
      const { error: actionError } = await client.rpc('owner_set_teacher_status', { p_character_id: character.character_id, p_enabled: enabled })
      return { error: actionError }
    }, enabled ? 'Teacher access assigned.' : 'Teacher access removed.')
  }

  async function openPortal(characterId: string) {
    const client = supabase
    if (!client) return
    setWorking(`portal:${characterId}`)
    setError(null)
    setPortal(null)
    const { data, error: portalError } = await client.rpc('owner_portal_snapshot', { p_character_id: characterId })
    setWorking(null)
    if (portalError) return setError(portalError.message)
    setPortal(data)
    setPortalCharacterId(characterId)
  }

  async function adjustPetals() {
    const client = supabase
    if (!client || !economyDraft.accountId) return
    await run('economy:petals', async () => {
      const { error: actionError } = await client.rpc('owner_adjust_petals', {
        p_account_id: economyDraft.accountId,
        p_amount: Number(economyDraft.amount),
        p_note: economyDraft.note,
        p_request_id: crypto.randomUUID(),
      })
      return { error: actionError }
    }, 'Petal adjustment posted to the audited ledger.')
    setEconomyDraft((current) => ({ ...current, note: '' }))
  }

  async function grantPlus() {
    const client = supabase
    if (!client || !plusDraft.accountId) return
    await run('economy:plus', async () => {
      const { error: actionError } = await client.rpc('owner_grant_hanami_plus', {
        p_account_id: plusDraft.accountId,
        p_days: Number(plusDraft.days),
        p_note: plusDraft.note,
      })
      return { error: actionError }
    }, 'Hanami+ time granted and audit logged.')
    setPlusDraft((current) => ({ ...current, note: '' }))
  }

  async function saveReport(report: ModerationReportRow) {
    const client = supabase
    if (!client || !account) return
    const edit = reportEdits[report.id] || { status: report.status, note: report.resolution_note || '' }
    await run(`report:${report.id}`, async () => {
      const { error: actionError } = await client.from('moderation_reports').update({
        status: edit.status,
        resolution_note: edit.note.trim() || null,
        reviewed_by_account_id: account.id,
      }).eq('id', report.id)
      return { error: actionError }
    }, 'Moderation report updated.')
  }

  async function saveConfiguration(item: SiteConfigurationRow) {
    const client = supabase
    if (!client || !account) return
    let value: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(configurationDrafts[item.key] || '{}')
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Configuration must be a JSON object.')
      value = parsed as Record<string, unknown>
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Configuration JSON is invalid.')
      return
    }
    await run(`config:${item.key}`, async () => {
      const { error: actionError } = await client.from('site_configuration').update({ value, updated_by_account_id: account.id, updated_at: new Date().toISOString() }).eq('key', item.key)
      return { error: actionError }
    }, `${item.key.replaceAll('_', ' ')} configuration saved.`)
  }

  function renderOverview() {
    const openReports = reports.filter((item) => item.status === 'open' || item.status === 'reviewing').length
    const teachers = characters.filter((item) => item.character_kind === 'faculty' && (item.school_role === 'faculty' || item.school_role === 'new_faculty')).length
    const activeCharacters = characters.filter((item) => item.character_state === 'active').length
    const totalPetals = economy.reduce((sum, item) => sum + item.balance, 0)
    return <div className="owner-operations-stack">
      <div className="owner-ops-stats"><article><span>ACCOUNTS</span><strong>{accounts.length}</strong><small>registered Hanami accounts</small></article><article><span>ACTIVE CHARACTERS</span><strong>{activeCharacters}</strong><small>{teachers} current teachers</small></article><article><span>OPEN REPORTS</span><strong>{openReports}</strong><small>moderation queue</small></article><article><span>PETALS IN WALLETS</span><strong>{totalPetals}</strong><small>current account balances</small></article></div>
      <section className="owner-ops-panel"><header><div><span className="eyebrow">PORTAL MODEL</span><h2>Teacher now, Staff later</h2></div></header><div className="owner-config-cards">{configuration.filter((item) => item.key.endsWith('_portal')).map((item) => <article key={item.key}><strong>{String(item.value.label || item.key)}</strong><span className={item.value.enabled ? 'owner-state active' : 'owner-state inactive'}>{item.value.enabled ? 'enabled' : 'disabled'}</span><p>{item.description}</p></article>)}</div></section>
      <section className="owner-ops-panel"><header><div><span className="eyebrow">ACCESS MODEL</span><h2>Effective platform permissions</h2></div><strong>{capabilities.length}</strong></header><div className="owner-capability-grid">{capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div></section>
    </div>
  }

  function renderAccounts() {
    return <section className="owner-ops-panel"><header><div><span className="eyebrow">ACCOUNT OPERATIONS</span><h2>Hanami accounts</h2></div><strong>{filteredAccounts.length}</strong></header><div className="owner-filter"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Discord username, state, or role…" /></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Account</th><th>Characters</th><th>State</th><th>Platform roles</th></tr></thead><tbody>{filteredAccounts.map((item) => <tr key={item.account_id}><td><strong>{item.discord_username || 'Connected member'}</strong><small>{item.account_id}</small></td><td>{item.character_count}</td><td><select disabled={!canAccounts || working === `account:${item.account_id}`} value={item.account_state} onChange={(event) => void setAccountState(item.account_id, event.target.value)}><option value="active">active</option><option value="restricted">restricted</option><option value="suspended">suspended</option><option value="archived">archived</option></select></td><td><div className="owner-role-buttons">{roles.map((role) => { const enabled = item.platform_roles.includes(role.code); return <button key={role.code} className={enabled ? 'enabled' : ''} disabled={!canPermissions || working === `role:${item.account_id}:${role.code}`} title={role.description} onClick={() => void toggleRole(item, role.code)}>{role.label}</button> })}</div></td></tr>)}</tbody></table></div></section>
  }

  function renderPortal() {
    if (!portal || !portalCharacterId) return null
    return <section className="owner-portal-preview"><header><div><strong>OWNER VIEW MODE</strong><span>Read-only portal snapshot · actions remain Owner actions</span></div><button onClick={() => { setPortal(null); setPortalCharacterId(null) }}>Exit View Mode</button></header><div className="owner-portal-summary"><article><span>CHARACTER</span><strong>{portal.character.name}</strong><small>{portal.character.role === 'faculty' ? 'Teacher' : portal.character.role || portal.character.kind} · {portal.character.state}</small></article><article><span>ACCOUNT</span><strong>{portal.account.discord_username || 'Connected member'}</strong><small>{portal.account.state}</small></article><article><span>ACADEMICS</span><strong>{portal.academics.sections.length} sections</strong><small>{portal.academics.graded_assignments} grades · {portal.academics.attendance_records} attendance records</small></article><article><span>SOCIAL</span><strong>{portal.social.friends} friends</strong><small>{portal.social.posts} published posts</small></article><article><span>CAMPUS</span><strong>{portal.campus.groups.length} groups</strong><small>{portal.campus.groups.map((group) => group.name).join(', ') || 'No active groups'}</small></article><article><span>WALLET</span><strong>❀ {portal.economy.petals}</strong><small>account-wide Petals</small></article></div></section>
  }

  function renderCharacters() {
    return <div className="owner-operations-stack">{renderPortal()}<section className="owner-ops-panel"><header><div><span className="eyebrow">CHARACTER OPERATIONS</span><h2>Character directory</h2></div><strong>{filteredCharacters.length}</strong></header><div className="owner-filter"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search character, Discord member, handle, or role…" /></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Character</th><th>Role</th><th>Lifecycle</th><th>Teacher</th><th>Portal</th></tr></thead><tbody>{filteredCharacters.map((item) => { const teacher = item.character_kind === 'faculty' && (item.school_role === 'faculty' || item.school_role === 'new_faculty'); return <tr key={item.character_id}><td><strong>{characterName(item)}</strong><small>{item.discord_username || 'Connected member'} · Slot {item.slot_no}{item.handle ? ` · @${item.handle}` : ''}</small></td><td>{characterRole(item)}</td><td><select disabled={!canCharacters || working === `character:${item.character_id}`} value={item.character_state} onChange={(event) => void setCharacterState(item.character_id, event.target.value)}><option value="active">active</option><option value="inactive">inactive</option><option value="archived">archived</option><option value="suspended">suspended</option>{!['active','inactive','archived','suspended'].includes(item.character_state) && <option value={item.character_state}>{item.character_state}</option>}</select></td><td><button disabled={!canSchool || item.character_state !== 'active' || working === `teacher:${item.character_id}`} className={teacher ? 'owner-toggle enabled' : 'owner-toggle'} onClick={() => void setTeacherStatus(item, !teacher)}>{teacher ? 'Teacher ✓' : 'Make Teacher'}</button></td><td><button disabled={!canViewPortal || working === `portal:${item.character_id}`} onClick={() => void openPortal(item.character_id)}>{working === `portal:${item.character_id}` ? 'Opening…' : 'View Portal'}</button></td></tr> })}</tbody></table></div></section></div>
  }

  function renderEconomy() {
    return <div className="owner-operations-stack"><div className="owner-ops-two"><section className="owner-ops-panel"><header><div><span className="eyebrow">PETALS</span><h2>Ledger adjustment</h2></div></header><form className="owner-ops-form" onSubmit={(event) => { event.preventDefault(); void adjustPetals() }}><select required value={economyDraft.accountId} onChange={(event) => setEconomyDraft({ ...economyDraft, accountId: event.target.value })}>{economy.map((item) => <option key={item.account_id} value={item.account_id}>{item.discord_username || item.account_id} · ❀ {item.balance}</option>)}</select><input required type="number" min="-10000" max="10000" value={economyDraft.amount} onChange={(event) => setEconomyDraft({ ...economyDraft, amount: event.target.value })}/><input placeholder="Audit note" value={economyDraft.note} onChange={(event) => setEconomyDraft({ ...economyDraft, note: event.target.value })}/><button className="primary-action" disabled={!canEconomy || working === 'economy:petals'}>Post adjustment</button></form></section><section className="owner-ops-panel"><header><div><span className="eyebrow">HANAMI+</span><h2>Grant premium time</h2></div></header><form className="owner-ops-form" onSubmit={(event) => { event.preventDefault(); void grantPlus() }}><select required value={plusDraft.accountId} onChange={(event) => setPlusDraft({ ...plusDraft, accountId: event.target.value })}>{economy.map((item) => <option key={item.account_id} value={item.account_id}>{item.discord_username || item.account_id}</option>)}</select><input required type="number" min="1" max="3650" value={plusDraft.days} onChange={(event) => setPlusDraft({ ...plusDraft, days: event.target.value })}/><input placeholder="Audit note" value={plusDraft.note} onChange={(event) => setPlusDraft({ ...plusDraft, note: event.target.value })}/><button className="primary-action" disabled={!canPlus || working === 'economy:plus'}>Grant Hanami+</button></form></section></div><section className="owner-ops-panel"><header><div><span className="eyebrow">ACCOUNT ECONOMY</span><h2>Wallets & entitlements</h2></div><strong>{economy.length}</strong></header><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Account</th><th>Balance</th><th>Lifetime earned</th><th>Lifetime spent</th><th>Hanami+</th></tr></thead><tbody>{economy.map((item) => <tr key={item.account_id}><td><strong>{item.discord_username || 'Connected member'}</strong><small>{item.account_id}</small></td><td>❀ {item.balance}</td><td>{item.lifetime_earned}</td><td>{item.lifetime_spent}</td><td>{item.hanami_plus_ends_at ? new Date(item.hanami_plus_ends_at).toLocaleString() : 'Inactive'}</td></tr>)}</tbody></table></div></section></div>
  }

  function renderModeration() {
    return <section className="owner-ops-panel"><header><div><span className="eyebrow">MODERATION QUEUE</span><h2>Community reports</h2></div><strong>{reports.length}</strong></header>{reports.length === 0 ? <div className="owner-empty">No moderation reports have been filed.</div> : <div className="owner-report-list">{reports.map((report) => { const edit = reportEdits[report.id] || { status: report.status, note: report.resolution_note || '' }; const reporter = characterById.get(report.reporter_character_id); const target = report.target_character_id ? characterById.get(report.target_character_id) : null; return <article key={report.id}><header><div><span className="eyebrow">{report.target_type} · {new Date(report.created_at).toLocaleString()}</span><h3>{report.reason}</h3></div><span className={`owner-state ${report.status}`}>{report.status}</span></header><p>{report.details || 'No additional details were provided.'}</p><dl><div><dt>Reporter</dt><dd>{reporter ? characterName(reporter) : report.reporter_character_id}</dd></div><div><dt>Target</dt><dd>{target ? characterName(target) : report.target_id || 'General concern'}</dd></div></dl><div className="owner-report-editor"><select value={edit.status} disabled={!canModerate || working === `report:${report.id}`} onChange={(event) => setReportEdits({ ...reportEdits, [report.id]: { ...edit, status: event.target.value } })}><option value="open">open</option><option value="reviewing">reviewing</option><option value="resolved">resolved</option><option value="dismissed">dismissed</option></select><input placeholder="Resolution note" value={edit.note} onChange={(event) => setReportEdits({ ...reportEdits, [report.id]: { ...edit, note: event.target.value } })}/><button className="primary-action" disabled={!canModerate || working === `report:${report.id}`} onClick={() => void saveReport(report)}>Save review</button></div></article> })}</div>}</section>
  }

  function renderSystem() {
    return <div className="owner-operations-stack"><section className="owner-ops-panel"><header><div><span className="eyebrow">SYSTEM CONFIGURATION</span><h2>Hanami network settings</h2></div><span>{canSystem ? 'system.configure' : 'read only'}</span></header><div className="owner-config-list">{configuration.map((item) => <article key={item.key}><header><div><strong>{item.key.replaceAll('_', ' ')}</strong><span>{item.description}</span></div><small>{new Date(item.updated_at).toLocaleString()}</small></header><textarea spellCheck={false} value={configurationDrafts[item.key] ?? formatJson(item.value)} onChange={(event) => setConfigurationDrafts({ ...configurationDrafts, [item.key]: event.target.value })}/><button className="primary-action" disabled={!canSystem || working === `config:${item.key}`} onClick={() => void saveConfiguration(item)}>Save configuration</button></article>)}</div></section><div className="owner-future-staff-note"><strong>Future Staff portal reservation</strong><p>The Staff portal remains deliberately disabled. Administration/non-teaching staff are not treated as Teachers anywhere in the current v2 permissions model.</p></div></div>
  }

  function renderAudit() {
    return <section className="owner-ops-panel"><header><div><span className="eyebrow">PROTECTED AUDIT HISTORY</span><h2>Recent Owner/platform actions</h2></div><strong>{audit.length}</strong></header>{audit.length === 0 ? <div className="owner-empty">No audit events are visible.</div> : <div className="owner-audit-list">{audit.map((item) => <article key={item.id}><div><strong>{friendlyAction(item.action)}</strong><span>{item.target_type} · {item.target_id}</span></div><div><code>{JSON.stringify(item.metadata)}</code><small>{new Date(item.created_at).toLocaleString()}</small></div></article>)}</div>}</section>
  }

  return <section className="owner-operations"><header className="owner-operations-heading"><div><span className="eyebrow">PLATFORM OPERATIONS</span><h2>Owner Console</h2><p>Account-level controls. No OC or impersonated user session is required.</p></div><button onClick={() => void load()} disabled={loading || Boolean(working)}>Refresh data</button></header><nav className="owner-operations-tabs" aria-label="Owner operations">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); setQuery('') }}>{item.label}</button>)}</nav>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="owner-empty">Loading Owner operations…</div> : tab === 'overview' ? renderOverview() : tab === 'accounts' ? renderAccounts() : tab === 'characters' ? renderCharacters() : tab === 'economy' ? renderEconomy() : tab === 'moderation' ? renderModeration() : tab === 'system' ? renderSystem() : renderAudit()}</section>
}
