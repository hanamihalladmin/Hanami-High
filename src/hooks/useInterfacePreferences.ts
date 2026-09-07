import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

const PREFERENCE_EVENT = 'hanami:preferences-changed'

export function notifyInterfacePreferencesChanged() {
  window.dispatchEvent(new Event(PREFERENCE_EVENT))
}

export function useInterfacePreferences() {
  const { account } = useIdentity()

  const apply = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    const { data, error } = await client.from('account_preferences').select('*').eq('account_id', account.id).maybeSingle()
    if (error || !data) return

    const root = document.documentElement
    root.classList.toggle('hanami-reduced-motion', data.reduced_motion)
    root.classList.toggle('hanami-compact', data.compact_mode)
    root.classList.toggle('hanami-high-contrast', data.high_contrast)
    root.style.setProperty('--hanami-font-scale', String(data.font_scale / 100))
  }, [account])

  useEffect(() => {
    if (!account) return
    void apply()
    const handle = () => void apply()
    window.addEventListener(PREFERENCE_EVENT, handle)
    return () => window.removeEventListener(PREFERENCE_EVENT, handle)
  }, [account, apply])
}
