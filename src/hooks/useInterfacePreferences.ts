import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

const PREFERENCE_EVENT = 'hanami:preferences-changed'
const customVars = ['--hanami-custom-ink','--hanami-custom-soft','--hanami-custom-paper','--hanami-custom-accent'] as const

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
    root.dataset.siteTheme = data.custom_theme_enabled ? 'custom' : (data.site_theme || 'hanami')

    if (data.custom_theme_enabled && data.custom_theme_ink && data.custom_theme_soft && data.custom_theme_paper && data.custom_theme_accent) {
      root.style.setProperty(customVars[0], data.custom_theme_ink)
      root.style.setProperty(customVars[1], data.custom_theme_soft)
      root.style.setProperty(customVars[2], data.custom_theme_paper)
      root.style.setProperty(customVars[3], data.custom_theme_accent)
    } else {
      customVars.forEach((name) => root.style.removeProperty(name))
    }
  }, [account])

  useEffect(() => {
    if (!account) return
    void apply()
    const handle = () => void apply()
    window.addEventListener(PREFERENCE_EVENT, handle)
    return () => window.removeEventListener(PREFERENCE_EVENT, handle)
  }, [account, apply])
}
