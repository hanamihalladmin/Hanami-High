type Props = {
  eyebrow: string
  title: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

export function ShellTopbar({ eyebrow, title, onSearch, onNotifications, unreadCount }: Props) {
  return (
    <header className="page-topbar">
      <div className="page-channel-title">
        <span className="page-channel-hash" aria-hidden="true">#</span>
        <div>
          <strong>{title}</strong>
          <small>{eyebrow} · Hanami High School Network</small>
        </div>
      </div>
      <div className="page-topbar-actions">
        <span className="page-header-icon" aria-hidden="true" title="Hanami channel tools">⌖</span>
        <span className="page-header-icon" aria-hidden="true" title="Member activity is shown in the right sidebar">♟</span>
        <button className="global-search" type="button" onClick={onSearch}>
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <button className="notification-button" type="button" aria-label="Notifications" onClick={onNotifications} title="Notifications">
          ♢
          {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
      </div>
    </header>
  )
}
