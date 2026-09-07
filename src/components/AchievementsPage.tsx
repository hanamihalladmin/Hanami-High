import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AchievementDefinition, CharacterAchievement } from '../types/database-rewards'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'my-achievements' | 'collections' | 'school-history'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

const meta: Record<Mode, { title: string; description: string }> = {
  'my-achievements': { title: 'My Achievements', description: 'Milestones earned by this character.' },
  collections: { title: 'Collections', description: 'Achievement sets across school, social, and campus life.' },
  'school-history': { title: 'School History', description: 'A timeline of this character’s Hanami milestones.' },
}

export function AchievementsPage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([])
  const [unlocked, setUnlocked] = useState<CharacterAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true); setError(null)
    const { data: syncData, error: syncError } = await client.rpc('sync_my_achievements')
    if (syncError) { setLoading(false); setError(syncError.message); return }
    if ((syncData ?? 0) > 0) setNotice(`${syncData} new achievement${syncData === 1 ? '' : 's'} unlocked.`)
    const [definitionResult, unlockResult] = await Promise.all([
      client.from('achievement_definitions').select('*').eq('active', true).order('sort_order'),
      client.from('character_achievements').select('*').eq('character_id', activeCharacter.id).order('unlocked_at', { ascending: false }),
    ])
    const firstError = definitionResult.error || unlockResult.error
    setLoading(false)
    if (firstError) return setError(firstError.message)
    setDefinitions(definitionResult.data ?? [])
    setUnlocked(unlockResult.data ?? [])
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const unlockedByDefinition = useMemo(() => new Map(unlocked.map((item) => [item.achievement_id, item])), [unlocked])
  const visibleDefinitions = useMemo(() => definitions.filter((item) => !item.hidden || unlockedByDefinition.has(item.id)), [definitions, unlockedByDefinition])
  const collections = useMemo(() => Array.from(new Set(visibleDefinitions.map((item) => item.collection_name))), [visibleDefinitions])

  function achievementCard(definition: AchievementDefinition) {
    const earned = unlockedByDefinition.get(definition.id)
    return <article className={`achievement-card ${earned ? 'unlocked' : 'locked'}`} key={definition.id}><div className="achievement-medal">{earned ? '★' : '☆'}</div><div><span className="eyebrow">{definition.category} · {definition.collection_name}</span><h3>{definition.name}</h3><p>{definition.description}</p><div className="achievement-progress"><span>{earned ? `Unlocked · progress ${earned.progress_value}` : `Goal · ${definition.threshold}`}</span><strong>+{definition.petal_reward} ❀</strong></div>{earned && <small>{new Date(earned.unlocked_at).toLocaleString()}</small>}</div></article>
  }

  function renderMine() {
    return <><div className="achievement-stat-grid"><article><span>UNLOCKED</span><strong>{unlocked.length}</strong><small>of {visibleDefinitions.length}</small></article><article><span>REWARD VALUE</span><strong>{visibleDefinitions.filter((item) => unlockedByDefinition.has(item.id)).reduce((sum, item) => sum + item.petal_reward, 0)}</strong><small>Petals earned from achievements</small></article><article><span>COLLECTIONS</span><strong>{collections.length}</strong><small>achievement sets</small></article></div><div className="achievement-grid">{visibleDefinitions.map(achievementCard)}</div></>
  }

  function renderCollections() {
    return <div className="achievement-collections">{collections.map((collection) => { const defs = visibleDefinitions.filter((item) => item.collection_name === collection); const earnedCount = defs.filter((item) => unlockedByDefinition.has(item.id)).length; return <section className="rewards-panel" key={collection}><header><div><span className="eyebrow">COLLECTION</span><h2>{collection}</h2></div><strong>{earnedCount}/{defs.length}</strong></header><div className="achievement-grid compact">{defs.map(achievementCard)}</div></section> })}</div>
  }

  function renderHistory() {
    const timeline = unlocked.map((achievement) => ({ achievement, definition: definitions.find((item) => item.id === achievement.achievement_id) })).filter((item) => item.definition)
    return <section className="rewards-panel"><header><div><span className="eyebrow">CHARACTER HISTORY</span><h2>Milestone timeline</h2></div><strong>{timeline.length}</strong></header>{timeline.length === 0 ? <div className="rewards-empty">This character’s achievement history will appear here as milestones unlock.</div> : <div className="achievement-timeline">{timeline.map(({ achievement, definition }) => <article key={achievement.achievement_id}><div className="timeline-mark">★</div><div><strong>{definition?.name}</strong><span>{definition?.description}</span><small>{new Date(achievement.unlocked_at).toLocaleString()} · +{definition?.petal_reward ?? 0} Petals</small></div></article>)}</div>}</section>
  }

  return <main className="content-area achievements-page"><ShellTopbar eyebrow="ACHIEVEMENTS" title={meta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/><div className="rewards-intro"><div><span className="eyebrow">HANAMI MILESTONES</span><p>{meta[mode].description}</p></div><strong>{unlocked.length} unlocked</strong></div>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="rewards-empty">Checking achievements…</div> : mode === 'my-achievements' ? renderMine() : mode === 'collections' ? renderCollections() : renderHistory()}</main>
}
