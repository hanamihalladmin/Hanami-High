import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfile, PublishedCharacterProfile } from '../types/database'
import { GuestbookPanel } from './GuestbookPanel'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  targetEntryId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

function visibilityLabel(value: string | null | undefined) {
  if (value === 'friends') return 'Friends only'
  if (value === 'disabled') return 'Disabled'
  return 'Hanami Network'
}

export function GuestbookPage({ targetEntryId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [draftProfile, setDraftProfile] = useState<CharacterProfile | null>(null)
  const [publishedProfile, setPublishedProfile] = useState<PublishedCharacterProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [draftResult, publishedResult] = await Promise.all([
      client.from('character_profiles').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
      client.from('published_character_profiles').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
    ])

    setLoading(false)
    if (draftResult.error || publishedResult.error) {
      setError(draftResult.error?.message || publishedResult.error?.message || 'Guestbook settings could not be loaded.')
      return
    }

    setDraftProfile(draftResult.data)
    setPublishedProfile(publishedResult.data)
  }, [activeCharacter])

  useEffect(() => {
    void load()
  }, [load])

  if (!activeCharacter) return null

  return (
    <main className="content-area guestbook-page">
      <ShellTopbar
        eyebrow="PROFILE"
        title="Guestbook"
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}

      <section className="guestbook-settings-card">
        <div>
          <span className="eyebrow">GUESTBOOK ACCESS</span>
          <h2>Who can sign your profile?</h2>
          <p>Your draft setting is edited in Profile Studio. Public guestbook access changes only when you publish your profile.</p>
        </div>
        <div className="guestbook-setting-summary">
          <span><small>Draft</small><strong>{loading ? 'Loading…' : visibilityLabel(draftProfile?.guestbook_visibility)}</strong></span>
          <span><small>Published</small><strong>{loading ? 'Loading…' : publishedProfile ? visibilityLabel(publishedProfile.guestbook_visibility) : 'Not published'}</strong></span>
          <button className="secondary-action" type="button" onClick={() => { window.location.hash = '#/profile/profile-studio' }}>Open Profile Studio →</button>
        </div>
      </section>

      <GuestbookPanel
        targetCharacterId={activeCharacter.id}
        guestbookVisibility={publishedProfile?.guestbook_visibility ?? draftProfile?.guestbook_visibility}
        targetEntryId={targetEntryId}
        management
      />
    </main>
  )
}
