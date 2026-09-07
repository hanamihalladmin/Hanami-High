import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import { notifyInterfacePreferencesChanged } from '../hooks/useInterfacePreferences'
import type { AccountPreferences, CharacterPreferences } from '../types/database-settings'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'account' | 'character' | 'privacy-safety' | 'notifications' | 'accessibility' | 'connections'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

const meta: Record<Mode, { title: string; description: string }> = {
  account: { title: 'Account', description: 'Discord-linked Hanami account and session controls.' },
  character: { title: 'Character', description: 'Preferences for the character currently active on this account.' },
  'privacy-safety': { title: 'Privacy & Safety', description: 'Control messages, requests, presence, and profile interactions.' },
  notifications: { title: 'Notifications', description: 'Choose which kinds of Hanami activity should notify you.' },
  accessibility: { title: 'Accessibility', description: 'Adjust motion, density, contrast, and interface text size.' },
  connections: { title: 'Connections', description: 'Review services connected to your Hanami account.' },
}

function characterLabel(role: string | null, kind: string) {
  if (kind === 'faculty' && role === 'new_faculty') return 'New Teacher'
  if (kind === 'faculty' && (role === 'faculty' || role === null)) return 'Teacher'
  if (role === 'administration') return 'Staff (future portal)'
  if (!role) return 'Applicant'
  return role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function SettingsPage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter, characters, clearActiveCharacter, signOut } = useIdentity()
  const [accountPrefs, setAccountPrefs] = useState<AccountPreferences | null>(null)
  const [characterPrefs, setCharacterPrefs] = useState<CharacterPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setLoading(true); setError(null)
    const [accountResult, characterResult] = await Promise.all([
      client.from('account_preferences').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('character_preferences').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
    ])
    setLoading(false)
    if (accountResult.error || characterResult.error) return setError((accountResult.error || characterResult.error)?.message || 'Unable to load preferences.')
    setAccountPrefs(accountResult.data)
    setCharacterPrefs(characterResult.data)
  }, [account, activeCharacter])

  useEffect(() => { void load() }, [load])

  async function saveAccount(patch: Partial<AccountPreferences>) {
    const client = supabase
    if (!client || !account) return
    setWorking(true); setError(null); setNotice(null)
    const { error: updateError } = await client.from('account_preferences').update(patch).eq('account_id', account.id)
    setWorking(false)
    if (updateError) return setError(updateError.message)
    setAccountPrefs((current) => current ? { ...current, ...patch } : current)
    notifyInterfacePreferencesChanged()
    setNotice('Account preferences saved.')
  }

  async function saveCharacter(patch: Partial<CharacterPreferences>) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking(true); setError(null); setNotice(null)
    const { error: updateError } = await client.from('character_preferences').update(patch).eq('character_id', activeCharacter.id)
    setWorking(false)
    if (updateError) return setError(updateError.message)
    setCharacterPrefs((current) => current ? { ...current, ...patch } : current)
    setNotice('Character preferences saved.')
  }

  if (!account || !activeCharacter) return null

  function renderAccount() {
    return <div className="settings-stack">
      <section className="settings-panel"><header><div><span className="eyebrow">HANAMI ACCOUNT</span><h2>Account identity</h2></div><strong>{account.account_state}</strong></header><div className="settings-detail-list"><div><span>Discord member</span><strong>{account.discord_username || 'Connected Discord account'}</strong></div><div><span>Character slots</span><strong>{characters.length} / 2 used</strong></div><div><span>Current character</span><strong>{activeCharacter.display_name || activeCharacter.first_name || `Slot ${activeCharacter.slot_no}`}</strong></div></div></section>
      <section className="settings-panel"><header><div><span className="eyebrow">SESSION</span><h2>Character & login</h2></div></header><div className="settings-actions"><div><strong>Switch character</strong><p>Return to the identity selector without signing out of Discord.</p><button onClick={() => void clearActiveCharacter()}>Switch character</button></div><div><strong>Sign out</strong><p>End this Hanami browser session.</p><button onClick={() => void signOut()}>Sign out of Hanami</button></div></div></section>
    </div>
  }

  function renderCharacter() {
    return <section className="settings-panel"><header><div><span className="eyebrow">CURRENT CHARACTER</span><h2>{activeCharacter.display_name || activeCharacter.first_name || 'Hanami Character'}</h2></div><strong>{characterLabel(activeCharacter.school_role, activeCharacter.character_kind)}</strong></header><div className="settings-detail-list"><div><span>Character slot</span><strong>{activeCharacter.slot_no} of 2</strong></div><div><span>School role</span><strong>{characterLabel(activeCharacter.school_role, activeCharacter.character_kind)}</strong></div><div><span>Status</span><strong>{activeCharacter.character_state}</strong></div></div>{characterPrefs && <div className="settings-form-list"><label><div><strong>Default post audience</strong><span>Used as the default when writing new social content.</span></div><select disabled={working} value={characterPrefs.default_post_visibility} onChange={(event) => void saveCharacter({ default_post_visibility: event.target.value })}><option value="hanami">Hanami Network</option><option value="friends">Friends</option><option value="private">Private</option></select></label><label><div><strong>Show school role on profile</strong><span>Display Student/Teacher status in eligible profile areas.</span></div><input type="checkbox" checked={characterPrefs.show_school_role} disabled={working} onChange={(event) => void saveCharacter({ show_school_role: event.target.checked })}/></label></div>}<div className="settings-info-note">Approved character identity fields are protected here. Use the Profile Studio for profile presentation; school-record identity changes remain controlled by Hanami workflows.</div></section>
  }

  function renderPrivacy() {
    if (!accountPrefs || !characterPrefs) return null
    return <div className="settings-stack"><section className="settings-panel"><header><div><span className="eyebrow">ACCOUNT PRIVACY</span><h2>Who can reach you</h2></div></header><div className="settings-form-list"><label><div><strong>Direct messages</strong><span>Who may start a direct conversation.</span></div><select disabled={working} value={accountPrefs.dm_policy} onChange={(event) => void saveAccount({ dm_policy: event.target.value })}><option value="everyone">Everyone</option><option value="friends">Friends only</option><option value="none">Nobody</option></select></label><label><div><strong>Friend requests</strong><span>Who may send this account a request.</span></div><select disabled={working} value={accountPrefs.friend_request_policy} onChange={(event) => void saveAccount({ friend_request_policy: event.target.value })}><option value="everyone">Everyone</option><option value="friends_of_friends">Friends of friends</option><option value="none">Nobody</option></select></label><label><div><strong>Show online status</strong><span>When off, other members cannot read this account’s presence row.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.show_online_status} onChange={(event) => void saveAccount({ show_online_status: event.target.checked })}/></label></div></section><section className="settings-panel"><header><div><span className="eyebrow">CHARACTER PRIVACY</span><h2>Profile interactions</h2></div></header><div className="settings-form-list"><label><div><strong>Profile comments</strong><span>Allow comments where profile modules support them.</span></div><input type="checkbox" disabled={working} checked={characterPrefs.allow_profile_comments} onChange={(event) => void saveCharacter({ allow_profile_comments: event.target.checked })}/></label><label><div><strong>Guestbook</strong><span>Allow members to leave guestbook entries.</span></div><input type="checkbox" disabled={working} checked={characterPrefs.allow_guestbook} onChange={(event) => void saveCharacter({ allow_guestbook: event.target.checked })}/></label><label><div><strong>Activity status</strong><span>Allow profile surfaces to display this character’s activity status.</span></div><input type="checkbox" disabled={working} checked={characterPrefs.show_activity_status} onChange={(event) => void saveCharacter({ show_activity_status: event.target.checked })}/></label></div></section></div>
  }

  function renderNotifications() {
    if (!accountPrefs) return null
    return <section className="settings-panel"><header><div><span className="eyebrow">NOTIFICATION CATEGORIES</span><h2>Hanami alerts</h2></div></header><div className="settings-form-list"><label><div><strong>Messages</strong><span>Direct messages, groups, and message requests.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.notify_messages} onChange={(event) => void saveAccount({ notify_messages: event.target.checked })}/></label><label><div><strong>Social</strong><span>Friend, post, guestbook, and profile activity.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.notify_social} onChange={(event) => void saveAccount({ notify_social: event.target.checked })}/></label><label><div><strong>School</strong><span>Academic, orientation, announcement, and campus updates.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.notify_school} onChange={(event) => void saveAccount({ notify_school: event.target.checked })}/></label></div></section>
  }

  function renderAccessibility() {
    if (!accountPrefs) return null
    return <section className="settings-panel"><header><div><span className="eyebrow">INTERFACE</span><h2>Display & motion</h2></div><span>Applies immediately</span></header><div className="settings-form-list"><label><div><strong>Reduced motion</strong><span>Disable nonessential transitions and animation.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.reduced_motion} onChange={(event) => void saveAccount({ reduced_motion: event.target.checked })}/></label><label><div><strong>Compact mode</strong><span>Reduce spacing to fit more information on screen.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.compact_mode} onChange={(event) => void saveAccount({ compact_mode: event.target.checked })}/></label><label><div><strong>High contrast</strong><span>Strengthen borders and text contrast throughout the shell.</span></div><input type="checkbox" disabled={working} checked={accountPrefs.high_contrast} onChange={(event) => void saveAccount({ high_contrast: event.target.checked })}/></label><label><div><strong>Interface text size</strong><span>{accountPrefs.font_scale}%</span></div><input aria-label="Interface text size" type="range" min="90" max="130" step="5" disabled={working} value={accountPrefs.font_scale} onChange={(event) => setAccountPrefs({ ...accountPrefs, font_scale: Number(event.target.value) })} onMouseUp={(event) => void saveAccount({ font_scale: Number((event.target as HTMLInputElement).value) })} onTouchEnd={(event) => void saveAccount({ font_scale: Number((event.target as HTMLInputElement).value) })}/></label></div></section>
  }

  function renderConnections() {
    return <div className="settings-stack"><section className="settings-panel"><header><div><span className="eyebrow">CONNECTED LOGIN</span><h2>Discord</h2></div><strong>Connected</strong></header><div className="connection-card"><div className="connection-mark">D</div><div><strong>{account.discord_username || 'Discord account'}</strong><span>Discord is the authentication identity for this Hanami account.</span></div></div></section><section className="settings-panel"><header><div><span className="eyebrow">HANAMI SERVICE</span><h2>School Network</h2></div><strong>Active</strong></header><div className="connection-card"><div className="connection-mark">H</div><div><strong>Hanami High account</strong><span>Account state: {account.account_state}. Character identity and Discord authentication stay separate.</span></div></div></section><div className="settings-info-note">No other external services are connected. Future staff or school integrations will appear here only after they are actually implemented.</div></div>
  }

  return <main className="content-area settings-page"><ShellTopbar eyebrow="SETTINGS" title={meta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/><div className="settings-intro"><div><span className="eyebrow">HANAMI SETTINGS</span><p>{meta[mode].description}</p></div><strong>{activeCharacter.display_name || activeCharacter.first_name || 'Current character'}</strong></div>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="settings-empty">Loading settings…</div> : mode === 'account' ? renderAccount() : mode === 'character' ? renderCharacter() : mode === 'privacy-safety' ? renderPrivacy() : mode === 'notifications' ? renderNotifications() : mode === 'accessibility' ? renderAccessibility() : renderConnections()}</main>
}
