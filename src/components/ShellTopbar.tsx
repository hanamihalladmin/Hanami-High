type Props = {
  eyebrow: string
  title: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

export function ShellTopbar({ eyebrow, title, onSearch, onNotifications, unreadCount }: Props) {
  return (
    <div className="page-topbar">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <button className="global-search" type="button" onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
        <span>Search Hanami High</span>
        <kbd>⌘ K</kbd>
      </button>
      <button className="notification-button" type="button" aria-label="Notifications" onClick={onNotifications}>
        ♢
        {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
    </div>
  )
}
