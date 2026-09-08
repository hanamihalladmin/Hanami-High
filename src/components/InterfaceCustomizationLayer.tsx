import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json } from '../types/database'
import type { CharacterDashboardCustomization, CharacterMessageCustomization } from '../types/database-dashboard-messaging'

function quickLinksFrom(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 6) : []
}

function linkLabel(route: string) {
  if (route.includes('/academics/')) return 'Classes'
  if (route.includes('/messages/')) return 'Messages'
  if (route.includes('/profile/')) return 'My Page'
  if (route.includes('/hanami-plus/')) return 'Hanami+'
  if (route.includes('/social/')) return 'Social'
  if (route.includes('/campus/')) return 'Campus'
  return 'Shortcut'
}

export function InterfaceCustomizationLayer() {
  const { activeCharacter } = useIdentity()
  const [hash, setHash] = useState(window.location.hash)
  const [dashboard, setDashboard] = useState<CharacterDashboardCustomization | null>(null)
  const [messages, setMessages] = useState<CharacterMessageCustomization | null>(null)

  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) {
      setDashboard(null)
      setMessages(null)
      return
    }
    const [dashResult, messageResult] = await Promise.all([
      client.from('character_dashboard_customization').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
      client.from('character_message_customization').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
    ])
    if (!dashResult.error) setDashboard(dashResult.data)
    if (!messageResult.error) setMessages(messageResult.data)
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const isHome = /^#\/?home\/(overview)?/.test(hash) || hash === '' || hash === '#/' || hash === '#/home'
  const isMessages = /^#\/?messages\//.test(hash)
  const quickLinks = useMemo(() => quickLinksFrom(dashboard?.quick_links ?? []), [dashboard?.quick_links])

  useEffect(() => {
    const root = document.documentElement
    if (isHome && dashboard) {
      root.dataset.dashboardLayout = dashboard.layout_style
      root.dataset.dashboardTheme = dashboard.theme_key
      if (dashboard.wallpaper_url) root.style.setProperty('--hanami-dashboard-wallpaper', `url("${dashboard.wallpaper_url.replaceAll('"','%22')}")`)
      else root.style.removeProperty('--hanami-dashboard-wallpaper')
      const visibility = dashboard.widget_visibility && !Array.isArray(dashboard.widget_visibility) && typeof dashboard.widget_visibility === 'object'
        ? dashboard.widget_visibility as Record<string, Json | undefined>
        : {}
      for (const key of ['school_id','today','note','schedule','announcement','calendar','petals']) {
        root.dataset[`dashboardWidget${key.replace(/(^|_)(\w)/g,(_,__,letter:string)=>letter.toUpperCase())}`] = visibility[key] === false ? 'hidden' : 'visible'
      }
    }
    if (isMessages && messages) {
      root.dataset.messageBubble = messages.bubble_style
      root.dataset.messageFont = messages.message_font
      root.dataset.messageAccent = messages.accent_key
      root.dataset.messageTimestamp = messages.timestamp_style
      root.dataset.messageEffect = messages.message_effect
      if (messages.dm_background_url) root.style.setProperty('--hanami-dm-background', `url("${messages.dm_background_url.replaceAll('"','%22')}")`)
      else root.style.removeProperty('--hanami-dm-background')
    }
    return () => {
      if (isHome) {
        delete root.dataset.dashboardLayout
        delete root.dataset.dashboardTheme
        root.style.removeProperty('--hanami-dashboard-wallpaper')
        for (const key of Object.keys(root.dataset).filter((key) => key.startsWith('dashboardWidget'))) delete root.dataset[key]
      }
      if (isMessages) {
        delete root.dataset.messageBubble
        delete root.dataset.messageFont
        delete root.dataset.messageAccent
        delete root.dataset.messageTimestamp
        delete root.dataset.messageEffect
        root.style.removeProperty('--hanami-dm-background')
      }
    }
  }, [dashboard, messages, isHome, isMessages])

  if (!isHome || quickLinks.length === 0) return null
  return <nav className="hanami-plus-quick-switch" aria-label="Hanami+ quick switch">
    <span>✦ quick switch</span>
    {quickLinks.map((route,index) => <a href={route} key={`${route}-${index}`}>{linkLabel(route)}</a>)}
  </nav>
}
