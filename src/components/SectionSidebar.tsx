import { sectionById } from '../app/navigation'
import type { ShellSectionId } from '../types/navigation'

type Props = {
  active: ShellSectionId
  subsection: string
  profileTitle?: string
  onSelect: (subsection: string) => void
  onSearch: () => void
}

export function SectionSidebar({ active, subsection, profileTitle, onSelect, onSearch }: Props) {
  const section = sectionById[active]
  const title = active === 'profile' && profileTitle ? profileTitle : section.title

  return (
    <aside className="section-sidebar">
      <header className="section-header">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <strong>{active === 'profile' ? title : 'Hanami High'}</strong>
          <small>{active === 'profile' ? 'personal page space' : `${section.label} · school network · 2006`}</small>
        </div>
        <span className="section-header-chevron" aria-hidden="true">⌄</span>
      </header>

      <div className="section-decoration-strip" aria-hidden="true">✿ · ❀ · ✿ · ❀ · ✿</div>

      <button className="sidebar-search" type="button" onClick={onSearch}>
        <span>Find something…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="sidebar-nav-label">{section.label} links</div>
      <div className="sidebar-channel-category" aria-hidden="true">
        <span>⌄</span>
        <strong>{section.eyebrow}</strong>
        <span className="sidebar-channel-plus">＋</span>
      </div>

      <nav className="section-links" aria-label={`${title} navigation`}>
        {section.subsections.map((link) => (
          <button
            className={subsection === link.id ? 'selected' : ''}
            key={link.id}
            type="button"
            onClick={() => onSelect(link.id)}
            title={link.description}
          >
            <span className="section-link-flower" aria-hidden="true">✿</span>
            <span className="section-channel-hash" aria-hidden="true">#</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-mini-banner">❀ flowers bloom at hanami ❀</div>
      <div className="sidebar-note">
        <span className="status-dot online" />
        <div><strong>Campus network online</strong><small>Hanami High · 2006</small></div>
      </div>

      <div className="sidebar-channel-category secondary" aria-hidden="true">
        <span>⌄</span>
        <strong>HANAMI NETWORK</strong>
      </div>
      <div className="sidebar-network-channel" aria-hidden="true">
        <span className="status-dot online" />
        <div><strong>Campus online</strong><small>Hanami High School · 2006</small></div>
      </div>
    </aside>
  )
}