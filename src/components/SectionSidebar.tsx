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
          <strong>{active === 'profile' ? title : 'Hanami High'}</strong>
          <small>{active === 'profile' ? 'Profile space' : `${section.label} · 2006`}</small>
        </div>
        <button type="button" aria-label="Section menu" title="Section menu">⌄</button>
      </header>

      <button className="sidebar-search" type="button" onClick={onSearch}>
        <span>Find or start a search</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="sidebar-channel-category">
        <span>⌄</span>
        <strong>{section.eyebrow}</strong>
        <button type="button" aria-label={`Add ${section.label} shortcut`} title="Hanami navigation is managed by the school">＋</button>
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
            <span className="section-channel-hash" aria-hidden="true">#</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-channel-category secondary">
        <span>⌄</span>
        <strong>HANAMI NETWORK</strong>
      </div>
      <div className="sidebar-network-channel">
        <span className="status-dot online" />
        <div><strong>Campus online</strong><small>Hanami High School · 2006</small></div>
      </div>
    </aside>
  )
}
