import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiNotification } from '../types/database'

export function useNotificationInbox() {
  const { account } = useIdentity()
  const [notifications, setNotifications] = useState<HanamiNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const client = supabase
    if (!client || !account) {
      setNotifications([])
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: loadError } = await client
      .from('notifications')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(40)

    setLoading(false)
    if (loadError) {
      setError(loadError.message)
      return
    }
    setNotifications(data ?? [])
  }, [account])

  useEffect(() => {
    void refresh()
    const handleFocus = () => void refresh()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refresh])

  const markRead = useCallback(async (notificationId: string) => {
    const client = supabase
    if (!client) return
    const readAt = new Date().toISOString()
    const { error: updateError } = await client
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notificationId)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, read_at: readAt } : item
    )))
  }, [])

  const markAllRead = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    const readAt = new Date().toISOString()
    const { error: updateError } = await client
      .from('notifications')
      .update({ read_at: readAt })
      .eq('account_id', account.id)
      .is('read_at', null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotifications((current) => current.map((item) => (
      item.read_at ? item : { ...item, read_at: readAt }
    )))
  }, [account])

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read_at ? 0 : 1), 0),
    [notifications],
  )

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
  }
}
