import { createClient } from '@supabase/supabase-js'
import type { HanamiCompleteDatabase } from '../types/database-settings'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = hasSupabaseConfig
  ? createClient<HanamiCompleteDatabase>(supabaseUrl!, supabasePublishableKey!, {
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

export async function signInWithDiscord() {
  if (!supabase) {
    throw new Error('Supabase environment variables are not configured.')
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: browserRedirectUrl(),
    },
  })

  if (error) throw error
  return data
}
