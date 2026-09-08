import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import { notifyInterfacePreferencesChanged } from '../hooks/useInterfacePreferences'
import type { AccountPreferences, CharacterPreferences } from '../types/database-settings'
import type { HanamiPlusEntitlement, PetalWallet } from '../types/database-rewards'
import type { ModerationReportRow } from '../types/database-platform'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'account' | 'character' | 'privacy-safety' | 'notifications' | 'accessibility' | 'connections'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }
type HandleAwareCharacter = NonNullable<ReturnType<typeof useIdentity>['activeCharacter']> & { handle_changed_at?: string | null }

const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/
const HANDLE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

const meta: Record<Mode, { title: string; description: string; scope: string }> = {
  account: { title: 'Account', description: 'Your Discord-linked Hanami identity, shared benefits, wallet, and session controls.', scope: 'ACCOUNT SCOPE' },
  character: { title: 'Character', description: 'Identity and social defaults for the character currently active on this account.', scope: 'CHARACTER SCOPE' },
  'privacy-safety': { title: 'Privacy & Safety', description: 'Decide who can reach you, what your character shares, and how safety concerns are reported.', scope: 'ACCOUNT + CHARACTER' },
  notifications: { title: 'Notifications', description: 'Choose which kinds of Hanami activity should enter your notification inbox.', scope: 'ACCOUNT SCOPE' },
  accessibility: { title: 'Accessibility', description: 'Adjust motion, density, contrast, and interface text size.', scope: 'ACCOUNT SCOPE' },
  connections: { title: 'Connections', description: 'Review the real services and identities connected to Hanami.', scope: 'ACCOUNT SCOPE' },
}

function characterLabel(role: string | null, kind: string) {
  if (kind === 'faculty' && role === 'new_faculty') return 'New Teacher'
  if (kind === 'faculty' && (role === 'faculty' || role === null)) return 'Teacher'
  if (role === 'administration') return 'Staff'
  if (!role) return 'Applicant'
  return role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function characterName(character: { display_name: string | null; first_name: string | null; last_name: string | null; slot_no: number }) {
  return character.display_name || [character.first_name, character.last_name].filter(Boolean).join(' ') || `Character Slot ${character.slot_no}`
}

function formatTokyoDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value))
}

export function SettingsPage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter, characters, clearActiveCharacter, refreshIdentity, signOut } = useIdentity()
  const [accountPrefs, setAccountPrefs] = useState<AccountPreferences | null>(null)
  const [characterPrefs, setCharacterPrefs] = useState<CharacterPreferences | null>(null)
  const [wallet, setWallet] = useState<PetalWallet | null>(null)
  const [plus, setPlus] = useState<HanamiPlusEntitlement | null>(null)
  const [reports, setReports] = useState<ModerationReportRow[]>([])
  const [reportDraft, setReportDraft] = useState({ reason: '', details: '' })
  const [handleDraft, setHandleDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setLoading(true); setError(null)
    const [accountResult, characterResult, reportResult, walletResult, plusResult] = await Promise.all([
      client.from('account_preferences').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('character_preferences').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
      client.from('moderation_reports').select('*').eq('reporter_character_id', activeCharacter.id).order('created_at', { ascending: false }).limit(30),
      client.from('petal_wallets').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('hanami_plus_entitlements').select('*').eq('account_id', account.id).maybeSingle(),
    ])
    setLoading(false)
    const loadError = accountResult.error || characterResult.error || reportResult.error || walletResult.error || plusResult.error
    if (loadError) return setError(loadError.message || 'Unable to load settings.')
    setAccountPrefs(accountResult.data); setCharacterPrefs(characterResult.data); setReports(reportResult.data ?? []); setWallet(walletResult.data); setPlus(plusResult.data)
    setHandleDraft(activeCharacter.handle || '')
  }, [account, activeCharacter])

  useEffect(() => { void load() }, [load])

  const plusActive = useMemo(() => Boolean(plus && new Date(plus.ends_at).getTime() > Date.now()), [plus])
  const handleChangedAt = (activeCharacter as HandleAwareCharacter | null)?.handle_changed_at ?? null
  const nextHandleChangeAt = handleChangedAt ? new Date(new Date(handleChangedAt).getTime() + HANDLE_COOLDOWN_MS) : null
  const handleLocked = Boolean(nextHandleChangeAt && nextHandleChangeAt.getTime() > Date.now())
  const normalizedHandle = handleDraft.trim().toLowerCase()
  const handleValid = HANDLE_PATTERN.test(normalizedHandle)
  const handleChanged = Boolean(activeCharacter && normalizedHandle !== (activeCharacter.handle || ''))

  async function saveAccount(patch: Partial<AccountPreferences>) {
    const client = supabase
    if (!client || !account) return
    setWorking(true); setError(null); setNotice(null)
    const { error: updateError } = await client.from('account_preferences').update(patch).eq('account_id', account.id)
    setWorking(false)
    if (updateError) return setError(updateError.message)
    setAccountPrefs((current) => current ? { ...current, ...patch } : current); notifyInterfacePreferencesChanged(); setNotice('Account preferences saved.')
  }

  async function saveCharacter(patch: Partial<CharacterPreferences>) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking(true); setError(null); setNotice(null)
    const { error: updateError } = await client.from('character_preferences').update(patch).eq('character_id', activeCharacter.id)
    setWorking(false)
    if (updateError) return setError(updateError.message)
    setCharacterPrefs((current) => current ? { ...current, ...patch } : current); setNotice('Character preferences saved.')
  }

  async function changeHandle() {
    const client = supabase
    if (!client || !activeCharacter || !handleValid || !handleChanged || handleLocked) return
    setWorking(true); setError(null); setNotice(null)
    const { error: handleError } = await client.rpc('change_character_handle', { p_character_id: activeCharacter.id, p_handle: normalizedHandle })
    setWorking(false)
    if (handleError) return setError(handleError.message)
    setNotice(`Your character handle is now @${normalizedHandle}.`); await refreshIdentity()
  }

  async function submitReport() {
    const client = supabase
    if (!client || !activeCharacter) return
    const reason = reportDraft.reason.trim()
    if (reason.length < 2) return setError('Please give the report a short reason.')
    setWorking(true); setError(null); setNotice(null)
    const { error: reportError } = await client.from('moderation_reports').insert({ reporter_character_id: activeCharacter.id, target_type: 'other', reason, details: reportDraft.details.trim() || null, status: 'open' })
    setWorking(false)
    if (reportError) return setError(reportError.message)
    setReportDraft({ reason: '', details: '' }); setNotice('Safety report submitted to the moderation queue.'); await load()
  }

  if (!account || !activeCharacter) return null
  const currentAccount = account
  const currentCharacter = activeCharacter
  const currentName = characterName(currentCharacter)

  function renderAccount() {
    return <div className="settings-stack">
      <section className="settings-account-board">
        <article className="settings-identity-card"><span className="settings-scope-tag">ACCOUNT</span><div className="settings-account-avatar">{(currentAccount.discord_username || 'H').slice(0, 2).toUpperCase()}</div><div><span className="eyebrow">DISCORD IDENTITY</span><h2>{currentAccount.discord_username || 'Connected Discord account'}</h2><p>This login owns both character slots and all account-wide Hanami benefits.</p></div></article>
        <article className="settings-mini-stat"><span>CHARACTER SLOTS</span><strong>{characters.length} / 2</strong><small>{characters.length >= 2 ? 'All slots in use' : `${2 - characters.length} available`}</small></article>
        <article className="settings-mini-stat"><span>PETALS</span><strong>{wallet?.balance ?? 0}</strong><small>{wallet ? `${wallet.lifetime_earned} lifetime earned` : 'Wallet ready'}</small></article>
        <article className={`settings-mini-stat ${plusActive ? 'plus-active' : ''}`}><span>HANAMI+</span><strong>{plusActive ? 'ACTIVE' : 'INACTIVE'}</strong><small>{plusActive && plus ? `Until ${formatTokyoDate(plus.ends_at)}` : 'Optional cosmetic access'}</small></article>
      </section>
      <section className="settings-panel"><header><div><span className="eyebrow">ACCOUNT VS. CHARACTER</span><h2>Your Hanami identity map</h2></div><span className="settings-scope-tag">1 ACCOUNT · MAX 2 CHARACTERS</span></header><div className="settings-scope-grid"><article><b>Account-wide</b><p>Discord login, Petals, Hanami+, Boutique inventory, interface preferences, account privacy, and moderation status.</p></article><article><b>Character-specific</b><p>Handle, school role, profile, friends, posts, messages, classes, attendance, grades, clubs, and character achievements.</p></article></div></section>
      <section className="settings-panel"><header><div><span className="eyebrow">CURRENT CAMPUS IDENTITY</span><h2>{currentName}</h2></div><strong>@{currentCharacter.handle || 'no_handle'}</strong></header><div className="settings-detail-list"><div><span>Character slot</span><strong>{currentCharacter.slot_no} of 2</strong></div><div><span>School role</span><strong>{characterLabel(currentCharacter.school_role, currentCharacter.character_kind)}</strong></div><div><span>Campus access</span><strong>{currentCharacter.character_state}</strong></div></div></section>
      <section className="settings-panel"><header><div><span className="eyebrow">SESSION</span><h2>Character & login</h2></div></header><div className="settings-actions"><div><strong>Switch character</strong><p>Return to your two-slot identity selector without signing out of Discord.</p><button className="secondary-action" onClick={() => void clearActiveCharacter()}>Switch character</button></div><div><strong>Sign out</strong><p>End the Hanami session on this browser. Your characters and account remain intact.</p><button className="secondary-action" onClick={() => void signOut()}>Sign out of Hanami</button></div></div></section>
    </div>
  }

  function renderCharacter() {
    return <div className="settings-stack">
      <section className="settings-panel"><header><div><span className="eyebrow">CURRENT CHARACTER</span><h2>{currentName}</h2></div><span className="settings-scope-tag">CHARACTER SLOT {currentCharacter.slot_no}</span></header><div className="settings-detail-list"><div><span>School role</span><strong>{characterLabel(currentCharacter.school_role, currentCharacter.character_kind)}</strong></div><div><span>Status</span><strong>{currentCharacter.character_state}</strong></div><div><span>Current handle</span><strong>@{currentCharacter.handle || 'not-set'}</strong></div></div></section>
      <section className="settings-panel handle-settings-panel"><header><div><span className="eyebrow">HANAMI HANDLE</span><h2>Your @handle</h2></div><strong>{handleLocked ? '7-DAY COOLDOWN' : 'EDITABLE'}</strong></header><div className="handle-settings-body"><div className="handle-preview"><span>@</span><strong>{normalizedHandle || 'your_handle'}</strong></div><label><span>Choose a unique handle</span><div className="handle-edit-row"><span className="handle-prefix">@</span><input value={handleDraft} disabled={working || handleLocked} maxLength={24} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => setHandleDraft(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}/><button className="primary-action" type="button" disabled={working || handleLocked || !handleValid || !handleChanged} onClick={() => void changeHandle()}>{working ? 'Saving…' : 'Change handle'}</button></div></label><div className={`handle-rule-note ${handleValid || !handleDraft ? '' : 'invalid'}`}>3–24 lowercase letters, numbers, and underscores. Handles are unique across Hanami.</div>{handleLocked && nextHandleChangeAt && <div className="settings-info-note">You can change this handle again after <strong>{formatTokyoDate(nextHandleChangeAt.toISOString())}</strong>. Staff with account-management authority can override the cooldown when necessary.</div>}{!handleLocked && handleChangedAt && <div className="settings-info-note">Changing your handle starts a new seven-day cooldown and automatically updates the handle shown on your published profile.</div>}</div></section>
      {characterPrefs && <section className="settings-panel"><header><div><span className="eyebrow">SOCIAL DEFAULTS</span><h2>Character preferences</h2></div><span className="settings-scope-tag">CHARACTER ONLY</span></header><div className="settings-form-list"><label><div><strong>Default post audience</strong><span>Used as the starting audience when you create new social content.</span></div><select disabled={working} value={characterPrefs.default_post_visibility} onChange={(event) => void saveCharacter({ default_post_visibility: event.target.value })}><option value="hanami">Hanami Network</option><option value="friends">Friends</option><option value="private">Private</option></select></label><label><div><strong>Show school role on profile</strong><span>Display Student/Teacher status in eligible profile surfaces.</span></div><input type="checkbox" checked={characterPrefs.show_school_role} disabled={working} onChange={(event) => void saveCharacter({ show_school_role: event.target.checked })}/></label></div></section>}
      <div className="settings-info-note">Profile design belongs in Profile Studio. School-record identity fields stay protected by Hanami enrollment and administration workflows.</div>
    </div>
  }

  function renderPrivacy() {
    if (!accountPrefs || !characterPrefs) return null
    return <div className="settings-stack">
      <section className="settings-panel"><header><div><span className="eyebrow">REACHABILITY</span><h2>Who can contact you</h2></div><span className="settings-scope-tag">ACCOUNT</span></header><div className="settings-form-list"><label><div><strong>Direct messages</strong><span>Who may start a direct conversation with your active characters.</span></div><select disabled={working} value={accountPrefs.dm_policy} onChange={(event) => void saveAccount({ dm_policy: event.target.value })}><option value="everyone">Everyone</option><option value="friends">Friends only</option><option value="none">Nobody</option></select></label><label><div><strong>Friend requests</strong><span>Who may send a new friend request.</span></div><select disabled={working} value={accountPrefs.friend_request_policy} onChange={(event) => void saveAccount({ friend_request_policy: event.target.value })}><option value="everyone">Everyone</option><option value="friends_of_friends">Friends of friends</option><option value="none">Nobody</option></select></label></div></section>
      <section className="settings-panel"><header><div><span className="eyebrow">PRESENCE</span><h2>Online visibility</h2></div><span className="settings-scope-tag">ACCOUNT</span></header><div className="settings-form-list"><label><div><strong>Show online status</strong><span>Allow Hanami’s presence surfaces to show when you are around campus.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.show_online_status} onChange={(event) => void saveAccount({ show_online_status: event.target.checked })}/></label></div></section>
      <section className="settings-panel"><header><div><span className="eyebrow">PROFILE INTERACTIONS</span><h2>{currentName}</h2></div><span className="settings-scope-tag">CHARACTER</span></header><div className="settings-form-list"><label><div><strong>Profile comments</strong><span>Allow comments where profile modules support them.</span></div><input type="checkbox" disabled={working} checked={characterPrefs.allow_profile_comments} onChange={(event) => void saveCharacter({ allow_profile_comments: event.target.checked })}/></label><label><div><strong>Guestbook</strong><span>Allow members to leave entries on this character’s guestbook.</span></div><input type="checkbox" disabled={working} checked={characterPrefs.allow_guestbook} onChange={(event) => void saveCharacter({ allow_guestbook: event.target.checked })}/></label><label><div><strong>Activity status</strong><span>Allow profile surfaces to display this character’s activity status.</span></div><input type="checkbox" disabled={working} checked={characterPrefs.show_activity_status} onChange={(event) => void saveCharacter({ show_activity_status: event.target.checked })}/></label></div></section>
      <section className="settings-panel safety-report-panel"><header><div><span className="eyebrow">SAFETY</span><h2>Report a concern</h2></div><strong>MODERATION QUEUE</strong></header><form className="safety-report-form" onSubmit={(event) => { event.preventDefault(); void submitReport() }}><input required minLength={2} maxLength={200} placeholder="Short reason for the report" value={reportDraft.reason} onChange={(event) => setReportDraft({ ...reportDraft, reason: event.target.value })}/><textarea placeholder="Describe what happened and include enough context for moderation to review it." value={reportDraft.details} onChange={(event) => setReportDraft({ ...reportDraft, details: event.target.value })}/><button className="primary-action" disabled={working}>Submit report</button></form>{reports.length > 0 && <div className="safety-report-history"><strong>Your recent reports</strong>{reports.map((report) => <article key={report.id}><div><b>{report.reason}</b><span>{new Date(report.created_at).toLocaleString()}</span></div><div><span className={`report-status ${report.status}`}>{report.status}</span>{report.resolution_note && <small>{report.resolution_note}</small>}</div></article>)}</div>}</section>
    </div>
  }

  function renderNotifications() {
    if (!accountPrefs) return null
    return <div className="settings-stack"><section className="settings-notification-summary"><span>✉</span><div><strong>Your notification inbox is category-based.</strong><p>These switches control whether future events from each V2 system are allowed into the Hanami notification feed.</p></div></section><section className="settings-panel"><header><div><span className="eyebrow">NOTIFICATION CATEGORIES</span><h2>Hanami alerts</h2></div><span className="settings-scope-tag">ACCOUNT</span></header><div className="settings-form-list notification-settings-list"><label><div><strong>Messages</strong><span>Direct messages, group conversations, and message requests.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.notify_messages} onChange={(event) => void saveAccount({ notify_messages: event.target.checked })}/></label><label><div><strong>Social</strong><span>Friends, posts, guestbooks, and profile interactions.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.notify_social} onChange={(event) => void saveAccount({ notify_social: event.target.checked })}/></label><label><div><strong>School</strong><span>Academics, orientation, announcements, events, and campus updates.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.notify_school} onChange={(event) => void saveAccount({ notify_school: event.target.checked })}/></label></div></section></div>
  }

  function renderAccessibility() {
    if (!accountPrefs) return null
    return <section className="settings-panel"><header><div><span className="eyebrow">INTERFACE</span><h2>Display & motion</h2></div><span>Applies immediately</span></header><div className="settings-form-list"><label><div><strong>Reduced motion</strong><span>Disable nonessential transitions and animation.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.reduced_motion} onChange={(event) => void saveAccount({ reduced_motion: event.target.checked })}/></label><label><div><strong>Compact mode</strong><span>Reduce spacing to fit more information on screen.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.compact_mode} onChange={(event) => void saveAccount({ compact_mode: event.target.checked })}/></label><label><div><strong>High contrast</strong><span>Strengthen borders and text contrast throughout the shell.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.high_contrast} onChange={(event) => void saveAccount({ high_contrast: event.target.checked })}/></label><label><div><strong>Interface text size</strong><span>{accountPrefs.font_scale}%</span></div><input aria-label="Interface text size" type="range" min="90" max="130" step="5" disabled={working} value={accountPrefs.font_scale} onChange={(event) => setAccountPrefs({ ...accountPrefs, font_scale: Number(event.target.value) })} onMouseUp={(event) => void saveAccount({ font_scale: Number((event.target as HTMLInputElement).value) })} onTouchEnd={(event) => void saveAccount({ font_scale: Number((event.target as HTMLInputElement).value) })}/></label></div></section>
  }

  function renderConnections() {
    return <div className="settings-stack"><section className="settings-panel"><header><div><span className="eyebrow">AUTHENTICATION</span><h2>Discord</h2></div><strong>CONNECTED</strong></header><div className="connection-card"><div className="connection-mark">D</div><div><strong>{currentAccount.discord_username || 'Discord account'}</strong><span>Discord is the authentication identity for this Hanami account. Hanami does not use a separate email login.</span></div></div></section><section className="settings-panel"><header><div><span className="eyebrow">CAMPUS NETWORK</span><h2>Hanami High</h2></div><strong>ACTIVE</strong></header><div className="connection-card"><div className="connection-mark">H</div><div><strong>Hanami account</strong><span>Account state: {currentAccount.account_state}. This account owns your shared wallet, benefits, inventory, settings, and up to two characters.</span></div></div></section><div className="settings-info-note">There are no other external services connected right now. This page will only show integrations after they actually exist.</div></div>
  }

  return <main className="content-area settings-page"><ShellTopbar eyebrow="SETTINGS" title={meta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/><div className="settings-intro"><div><span className="eyebrow">HANAMI CONTROL CENTER</span><p>{meta[mode].description}</p></div><div className="settings-intro-identity"><span className="settings-scope-tag">{meta[mode].scope}</span><strong>{currentName}</strong><small>@{currentCharacter.handle || 'not-set'}</small></div></div>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="settings-empty">Loading settings…</div> : mode === 'account' ? renderAccount() : mode === 'character' ? renderCharacter() : mode === 'privacy-safety' ? renderPrivacy() : mode === 'notifications' ? renderNotifications() : mode === 'accessibility' ? renderAccessibility() : renderConnections()}</main>
}
