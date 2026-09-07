import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { ShellRoute } from '../types/navigation'

export type HanamiPresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible'
export function presenceStorageKey(characterId: string) { return `hanami-presence:${characterId}` }
export function savedPresence(characterId: string): HanamiPresenceStatus {
  const value = typeof window !== 'undefined' ? localStorage.getItem(presenceStorageKey(characterId)) : null
  return value === 'idle' || value === 'dnd' || value === 'invisible' ? value : 'online'
}

export function usePresenceHeartbeat(route: ShellRoute) {
  const { account, activeCharacter } = useIdentity()
  useEffect(() => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    const presenceClient = client, accountId = account.id, characterId = activeCharacter.id
    let cancelled = false
    async function heartbeat() {
      if (cancelled) return
      const status = savedPresence(characterId)
      const now = new Date().toISOString()
      await presenceClient.from('character_presence').upsert({ character_id: characterId, account_id: accountId, status, current_section: route.section, current_subsection: route.subsection, last_seen_at: now, updated_at: now }, { onConflict: 'character_id' })
    }
    void heartbeat()
    const interval = window.setInterval(() => void heartbeat(), 45_000)
    const handlePresence = (event: Event) => {
      const detail = (event as CustomEvent<{ characterId?: string }>).detail
      if (!detail?.characterId || detail.characterId === characterId) void heartbeat()
    }
    window.addEventListener('hanami-presence-change', handlePresence)
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener('hanami-presence-change', handlePresence) }
  }, [account, activeCharacter, route.section, route.subsection])
}
