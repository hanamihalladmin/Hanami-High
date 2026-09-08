import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json } from '../types/database'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CharacterProfileInteractivity, CharacterProfileInteractionCounter } from '../types/database-profile-interactivity'

type MiniGames = {
  petal_clicker: boolean
  stamp_hunt: boolean
  tiny_puzzle: boolean
}

type RouteState = {
  active: boolean
  studio: boolean
  targetCharacterId: string | null
}

const defaultGames: MiniGames = { petal_clicker: true, stamp_hunt: false, tiny_puzzle: false }

function gamesFrom(value: Json): MiniGames {
  if (!value || Array.isArray(value) || typeof value !== 'object') return defaultGames
  const source = value as Record<string, Json | undefined>
  return {
    petal_clicker: typeof source.petal_clicker === 'boolean' ? source.petal_clicker : true,
    stamp_hunt: typeof source.stamp_hunt === 'boolean' ? source.stamp_hunt : false,
    tiny_puzzle: typeof source.tiny_puzzle === 'boolean' ? source.tiny_puzzle : false,
  }
}

function routeState(activeCharacterId?: string): RouteState {
  const [section, subsection, target] = window.location.hash.replace(/^#\/?/, '').split('/')
  if (section !== 'profile') return { active: false, studio: false, targetCharacterId: null }
  if (subsection === 'profile-studio') return { active: true, studio: true, targetCharacterId: activeCharacterId || null }
  if (subsection === 'view-profile') return { active: true, studio: false, targetCharacterId: target ? decodeURIComponent(target) : activeCharacterId || null }
  return { active: false, studio: false, targetCharacterId: null }
}

function tone(soundKey: string | null) {
  if (!soundKey) return
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const settings: Record<string, [number, number, OscillatorType]> = {
      'soft-click': [420, 0.035, 'sine'],
      'page-flip': [260, 0.055, 'triangle'],
      sparkle: [880, 0.07, 'sine'],
      chime: [660, 0.09, 'sine'],
      bubble: [330, 0.06, 'sine'],
    }
    const [frequency, duration, type] = settings[soundKey] ?? settings['soft-click']
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)
    oscillator.type = type
    gain.gain.setValueAtTime(0.035, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + duration)
    oscillator.addEventListener('ended', () => void context.close(), { once: true })
  } catch {
    // Audio decoration is optional; never interrupt profile navigation.
  }
}

function counterLabel(kind: string) {
  const labels: Record<string, string> = {
    profile_visit: 'Profile visits',
    petal_game: 'Petal Clicker plays',
    stamp_game: 'Stamp Hunt plays',
    puzzle_game: 'Puzzle plays',
    guestbook_visit: 'Guestbook visits',
    decoration_click: 'Decoration clicks',
  }
  return labels[kind] ?? kind.replaceAll('_', ' ')
}

export function ProfileInteractiveLayer() {
  const { activeCharacter } = useIdentity()
  const [route, setRoute] = useState<RouteState>(() => routeState(activeCharacter?.id))
  const [settings, setSettings] = useState<CharacterProfileInteractivity | null>(null)
  const [snapshot, setSnapshot] = useState<HanamiPlusHubSnapshot | null>(null)
  const [counters, setCounters] = useState<CharacterProfileInteractionCounter[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [gamesOpen, setGamesOpen] = useState(false)
  const [game, setGame] = useState<'petal_clicker' | 'stamp_hunt' | 'tiny_puzzle' | null>(null)
  const [gameScore, setGameScore] = useState(0)
  const [stampTargets, setStampTargets] = useState<number[]>([])
  const [puzzle, setPuzzle] = useState([1, 2, 3, 4, 5, 6, 7, 8, 0])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const originalTitleRef = useRef(document.title)
  const originalFaviconRef = useRef<string | null>(null)
  const recordedVisitRef = useRef<string | null>(null)

  useEffect(() => {
    const sync = () => setRoute(routeState(activeCharacter?.id))
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [activeCharacter?.id])

  const load = useCallback(async () => {
    const client = supabase
    const id = route.targetCharacterId
    if (!client || !route.active || !id) {
      setSettings(null)
      setCounters([])
      return
    }
    setLoading(true)
    setError(null)
    let nextSnapshot: HanamiPlusHubSnapshot | null = null
    if (route.studio) {
      const hubResult = await client.rpc('current_hanami_plus_hub')
      if (hubResult.error) {
        setLoading(false)
        setError(hubResult.error.message)
        return
      }
      nextSnapshot = hubResult.data?.[0] ?? null
      setSnapshot(nextSnapshot)
      if (nextSnapshot?.active) {
        const ensure = await client.rpc('ensure_my_profile_interactivity', { p_character_id: id })
        if (ensure.error) {
          setLoading(false)
          setError(ensure.error.message)
          return
        }
      }
    }
    const [settingsResult, countersResult] = await Promise.all([
      client.from('character_profile_interactivity').select('*').eq('character_id', id).maybeSingle(),
      client.from('character_profile_interaction_counters').select('*').eq('character_id', id).order('interaction_kind'),
    ])
    setLoading(false)
    const firstError = settingsResult.error || countersResult.error
    if (firstError) {
      setError(firstError.message)
      return
    }
    setSettings(settingsResult.data)
    setCounters(countersResult.data ?? [])
  }, [route.active, route.studio, route.targetCharacterId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const client = supabase
    const id = route.targetCharacterId
    if (!client || !route.active || route.studio || !id || !settings) return
    if (recordedVisitRef.current === id) return
    recordedVisitRef.current = id
    void client.rpc('record_profile_interaction', { p_target_character_id: id, p_interaction_kind: 'profile_visit' }).then(() => void load())
  }, [route, settings, load])

  useEffect(() => {
    if (!route.active || !settings) return
    const root = document.documentElement
    root.dataset.profileDivider = settings.divider_style
    root.dataset.profileDividerAnimation = settings.divider_animation
    root.dataset.profileScrollbar = settings.scrollbar_skin
    root.dataset.profileTooltip = settings.tooltip_skin
    root.dataset.profileLinkHover = settings.link_hover_effect
    root.dataset.profileButtonEffect = settings.button_effect
    root.style.setProperty('--profile-selection-color', settings.selection_color)

    const previousTitle = document.title
    if (settings.profile_tab_title) document.title = settings.profile_tab_title

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const hadFavicon = Boolean(favicon)
    const previousFavicon = favicon?.href ?? null
    if (!originalFaviconRef.current) originalFaviconRef.current = previousFavicon
    if (settings.favicon_url) {
      if (!favicon) {
        favicon = document.createElement('link')
        favicon.rel = 'icon'
        document.head.appendChild(favicon)
      }
      favicon.href = settings.favicon_url
    }

    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button,a') : null
      if (target && settings.button_sound_key) tone(settings.button_sound_key)
    }
    document.addEventListener('click', click)

    return () => {
      delete root.dataset.profileDivider
      delete root.dataset.profileDividerAnimation
      delete root.dataset.profileScrollbar
      delete root.dataset.profileTooltip
      delete root.dataset.profileLinkHover
      delete root.dataset.profileButtonEffect
      root.style.removeProperty('--profile-selection-color')
      document.title = previousTitle || originalTitleRef.current
      document.removeEventListener('click', click)
      if (favicon) {
        if (hadFavicon && previousFavicon) favicon.href = previousFavicon
        else if (!hadFavicon) favicon.remove()
      }
    }
  }, [route.active, settings])

  async function savePatch(patch: Partial<CharacterProfileInteractivity>) {
    const client = supabase
    const id = route.targetCharacterId
    if (!client || !id || !route.studio || !snapshot?.active || !settings) return
    setSaving(true)
    setError(null)
    setNotice(null)
    const { error: updateError } = await client.from('character_profile_interactivity').update(patch).eq('character_id', id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setSettings((current) => current ? { ...current, ...patch } : current)
    setNotice('Interactive profile settings saved.')
  }

  async function saveGames(nextGames: MiniGames) {
    await savePatch({ mini_games: nextGames })
  }

  async function record(kind: string) {
    const client = supabase
    const id = route.targetCharacterId
    if (!client || !id || route.studio) return
    const result = await client.rpc('record_profile_interaction', { p_target_character_id: id, p_interaction_kind: kind })
    if (!result.error) await load()
  }

  function openGame(nextGame: 'petal_clicker' | 'stamp_hunt' | 'tiny_puzzle') {
    setGame(nextGame)
    setGameScore(0)
    if (nextGame === 'stamp_hunt') setStampTargets([12, 47, 81])
    if (nextGame === 'tiny_puzzle') setPuzzle([1, 2, 3, 4, 5, 6, 7, 0, 8])
    void record(nextGame === 'petal_clicker' ? 'petal_game' : nextGame === 'stamp_hunt' ? 'stamp_game' : 'puzzle_game')
  }

  function clickPetal() {
    setGameScore((score) => score + 1)
  }

  function collectStamp(target: number) {
    setStampTargets((current) => current.filter((item) => item !== target))
    setGameScore((score) => score + 1)
  }

  function movePuzzle(index: number) {
    const empty = puzzle.indexOf(0)
    const sameRow = Math.floor(index / 3) === Math.floor(empty / 3) && Math.abs(index - empty) === 1
    const sameColumn = Math.abs(index - empty) === 3
    if (!sameRow && !sameColumn) return
    setPuzzle((current) => {
      const next = [...current]
      ;[next[index], next[empty]] = [next[empty], next[index]]
      return next
    })
    setGameScore((score) => score + 1)
  }

  const games = useMemo(() => gamesFrom(settings?.mini_games ?? {}), [settings?.mini_games])
  const enabledGames = Object.entries(games).filter(([, enabled]) => enabled) as [keyof MiniGames, boolean][]
  const ownStudio = route.studio && route.targetCharacterId === activeCharacter?.id

  if (!route.active || !route.targetCharacterId) return null

  return <>
    {ownStudio && <aside className={`profile-interactive-editor ${panelOpen ? 'open' : ''}`}>
      <button className="profile-interactive-editor-tab" type="button" onClick={() => setPanelOpen((open) => !open)}>✦ Interactive</button>
      {panelOpen && <div className="profile-interactive-editor-body">
        <header><span>HANAMI+</span><strong>Interactive Profile</strong><button type="button" onClick={() => setPanelOpen(false)} aria-label="Close interactive profile settings">×</button></header>
        {error && <p className="interactive-error">{error}</p>}
        {notice && <p className="interactive-notice">{notice}</p>}
        {loading ? <p>Loading interactive settings…</p> : !snapshot?.active ? <section className="interactive-lock"><strong>Hanami+ required to edit.</strong><p>Your previously saved interactive design remains attached to this character.</p></section> : settings && <div className="interactive-fields">
          <label>Profile tab title<input maxLength={60} value={settings.profile_tab_title ?? ''} onChange={(event) => setSettings({ ...settings, profile_tab_title: event.target.value })} onBlur={() => void savePatch({ profile_tab_title: settings.profile_tab_title || null })} /></label>
          <label>Favicon / tab icon URL<input value={settings.favicon_url ?? ''} onChange={(event) => setSettings({ ...settings, favicon_url: event.target.value })} onBlur={() => void savePatch({ favicon_url: settings.favicon_url || null })} placeholder="https://…" /></label>
          <label>Divider style<select value={settings.divider_style} onChange={(event) => void savePatch({ divider_style: event.target.value })}><option value="classic">Classic</option><option value="petals">Petals</option><option value="stars">Stars</option><option value="ribbon">Ribbon</option><option value="doodles">Doodles</option><option value="sparkle">Sparkle</option><option value="notebook">Notebook</option></select></label>
          <label>Divider animation<select value={settings.divider_animation} onChange={(event) => void savePatch({ divider_animation: event.target.value })}><option value="none">None</option><option value="drift">Drift</option><option value="shimmer">Shimmer</option><option value="float">Float</option><option value="draw">Draw</option><option value="pulse">Pulse</option></select></label>
          <label>Scrollbar skin<select value={settings.scrollbar_skin} onChange={(event) => void savePatch({ scrollbar_skin: event.target.value })}><option value="standard">Standard</option><option value="pink">Pink</option><option value="sage">Sage</option><option value="notebook">Notebook</option><option value="pixel">Pixel</option><option value="sparkle">Sparkle</option></select></label>
          <label>Tooltip skin<select value={settings.tooltip_skin} onChange={(event) => void savePatch({ tooltip_skin: event.target.value })}><option value="standard">Standard</option><option value="pink-note">Pink Note</option><option value="sage-card">Sage Card</option><option value="pixel">Pixel</option><option value="speech-bubble">Speech Bubble</option></select></label>
          <label>Selection highlight<input type="color" value={settings.selection_color} onChange={(event) => void savePatch({ selection_color: event.target.value })} /></label>
          <label>Link hover effect<select value={settings.link_hover_effect} onChange={(event) => void savePatch({ link_hover_effect: event.target.value })}><option value="underline">Underline</option><option value="glow">Glow</option><option value="sparkle">Sparkle</option><option value="color-shift">Color Shift</option><option value="sticker-pop">Sticker Pop</option><option value="soft-slide">Soft Slide</option></select></label>
          <label>Button effect<select value={settings.button_effect} onChange={(event) => void savePatch({ button_effect: event.target.value })}><option value="none">None</option><option value="soft-pop">Soft Pop</option><option value="sparkle">Sparkle</option><option value="glow">Glow</option><option value="press">Press</option><option value="wiggle">Wiggle</option></select></label>
          <label>Button sound<select value={settings.button_sound_key ?? ''} onChange={(event) => void savePatch({ button_sound_key: event.target.value || null })}><option value="">None</option><option value="soft-click">Soft Click</option><option value="page-flip">Page Flip</option><option value="sparkle">Sparkle</option><option value="chime">Chime</option><option value="bubble">Bubble</option></select></label>
          <fieldset><legend>Mini profile games</legend>{(['petal_clicker','stamp_hunt','tiny_puzzle'] as const).map((key) => <label className="interactive-check" key={key}><input type="checkbox" checked={games[key]} onChange={(event) => void saveGames({ ...games, [key]: event.target.checked })} />{key === 'petal_clicker' ? 'Petal Clicker' : key === 'stamp_hunt' ? 'Stamp Hunt' : 'Tiny Puzzle'}</label>)}</fieldset>
          <label className="interactive-check"><input type="checkbox" checked={settings.show_interaction_counters} onChange={(event) => void savePatch({ show_interaction_counters: event.target.checked })} />Show visitor interaction counters</label>
          {saving && <small>Saving…</small>}
        </div>}
      </div>}
    </aside>}

    {!route.studio && settings && <div className="profile-interactive-dock">
      {enabledGames.length > 0 && <button type="button" onClick={() => setGamesOpen((open) => !open)}>✿ Mini Games</button>}
      {settings.show_interaction_counters && counters.length > 0 && <details><summary>Interaction Counter</summary><div>{counters.map((counter) => <span key={counter.interaction_kind}><strong>{counter.total_count}</strong>{counterLabel(counter.interaction_kind)}</span>)}</div></details>}
    </div>}

    {!route.studio && gamesOpen && settings && <section className="profile-mini-games-panel">
      <header><div><span>PROFILE EXTRAS</span><strong>Mini Games</strong></div><button type="button" onClick={() => { setGamesOpen(false); setGame(null) }}>×</button></header>
      {!game ? <div className="profile-mini-game-picker">{games.petal_clicker && <button type="button" onClick={() => openGame('petal_clicker')}><span>✿</span><strong>Petal Clicker</strong><small>Tap petals and make a tiny score.</small></button>}{games.stamp_hunt && <button type="button" onClick={() => openGame('stamp_hunt')}><span>▣</span><strong>Stamp Hunt</strong><small>Find all three hidden stamps.</small></button>}{games.tiny_puzzle && <button type="button" onClick={() => openGame('tiny_puzzle')}><span>▦</span><strong>Tiny Puzzle</strong><small>Slide the tiles into order.</small></button>}</div> : <div className="profile-mini-game-stage">
        <button className="mini-game-back" type="button" onClick={() => setGame(null)}>← Games</button>
        {game === 'petal_clicker' && <div className="petal-clicker"><strong>Petals: {gameScore}</strong><button type="button" onClick={clickPetal}>✿</button><small>Just for fun — no Petals currency is awarded.</small></div>}
        {game === 'stamp_hunt' && <div className="stamp-hunt"><strong>{stampTargets.length ? `${3 - stampTargets.length}/3 stamps found` : 'All stamps found!'}</strong><div>{[12,47,81].map((target) => stampTargets.includes(target) ? <button key={target} type="button" style={{ left:`${target}%`, top:`${20 + (target % 47)}%` }} onClick={() => collectStamp(target)}>▣</button> : null)}</div></div>}
        {game === 'tiny_puzzle' && <div className="tiny-puzzle"><strong>Moves: {gameScore}</strong><div>{puzzle.map((tile,index) => <button key={`${tile}-${index}`} type="button" className={tile === 0 ? 'empty' : ''} onClick={() => movePuzzle(index)}>{tile || ''}</button>)}</div>{puzzle.join(',') === '1,2,3,4,5,6,7,8,0' && <small>Completed! ✦</small>}</div>}
      </div>}
    </section>}
  </>
}
