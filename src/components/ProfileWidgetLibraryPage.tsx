import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

type WidgetTemplate = {
  type: string
  title: string
  description: string
  width: number
  height: number
  content: string
  badge: string
}

type ExistingWidget = { id: string; y: number; height: number; widget_type: string }

const templates: WidgetTemplate[] = [
  { type: 'mood', title: 'Current Mood', description: 'A tiny status card for the character’s current vibe.', width: 4, height: 2, content: '✿ feeling nostalgic\n♪ listening to something soft', badge: '☺' },
  { type: 'music', title: 'Now Playing', description: 'A decorative music panel. It never autoplays audio.', width: 5, height: 3, content: 'Track — Artist\nAlbum / playlist note\n♫ no autoplay', badge: '♫' },
  { type: 'favorites', title: 'Favorites', description: 'Show favorite media, foods, places, hobbies, or anything else.', width: 4, height: 4, content: 'Music: ...\nMovie: ...\nPlace: ...\nSnack: ...', badge: '★' },
  { type: 'blinkies', title: 'Blinkie Strip', description: 'Stack little early-web badges made from your own text.', width: 6, height: 2, content: 'HANAMI HIGH | ONLINE | BLOGGER | 2006 | ✿ SAKURA', badge: '▰' },
  { type: 'marquee', title: 'Marquee', description: 'A scrolling text strip with reduced-motion support.', width: 8, height: 2, content: '✦ welcome to my page ✦ sign my guestbook ✦ leave a message ✦', badge: '↔' },
  { type: 'journal', title: 'Mini Journal', description: 'A longer diary-style text box for profile lore or an update.', width: 6, height: 4, content: 'April 2006\n\nWrite a little diary entry, character thought, or school-day update here.', badge: '✎' },
  { type: 'contact', title: 'Contact Box', description: 'Classic MySpace-style action shortcuts without fake login UI.', width: 4, height: 3, content: 'Message Me\nAdd Friend\nGuestbook\nRead Blog', badge: '✉' },
  { type: 'quote', title: 'Quote Box', description: 'A decorative quote, lyric-length snippet, motto, or character line.', width: 4, height: 2, content: '“Put your favorite short quote here.”', badge: '❝' },
  { type: 'divider', title: 'Page Divider', description: 'A thin visual break between sections of your board.', width: 12, height: 1, content: '✿ ✦ ✿ ✦ ✿', badge: '—' },
]

export function ProfileWidgetLibraryPage() {
  const { activeCharacter } = useIdentity()
  const [existing, setExisting] = useState<ExistingWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    const result = await client
      .from('profile_widgets')
      .select('id,y,height,widget_type')
      .eq('character_id', activeCharacter.id)
      .order('y')
    setLoading(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setExisting(result.data ?? [])
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => {
    const next = new Map<string, number>()
    for (const widget of existing) next.set(widget.widget_type, (next.get(widget.widget_type) ?? 0) + 1)
    return next
  }, [existing])

  async function add(template: WidgetTemplate) {
    const client = supabase
    if (!client || !activeCharacter || existing.length >= 40) return
    setWorking(template.type)
    setError(null)
    setNotice(null)
    const nextY = existing.reduce((maximum, widget) => Math.max(maximum, widget.y + widget.height), 0) + 1
    const result = await client.from('profile_widgets').insert({
      character_id: activeCharacter.id,
      widget_type: template.type,
      title: template.title,
      config: { content: template.content },
      x: 1,
      y: Math.max(1, Math.min(200, nextY)),
      width: template.width,
      height: template.height,
      z_index: existing.length,
      is_visible: true,
    }).select('id,y,height,widget_type').single()
    setWorking(null)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setExisting((current) => [...current, result.data])
    setNotice(`${template.title} added to the bottom of your draft canvas. Close this drawer to move, resize, and edit it.`)
  }

  if (!activeCharacter) return null

  return <section className="profile-widget-library">
    <header className="profile-widget-library-intro">
      <div><span className="eyebrow">EARLY-WEB MODULES</span><h2>Widget Library</h2><p>Add personal-page modules inspired by MySpace, SpaceHey, old fan pages, diary sites, and 2000s web rings. Everything stays inside Hanami’s safe profile system.</p></div>
      <strong>{existing.length} / 40 widgets</strong>
    </header>

    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}

    {loading ? <div className="studio-loading">Opening widget library…</div> : <div className="profile-widget-library-grid">
      {templates.map((template) => <article key={template.type} className={`profile-widget-template template-${template.type}`}>
        <span className="profile-widget-template-icon" aria-hidden="true">{template.badge}</span>
        <div><span className="eyebrow">{template.width}×{template.height} MODULE</span><h3>{template.title}</h3><p>{template.description}</p><small>{counts.get(template.type) ?? 0} already on this profile</small></div>
        <button type="button" className="primary-action" disabled={working !== null || existing.length >= 40} onClick={() => void add(template)}>{working === template.type ? 'Adding…' : 'Add Widget'}</button>
      </article>)}
    </div>}
  </section>
}
