import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type {
  BoutiqueItem,
  HanamiPlusBetaFeature,
  HanamiPlusBetaPreference,
  HanamiPlusCalendarEvent,
  HanamiPlusGiftRow,
  HanamiPlusHubSnapshot,
  HanamiPlusLoyaltyCatalogRow,
  HanamiPlusRewardHistoryRow,
} from '../types/database-rewards'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'overview' | 'calendar' | 'inbox' | 'reward-history' | 'gift-history' | 'loyalty-shop' | 'labs'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

const meta: Record<Mode, { title: string; description: string }> = {
  overview: { title: 'Hanami+ Home', description: 'Your optional creative membership, rewards, drops, and customization progress.' },
  calendar: { title: 'Plus Calendar', description: 'Upcoming drops, creative challenges, previews, quests, and seasonal rotations.' },
  inbox: { title: 'Plus Inbox', description: 'A focused inbox for rewards, gifts, claims, trials, and creative-event activity.' },
  'reward-history': { title: 'Reward History', description: 'A permanent timeline of your Hanami+ days, drops, milestones, and claims.' },
  'gift-history': { title: 'Gift History', description: 'Hanami+ passes and cosmetic gifts sent and received by this account.' },
  'loyalty-shop': { title: 'Loyalty Shop', description: 'Special Petal cosmetics unlocked by cumulative Hanami+ days.' },
  labs: { title: 'Hanami+ Labs', description: 'Opt into experimental customization tools before wider release.' },
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function kindLabel(kind: string) {
  return kind.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function HanamiPlusHub({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account } = useIdentity()
  const [snapshot, setSnapshot] = useState<HanamiPlusHubSnapshot | null>(null)
  const [history, setHistory] = useState<HanamiPlusRewardHistoryRow[]>([])
  const [gifts, setGifts] = useState<HanamiPlusGiftRow[]>([])
  const [events, setEvents] = useState<HanamiPlusCalendarEvent[]>([])
  const [loyalty, setLoyalty] = useState<HanamiPlusLoyaltyCatalogRow[]>([])
  const [items, setItems] = useState<BoutiqueItem[]>([])
  const [betaFeatures, setBetaFeatures] = useState<HanamiPlusBetaFeature[]>([])
  const [betaPrefs, setBetaPrefs] = useState<HanamiPlusBetaPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    setLoading(true)
    setError(null)

    const [hubResult, historyResult, giftResult, eventResult, loyaltyResult, betaResult, prefResult] = await Promise.all([
      client.rpc('current_hanami_plus_hub'),
      client.from('hanami_plus_reward_history').select('*').eq('account_id', account.id).order('occurred_at', { ascending: false }).limit(100),
      client.from('hanami_plus_gifts').select('*').or(`sender_account_id.eq.${account.id},recipient_account_id.eq.${account.id}`).order('created_at', { ascending: false }).limit(100),
      client.from('hanami_plus_calendar_events').select('*').order('starts_at', { ascending: true }).limit(100),
      client.from('hanami_plus_loyalty_catalog').select('*').eq('state', 'published').order('sort_order').limit(100),
      client.from('hanami_plus_beta_features').select('*').order('label'),
      client.from('hanami_plus_beta_preferences').select('*').eq('account_id', account.id),
    ])

    const firstError = [hubResult.error, historyResult.error, giftResult.error, eventResult.error, loyaltyResult.error, betaResult.error, prefResult.error].find(Boolean)
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setSnapshot(hubResult.data?.[0] ?? null)
    setHistory(historyResult.data ?? [])
    setGifts(giftResult.data ?? [])
    setEvents(eventResult.data ?? [])
    setLoyalty(loyaltyResult.data ?? [])
    setBetaFeatures(betaResult.data ?? [])
    setBetaPrefs(prefResult.data ?? [])

    const itemIds = Array.from(new Set([
      ...(loyaltyResult.data ?? []).map((row) => row.boutique_item_id),
      ...(historyResult.data ?? []).flatMap((row) => row.boutique_item_id ? [row.boutique_item_id] : []),
      ...(giftResult.data ?? []).flatMap((row) => row.boutique_item_id ? [row.boutique_item_id] : []),
    ]))
    if (itemIds.length) {
      const itemResult = await client.from('boutique_items').select('*').in('id', itemIds)
      if (!itemResult.error) setItems(itemResult.data ?? [])
    } else setItems([])
    setLoading(false)
  }, [account])

  useEffect(() => { void load() }, [load])

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const upcomingEvents = useMemo(() => events.filter((event) => new Date(event.starts_at).getTime() >= Date.now()).slice(0, 6), [events])
  const recentInbox = useMemo(() => {
    const rewardRows = history.slice(0, 8).map((row) => ({
      id: `reward:${row.id}`, when: row.occurred_at, title: row.title, body: row.description || kindLabel(row.reward_kind), kind: 'Reward',
    }))
    const giftRows = gifts.slice(0, 8).map((row) => ({
      id: `gift:${row.id}`, when: row.created_at,
      title: row.recipient_account_id === account?.id ? 'Hanami+ gift received' : 'Hanami+ gift sent',
      body: row.plus_days ? `${row.plus_days}-day Hanami+ pass` : itemById.get(row.boutique_item_id || '')?.name || 'Cosmetic gift', kind: 'Gift',
    }))
    return [...rewardRows, ...giftRows].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 16)
  }, [history, gifts, account, itemById])

  async function toggleBeta(feature: HanamiPlusBetaFeature, optedIn: boolean) {
    const client = supabase
    if (!client) return
    setWorking(feature.feature_key)
    setError(null)
    setNotice(null)
    const { error: toggleError } = await client.rpc('set_hanami_plus_beta_preference', {
      p_feature_key: feature.feature_key,
      p_opted_in: optedIn,
    })
    setWorking(null)
    if (toggleError) {
      setError(toggleError.message)
      return
    }
    setNotice(`${feature.label} ${optedIn ? 'enabled' : 'disabled'} for your Hanami account.`)
    await load()
  }

  const active = Boolean(snapshot?.active)
  const page = meta[mode]

  return (
    <main className="hanami-plus-page">
      <ShellTopbar eyebrow="HANAMI+" title={page.title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount} />

      <section className="plus-hero">
        <div>
          <span className="eyebrow">CREATIVE MEMBERSHIP</span>
          <h1>{active ? 'Hanami+ is blooming.' : 'Make Hanami more yours.'}</h1>
          <p>{page.description}</p>
          <p className="plus-core-note">Hanami+ is optional. Classes, clubs, roleplay, messaging, and the core Hanami community remain available without it.</p>
        </div>
        <div className={`plus-status-card ${active ? 'active' : ''}`}>
          <span>{active ? 'ACTIVE' : 'STANDARD'}</span>
          <strong>{active ? `${snapshot?.days_remaining ?? 0} days` : 'Hanami'}</strong>
          <small>{active ? `through ${formatDate(snapshot?.ends_at)}` : 'Earn or redeem Plus when you want the creative extras.'}</small>
        </div>
      </section>

      {error && <div className="identity-notice error">{error}</div>}
      {notice && <div className="identity-notice success">{notice}</div>}

      {loading ? <section className="plus-empty"><strong>Opening your Hanami+ hub…</strong></section> : (
        <>
          {mode === 'overview' && <>
            <section className="plus-stat-grid">
              <article><span>PROFILE LEVEL</span><strong>Lv. {snapshot?.profile_level ?? 1}</strong><small>{snapshot?.creative_xp ?? 0} creative XP</small></article>
              <article><span>LIFETIME PLUS</span><strong>{snapshot?.lifetime_plus_days ?? 0} days</strong><small>Used for loyalty unlocks and cosmetic prestige.</small></article>
              <article><span>PETALS</span><strong>❀ {snapshot?.petal_balance ?? 0}</strong><small>Plus rewards still use Hanami's earned currency.</small></article>
              <article><span>MONTHLY CLAIM</span><strong>{snapshot?.monthly_claimed ? 'Claimed' : 'Available when scheduled'}</strong><small>No item is invented until the monthly drop is owner-configured.</small></article>
            </section>

            <section className="plus-overview-grid">
              <article className="plus-panel">
                <header><div><span className="eyebrow">COMING UP</span><h2>Plus Calendar</h2></div><a href="#/hanami-plus/calendar">View calendar →</a></header>
                <div className="plus-list">{upcomingEvents.length ? upcomingEvents.map((event) => <div key={event.id} className="plus-list-row"><span>{kindLabel(event.event_kind)}</span><strong>{event.title}</strong><small>{formatDate(event.starts_at)}</small></div>) : <p className="plus-muted">No Plus events have been published yet.</p>}</div>
              </article>
              <article className="plus-panel">
                <header><div><span className="eyebrow">RECENT</span><h2>Rewards & Gifts</h2></div><a href="#/hanami-plus/inbox">Open inbox →</a></header>
                <div className="plus-list">{recentInbox.length ? recentInbox.slice(0, 5).map((entry) => <div key={entry.id} className="plus-list-row"><span>{entry.kind}</span><strong>{entry.title}</strong><small>{entry.body}</small></div>) : <p className="plus-muted">Your Plus reward inbox is empty.</p>}</div>
              </article>
            </section>

            <section className="plus-feature-map">
              <header><span className="eyebrow">APPROVED ROADMAP</span><h2>Your Hanami+ world</h2><p>The 129 approved features are being built as connected systems, not isolated perks.</p></header>
              <div>
                {[
                  ['Profile Studio+', 'Advanced theming, fonts, banners, widgets, effects, scheduling, saved designs, assets, sharing, and collaboration.'],
                  ['Identity & Social', 'Display-name styling, statuses, badges, friend organization, visitor analytics, post/diary styling, reactions, stickers, and guestbook tools.'],
                  ['Boutique & Loadouts', 'Drops, monthly claims, wishlists, per-character cosmetics, loadout presets, early previews, Plus shelf, and loyalty rewards.'],
                  ['Personal Spaces', 'Digital locker, desk, character phone, character desktop, profile mini-games, and interaction counters.'],
                  ['Creator Marketplace', 'Theme sharing, creator portfolios, ratings, comments, versions, follows, collections, gifting, and creative contests.'],
                  ['Dashboard & Messaging', 'Dashboard layouts/widgets/themes, quick-switch tools, inbox organization, notification profiles, message styling, and DM backgrounds.'],
                ].map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}
              </div>
            </section>
          </>}

          {mode === 'calendar' && <section className="plus-panel plus-full-panel"><header><div><span className="eyebrow">TOKYO / HANAMI TIME</span><h2>Hanami+ Calendar</h2></div></header><div className="plus-calendar-list">{events.length ? events.map((event) => <article key={event.id}><div className="plus-calendar-date"><strong>{new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'short',day:'numeric'}).format(new Date(event.starts_at))}</strong><span>{kindLabel(event.event_kind)}</span></div><div><h3>{event.title}</h3><p>{event.description || 'More details will be posted when this event opens.'}</p><small>{formatDate(event.starts_at)}{event.ends_at ? ` — ${formatDate(event.ends_at)}` : ''}</small></div></article>) : <p className="plus-muted">No Hanami+ calendar events are published yet.</p>}</div></section>}

          {mode === 'inbox' && <section className="plus-panel plus-full-panel"><header><div><span className="eyebrow">PLUS INBOX</span><h2>Rewards, gifts & claims</h2></div></header><div className="plus-inbox-list">{recentInbox.length ? recentInbox.map((entry) => <article key={entry.id}><span>{entry.kind}</span><div><strong>{entry.title}</strong><p>{entry.body}</p><small>{formatDate(entry.when)}</small></div></article>) : <p className="plus-muted">Nothing is waiting in your Hanami+ inbox.</p>}</div></section>}

          {mode === 'reward-history' && <section className="plus-panel plus-full-panel"><header><div><span className="eyebrow">ACCOUNT HISTORY</span><h2>Hanami+ Reward Timeline</h2></div></header><div className="plus-history">{history.length ? history.map((entry) => <article key={entry.id}><time>{formatDate(entry.occurred_at)}</time><div><strong>{entry.title}</strong><p>{entry.description || kindLabel(entry.reward_kind)}</p>{entry.plus_days && <span>+{entry.plus_days} Plus days</span>}{entry.boutique_item_id && <span>{itemById.get(entry.boutique_item_id)?.name || 'Cosmetic reward'}</span>}</div></article>) : <p className="plus-muted">No Hanami+ reward history has been recorded for this account yet.</p>}</div></section>}

          {mode === 'gift-history' && <section className="plus-panel plus-full-panel"><header><div><span className="eyebrow">GIFT CARDS</span><h2>Sent & received</h2></div></header><div className="plus-gift-grid">{gifts.length ? gifts.map((gift) => { const received = gift.recipient_account_id === account?.id; return <article key={gift.id}><span>{received ? 'RECEIVED' : 'SENT'} · {gift.status.toUpperCase()}</span><strong>{gift.plus_days ? `${gift.plus_days}-day Hanami+ pass` : itemById.get(gift.boutique_item_id || '')?.name || 'Cosmetic gift'}</strong><p>{gift.gift_message || 'No gift note.'}</p><small>{formatDate(gift.delivered_at || gift.created_at)}</small></article> }) : <p className="plus-muted">No Hanami+ gifts have been sent or received yet.</p>}</div></section>}

          {mode === 'loyalty-shop' && <section className="plus-panel plus-full-panel"><header><div><span className="eyebrow">CUMULATIVE PLUS DAYS</span><h2>Loyalty Shop</h2><p>Your lifetime Plus days unlock the right to buy special cosmetics with earned Petals.</p></div><strong>{snapshot?.lifetime_plus_days ?? 0} days</strong></header><div className="plus-loyalty-grid">{loyalty.length ? loyalty.map((row) => { const item = itemById.get(row.boutique_item_id); const unlocked = (snapshot?.lifetime_plus_days ?? 0) >= row.minimum_lifetime_days; return <article key={row.boutique_item_id} className={unlocked ? '' : 'locked'}><span>{unlocked ? 'UNLOCKED' : `${row.minimum_lifetime_days} DAYS REQUIRED`}</span><strong>{item?.name || 'Loyalty cosmetic'}</strong><p>{item?.description || 'Owner-configured Hanami+ loyalty reward.'}</p><small>❀ {row.price_petals} Petals</small></article> }) : <p className="plus-muted">The owner has not published any loyalty-shop cosmetics yet.</p>}</div></section>}

          {mode === 'labs' && <section className="plus-panel plus-full-panel"><header><div><span className="eyebrow">OPT-IN EXPERIMENTS</span><h2>Hanami+ Labs</h2><p>Experimental features are always optional and can be turned off again.</p></div><strong>{snapshot?.beta_opt_in_count ?? 0} enabled</strong></header><div className="plus-labs-list">{betaFeatures.length ? betaFeatures.map((feature) => { const pref = betaPrefs.find((item) => item.feature_key === feature.feature_key); const checked = Boolean(pref?.opted_in); const plusLocked = feature.state === 'plus_opt_in' && !active; return <label key={feature.feature_key} className={plusLocked ? 'locked' : ''}><div><strong>{feature.label}</strong><p>{feature.description}</p><small>{feature.state === 'plus_opt_in' ? 'Hanami+ beta' : 'Public beta'}</small></div><input type="checkbox" checked={checked} disabled={plusLocked || working === feature.feature_key} onChange={(event) => void toggleBeta(feature, event.target.checked)} /></label> }) : <p className="plus-muted">There are no experimental Hanami+ Labs features open right now.</p>}</div></section>}
        </>
      )}
    </main>
  )
}
