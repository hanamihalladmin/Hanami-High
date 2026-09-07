import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { ShellRoute } from '../types/navigation'

export function usePresenceHeartbeat(route: ShellRoute) {
  const { account, activeCharacter } = useIdentity()

  useEffect(() => {
    const client = supabase
    if (!client || !account || !activeCharacter) return

    const presenceClient = client
    const accountId = account.id
    const characterId = activeCharacter.id
    let cancelled = false

    async function heartbeat(status: 'online' | 'idle' | 'away' = 'online') {
      if (cancelled) return
      const now = new Date().toISOString()
      await presenceClient.from('character_presence').upsert({
        character_id: characterId,
        account_id: accountId,
        status,
        current_section: route.section,
        current_subsection: route.subsection,
        last_seen_at: now,
        updated_at: now,
      }, { onConflict: 'character_id' })
    }

    void heartbeat(document.visibilityState === 'visible' ? 'online' : 'away')
    const interval = window.setInterval(() => {
      void heartbeat(document.visibilityState === 'visible' ? 'online' : 'away')
    }, 45_000)

    const handleVisibility = () => {
      void heartbeat(document.visibilityState === 'visible' ? 'online' : 'away')
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [account, activeCharacter, route.section, route.subsection])
}
