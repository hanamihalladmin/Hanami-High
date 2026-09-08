import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

const PREFERENCE_EVENT = 'hanami:preferences-changed'
const customVars = [
  '--hanami-custom-ink','--hanami-custom-soft','--hanami-custom-paper','--hanami-custom-surface','--hanami-custom-border','--hanami-custom-accent','--hanami-custom-text','--hanami-custom-text-secondary','--hanami-custom-link',
] as const

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
      const values = [
        data.custom_theme_ink,
        data.custom_theme_soft,
        data.custom_theme_paper,
        data.custom_theme_surface || data.custom_theme_paper,
        data.custom_theme_border || data.custom_theme_soft,
        data.custom_theme_accent,
        data.custom_theme_text || data.custom_theme_ink,
        data.custom_theme_text_secondary || data.custom_theme_soft,
        data.custom_theme_link || data.custom_theme_accent,
      ]
      customVars.forEach((name,index)=>root.style.setProperty(name,values[index]))
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
