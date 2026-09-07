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
      <div className="page-topbar-banner" aria-hidden="true">
        <span>✿ HANAMI HIGH SCHOOL NETWORK ✿</span>
        <small>flowers · friendship · school life · est. 2006</small>
      </div>
      <div className="page-title-block">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <div className="page-title-divider" aria-hidden="true">❀ ─── ✿ ─── ❀</div>
      </div>
      <button className="global-search" type="button" onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
        <span>Search Hanami High</span>
        <kbd>⌘ K</kbd>
      </button>
      <button className="notification-button" type="button" aria-label="Notifications" onClick={onNotifications}>
        ✿
        {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
    </div>
  )
}
