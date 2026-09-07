import { sectionById } from '../app/navigation'
import type { ShellRoute } from '../types/navigation'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  route: ShellRoute
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

function moduleStatus(section: string, subsection: string) {
  if (section === 'discover' && subsection === 'students') {
    return {
      eyebrow: 'LIVE FOUNDATION',
      title: 'Campus directory search is connected.',
      copy: 'Active character identities are already indexed in Hanami Search. The dedicated directory layout will be expanded with filters, profile previews, and faculty/club/event sources in their feature phases.',
    }
  }
  if (section === 'settings' && subsection === 'notifications') {
    return {
      eyebrow: 'LIVE FOUNDATION',
      title: 'Notification delivery is connected.',
      copy: 'The inbox, unread state, account-versus-character scope, and navigation targets are live. Preference controls will be added when the notification-producing modules are implemented.',
    }
  }
  return {
    eyebrow: 'ROUTE READY',
    title: 'This Hanami page now has a real route.',
    copy: 'The shell, navigation state, deep link, search destination, desktop sidebar, and mobile subsection selector are connected. The feature-specific data and tools for this page will be built in its module phase.',
  }
}

export function ShellPage({ route, onSearch, onNotifications, unreadCount }: Props) {
  const section = sectionById[route.section]
  const subsection = section.subsections.find((item) => item.id === route.subsection) ?? section.subsections[0]
  const status = moduleStatus(route.section, route.subsection)

  return (
    <main className="content-area shell-page">
      <ShellTopbar
        eyebrow={section.eyebrow}
        title={subsection.label}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <div className="shell-breadcrumbs">
        <span>{section.label}</span><b>›</b><strong>{subsection.label}</strong>
      </div>

      <section className="shell-module-card">
        <span className="eyebrow">{status.eyebrow}</span>
        <h2>{status.title}</h2>
        <p>{status.copy}</p>
      </section>

      <div className="shell-route-grid">
        <article>
          <span>SECTION</span>
          <strong>{section.label}</strong>
          <small>{section.title}</small>
        </article>
        <article>
          <span>PAGE</span>
          <strong>{subsection.label}</strong>
          <small>{subsection.description}</small>
        </article>
        <article>
          <span>DEEP LINK</span>
          <strong>#{`/${route.section}/${route.subsection}`}</strong>
          <small>This link survives reloads without server rewrite rules.</small>
        </article>
      </div>
    </main>
  )
}
