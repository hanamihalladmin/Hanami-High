import { useIdentity } from '../state/IdentityContext'
import type { HanamiNotification, Json } from '../types/database'
import type { ShellRoute } from '../types/navigation'
import { normalizeRoute } from '../app/navigation'

function characterName(characterId: string | null, characters: ReturnType<typeof useIdentity>['characters']) {
  if (!characterId) return 'Account'
  const character = characters.find((item) => item.id === characterId)
  if (!character) return 'Character'
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character ${character.slot_no}`
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function metadataObject(value: Json) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : {}
}

function targetIdFromNotification(notification: HanamiNotification) {
  const metadata = metadataObject(notification.metadata)
  if (notification.kind === 'post_comment' && typeof metadata.post_id === 'string') {
    return metadata.post_id
  }
  if (notification.kind === 'guestbook_entry' && typeof metadata.entry_id === 'string') {
    return metadata.entry_id
  }
  return undefined
}

type Props = {
  open: boolean
  notifications: HanamiNotification[]
  loading: boolean
  error: string | null
  onClose: () => void
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
  onNavigate: (route: ShellRoute) => void
}

export function NotificationCenter({
  open,
  notifications,
  loading,
  error,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: Props) {
  const { characters } = useIdentity()
  if (!open) return null

  async function openNotification(notification: HanamiNotification) {
    if (!notification.read_at) await onMarkRead(notification.id)
    if (notification.section) {
      const baseRoute = normalizeRoute(notification.section, notification.subsection ?? undefined)
      const targetId = targetIdFromNotification(notification)
      onNavigate(targetId ? { ...baseRoute, targetId } : baseRoute)
      onClose()
    }
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length

  return (
    <div className="shell-overlay notification-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="notification-panel" role="dialog" aria-modal="true" aria-label="Notifications">
        <header>
          <div><span className="eyebrow">HANAMI NETWORK</span><h2>Notifications</h2></div>
          <button type="button" onClick={onClose} aria-label="Close notifications">×</button>
        </header>
        <div className="notification-toolbar">
          <span>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</span>
          <button type="button" disabled={!unreadCount} onClick={() => void onMarkAllRead()}>Mark all read</button>
        </div>
        <div className="notification-list">
          {loading && <div className="search-status">Loading notifications…</div>}
          {error && <div className="identity-notice error">{error}</div>}
          {!loading && !error && notifications.length === 0 && (
            <div className="search-empty-state">
              <strong>No notifications yet</strong>
              <span>Account-level and character-specific notices will appear here as Hanami modules begin generating activity.</span>
            </div>
          )}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notification-row ${notification.read_at ? '' : 'unread'}`}
              onClick={() => void openNotification(notification)}
            >
              <span className="notification-dot" aria-hidden="true" />
              <span className="notification-copy">
                <span className="notification-meta">
                  <strong>{characterName(notification.character_id, characters)}</strong>
                  <em>{notification.kind.replaceAll('_', ' ')}</em>
                  <time>{relativeTime(notification.created_at)}</time>
                </span>
                <b>{notification.title}</b>
                {notification.body && <small>{notification.body}</small>}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
