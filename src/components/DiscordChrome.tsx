import type { ShellRoute } from '../types/navigation'
import { sectionById } from '../app/navigation'

type Props = { route: ShellRoute; onSearch: () => void; onNotifications: () => void; unreadCount: number }

export function DiscordChrome({ route, onSearch, onNotifications, unreadCount }: Props) {
  const section = sectionById[route.section]
  const subsection = section.subsections.find((item) => item.id === route.subsection) ?? section.subsections[0]
  return <header className="discord-app-chrome">
    <div className="discord-window-nav" aria-hidden="true"><span>←</span><span>→</span></div>
    <div className="discord-app-title"><span className="discord-app-mark">花</span><strong>HANAMI HIGH</strong></div>
    <div className="discord-chrome-actions">
      <button type="button" onClick={onSearch} title="Search Hanami High">⌕</button>
      <button type="button" onClick={onNotifications} title="Notifications">♟{unreadCount > 0 && <b>{unreadCount}</b>}</button>
      <span aria-hidden="true">—</span><span aria-hidden="true">□</span><span aria-hidden="true">×</span>
    </div>
    <div className="discord-channel-strip"><span className="discord-channel-hash">#</span><strong>{subsection.label}</strong><small>{subsection.description}</small></div>
  </header>
}
