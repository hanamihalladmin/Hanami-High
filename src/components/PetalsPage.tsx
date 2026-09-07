import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatHanamiSchoolDate, hanamiRoleplayDate } from '../lib/roleplayDate'
import { useIdentity } from '../state/IdentityContext'
import type { PetalLedgerEntry, PetalWallet, RoleplaySession, RoleplaySessionParticipant } from '../types/database-rewards'
import type { SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'balance' | 'earning-history' | 'rewards' | 'ways-to-earn'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

const meta: Record<Mode, { title: string; description: string }> = {
  balance: { title: 'Balance', description: 'Your account-wide Petals wallet.' },
  'earning-history': { title: 'Earning History', description: 'Every Petal earned and spent is recorded here.' },
  rewards: { title: 'Rewards', description: 'Roleplay rewards and teacher Petal tools.' },
  'ways-to-earn': { title: 'Ways to Earn', description: 'School, social, roleplay, and daily activities that award Petals.' },
}

const sourceLabels: Record<string, string> = {
  assignment: 'Assignment', daily_login: 'Daily login', roleplay_session: 'Roleplay', likes_received: 'Reaction received',
  teacher_grant: 'Teacher grant', game: 'Petal Garden', purchase: 'Boutique purchase', achievement: 'Achievement', admin_adjustment: 'Adjustment',
}

export function PetalsPage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter, capabilities } = useIdentity()
  const [wallet, setWallet] = useState<PetalWallet | null>(null)
  const [ledger, setLedger] = useState<PetalLedgerEntry[]>([])
  const [sessions, setSessions] = useState<RoleplaySession[]>([])
  const [participants, setParticipants] = useState<RoleplaySessionParticipant[]>([])
  const [students, setStudents] = useState<SearchDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [grant, setGrant] = useState({ characterId: '', amount: '10', note: '' })
  const [sessionDraft, setSessionDraft] = useState({ title: '', description: '', date: hanamiRoleplayDate(), reward: '10' })

  const isTeacher = Boolean(
    activeCharacter
      && activeCharacter.character_kind === 'faculty'
      && (activeCharacter.school_role === null || activeCharacter.school_role === 'new_faculty' || activeCharacter.school_role === 'faculty'),
  )
  const canManageEconomy = capabilities.includes('economy.manage')

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setLoading(true); setError(null)
    const [walletResult, ledgerResult, sessionResult, participantResult] = await Promise.all([
      client.from('petal_wallets').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('petal_ledger').select('*').eq('account_id', account.id).order('created_at', { ascending: false }).limit(200),
      client.from('roleplay_sessions').select('*').order('school_date', { ascending: false }).limit(80),
      client.from('roleplay_session_participants').select('*').order('joined_at'),
    ])
    const firstError = [walletResult.error, ledgerResult.error, sessionResult.error, participantResult.error].find(Boolean)
    if (firstError) { setLoading(false); setError(firstError.message); return }
    setWallet(walletResult.data)
    setLedger(ledgerResult.data ?? [])
    setSessions(sessionResult.data ?? [])
    setParticipants(participantResult.data ?? [])
    if (isTeacher || canManageEconomy) {
      const studentResult = await client.from('search_documents').select('*').eq('document_type', 'character').eq('subsection', 'students').order('title').limit(250)
      if (!studentResult.error) setStudents(studentResult.data ?? [])
    }
    setLoading(false)
  }, [account, activeCharacter, canManageEconomy, isTeacher])

  useEffect(() => { void load() }, [load])

  const dailyClaimed = useMemo(() => ledger.some((item) => item.source_kind === 'daily_login' && Date.now() - new Date(item.created_at).getTime() < 36 * 60 * 60_000), [ledger])
  const gardenPlayed = useMemo(() => ledger.some((item) => item.source_kind === 'game' && Date.now() - new Date(item.created_at).getTime() < 36 * 60 * 60_000), [ledger])

  async function playGarden() {
    const client = supabase
    if (!client) return
    setWorking('garden'); setError(null); setNotice(null)
    const { data, error: playError } = await client.rpc('play_petal_garden')
    setWorking(null)
    if (playError) return setError(playError.message)
    const awarded = data?.[0]?.awarded ?? 0
    setNotice(awarded ? `Petal Garden complete — +${awarded} Petals.` : 'You already completed Petal Garden today.')
    await load()
  }

  async function grantPetals() {
    const client = supabase
    if (!client || !grant.characterId) return
    setWorking('grant'); setError(null); setNotice(null)
    const { error: grantError } = await client.rpc('grant_petals_to_character', {
      p_character_id: grant.characterId,
      p_amount: Number(grant.amount),
      p_note: grant.note,
      p_request_id: crypto.randomUUID(),
    })
    setWorking(null)
    if (grantError) return setError(grantError.message)
    setNotice('Petals granted and recorded in the ledger.')
    setGrant({ characterId: '', amount: '10', note: '' })
    await load()
  }

  async function createSession() {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking('session:create'); setError(null); setNotice(null)
    const { error: createError } = await client.from('roleplay_sessions').insert({
      title: sessionDraft.title.trim(), description: sessionDraft.description.trim() || null,
      school_date: sessionDraft.date, status: 'open', petal_reward: Number(sessionDraft.reward) || 10,
      created_by_character_id: activeCharacter.id,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setSessionDraft((current) => ({ ...current, title: '', description: '' }))
    setNotice('Roleplay reward session opened.')
    await load()
  }

  async function joinSession(session: RoleplaySession) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking(`session:${session.id}`)
    const { error: joinError } = await client.from('roleplay_session_participants').insert({ session_id: session.id, character_id: activeCharacter.id })
    setWorking(null)
    if (joinError) return setError(joinError.message)
    setNotice('Joined roleplay reward session.')
    await load()
  }

  async function leaveSession(session: RoleplaySession) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking(`session:${session.id}`)
    const { error: leaveError } = await client.from('roleplay_session_participants').delete().eq('session_id', session.id).eq('character_id', activeCharacter.id)
    setWorking(null)
    if (leaveError) return setError(leaveError.message)
    setNotice('Left roleplay reward session.')
    await load()
  }

  async function closeSession(session: RoleplaySession) {
    const client = supabase
    if (!client) return
    setWorking(`session:${session.id}`)
    const { data, error: closeError } = await client.rpc('close_roleplay_session', { p_session_id: session.id })
    setWorking(null)
    if (closeError) return setError(closeError.message)
    setNotice(`Session closed. ${data ?? 0} participant rewards were posted.`)
    await load()
  }

  function renderBalance() {
    return <>
      <div className="petal-wallet-hero"><div><span className="eyebrow">ACCOUNT WALLET</span><strong>{wallet?.balance ?? 0}</strong><b>❀ PETALS</b></div><div><span>Lifetime earned</span><strong>{wallet?.lifetime_earned ?? 0}</strong><span>Lifetime spent</span><strong>{wallet?.lifetime_spent ?? 0}</strong></div></div>
      <section className="rewards-panel"><header><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Wallet history</h2></div><a href="#/petals/earning-history">View all</a></header>{ledger.slice(0,8).map((item) => <article className="ledger-row" key={item.id}><div><strong>{item.description}</strong><span>{sourceLabels[item.source_kind] || item.source_kind}</span></div><div><b className={item.amount > 0 ? 'positive' : 'negative'}>{item.amount > 0 ? '+' : ''}{item.amount}</b><small>{new Date(item.created_at).toLocaleString()}</small></div></article>)}{ledger.length === 0 && <div className="rewards-empty">Your Petal history starts with your first reward.</div>}</section>
    </>
  }

  function renderHistory() {
    return <section className="rewards-panel"><header><div><span className="eyebrow">AUDIT LEDGER</span><h2>Earning & spending history</h2></div><strong>{ledger.length}</strong></header>{ledger.length === 0 ? <div className="rewards-empty">No Petal transactions yet.</div> : ledger.map((item) => <article className="ledger-row" key={item.id}><div><strong>{item.description}</strong><span>{sourceLabels[item.source_kind] || item.source_kind}</span></div><div><b className={item.amount > 0 ? 'positive' : 'negative'}>{item.amount > 0 ? '+' : ''}{item.amount}</b><small>{new Date(item.created_at).toLocaleString()}</small></div></article>)}</section>
  }

  function renderWays() {
    return <><div className="earn-grid"><article><strong>Daily Login</strong><span>+5 Petals</span><p>Automatically awarded once per Tokyo calendar day when you enter Hanami with an active character.</p><b>{dailyClaimed ? 'Claimed today' : 'Claims automatically'}</b></article><article><strong>Graded Assignment</strong><span>+10 Petals</span><p>Earned the first time an assignment receives a grade.</p></article><article><strong>Reaction Received</strong><span>+1 Petal</span><p>Earn one Petal when another character reacts to one of your published posts. Each person/post combination awards once.</p></article><article><strong>Roleplay Session</strong><span>Teacher-set reward</span><p>Join an open tracked session. Rewards post when the host closes the session.</p></article><article><strong>Achievements</strong><span>5–20+ Petals</span><p>Milestones award one-time Petal bonuses.</p></article><article className="petal-garden-card"><strong>Petal Garden</strong><span>+3 Petals daily</span><p>Tend the tiny campus garden once per Tokyo day.</p><button className="primary-action" disabled={working === 'garden' || gardenPlayed} onClick={() => void playGarden()}>{gardenPlayed ? 'Garden tended today' : working === 'garden' ? 'Tending…' : 'Tend the garden'}</button></article></div></>
  }

  function renderRewards() {
    return <>
      {(isTeacher || canManageEconomy) && <div className="rewards-admin-grid"><section className="rewards-panel"><header><div><span className="eyebrow">TEACHER GRANT</span><h2>Award Petals</h2></div></header><form className="rewards-form" onSubmit={(event) => { event.preventDefault(); void grantPetals() }}><select required value={grant.characterId} onChange={(event) => setGrant({ ...grant, characterId: event.target.value })}><option value="">Choose student</option>{students.map((student) => <option key={student.entity_id || student.id} value={student.entity_id || ''}>{student.title}</option>)}</select><input required type="number" min="1" max="100" value={grant.amount} onChange={(event) => setGrant({ ...grant, amount: event.target.value })}/><input placeholder="Reason / note" value={grant.note} onChange={(event) => setGrant({ ...grant, note: event.target.value })}/><button className="primary-action" disabled={working === 'grant'}>Grant Petals</button></form></section><section className="rewards-panel"><header><div><span className="eyebrow">ROLEPLAY HOST</span><h2>Open reward session</h2></div></header><form className="rewards-form" onSubmit={(event) => { event.preventDefault(); void createSession() }}><input required placeholder="Session title" value={sessionDraft.title} onChange={(event) => setSessionDraft({ ...sessionDraft, title: event.target.value })}/><textarea placeholder="Description" value={sessionDraft.description} onChange={(event) => setSessionDraft({ ...sessionDraft, description: event.target.value })}/><div className="reward-inline"><input required type="date" min="2006-01-01" max="2006-12-31" value={sessionDraft.date} onChange={(event) => setSessionDraft({ ...sessionDraft, date: event.target.value })}/><input required type="number" min="1" max="100" value={sessionDraft.reward} onChange={(event) => setSessionDraft({ ...sessionDraft, reward: event.target.value })}/></div><button className="primary-action" disabled={working === 'session:create'}>Open session</button></form></section></div>}
      <section className="rewards-panel"><header><div><span className="eyebrow">ROLEPLAY REWARDS</span><h2>Tracked sessions</h2></div><strong>{sessions.length}</strong></header>{sessions.length === 0 ? <div className="rewards-empty">No tracked roleplay sessions yet.</div> : sessions.map((session) => { const joined = participants.some((item) => item.session_id === session.id && item.character_id === activeCharacter?.id); const canClose = session.created_by_character_id === activeCharacter?.id || canManageEconomy; return <article className="roleplay-session-row" key={session.id}><div><strong>{session.title}</strong><span>{formatHanamiSchoolDate(session.school_date)} · {session.petal_reward} Petals · {session.status}</span>{session.description && <small>{session.description}</small>}</div><div><span>{participants.filter((item) => item.session_id === session.id).length} joined</span>{session.status === 'open' && !joined && <button onClick={() => void joinSession(session)}>Join</button>}{session.status === 'open' && joined && <button onClick={() => void leaveSession(session)}>Leave</button>}{session.status === 'open' && canClose && <button className="primary-action" onClick={() => void closeSession(session)}>Close & award</button>}</div></article> })}</section>
    </>
  }

  return <main className="content-area rewards-page"><ShellTopbar eyebrow="PETALS" title={meta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/><div className="rewards-intro"><div><span className="eyebrow">❀ HANAMI ECONOMY</span><p>{meta[mode].description}</p></div><strong>{wallet?.balance ?? 0} Petals</strong></div>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="rewards-empty">Loading Petals…</div> : mode === 'balance' ? renderBalance() : mode === 'earning-history' ? renderHistory() : mode === 'ways-to-earn' ? renderWays() : renderRewards()}</main>
}
