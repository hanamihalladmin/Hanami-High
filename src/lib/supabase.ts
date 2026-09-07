import { createClient } from '@supabase/supabase-js'
import type { HanamiPlatformDatabase } from '../types/database-platform'

export type LoginIntent = 'member' | 'owner' | 'administrator'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = hasSupabaseConfig
  ? createClient<HanamiPlatformDatabase>(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

function browserRedirectUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''

  if (!url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1)
  }

  return url.toString()
}

export async function signInWithDiscord(intent: LoginIntent = 'member') {
  if (!supabase) throw new Error('Supabase environment variables are not configured.')
  sessionStorage.setItem('hanami-login-intent', intent)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: browserRedirectUrl() },
  })
  if (error) {
    sessionStorage.removeItem('hanami-login-intent')
    throw error
  }
  return data
}
