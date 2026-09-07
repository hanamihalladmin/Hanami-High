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
        <span className="eyebrow">{section.eyebrow}</span>
        <strong>{title}</strong>
      </header>
      <button className="sidebar-search" type="button" onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
        <span>Search Hanami High</span>
        <kbd>⌘ K</kbd>
      </button>
      <nav className="section-links" aria-label={`${title} navigation`}>
        {section.subsections.map((link) => (
          <button
            className={subsection === link.id ? 'selected' : ''}
            key={link.id}
            type="button"
            onClick={() => onSelect(link.id)}
          >
            {link.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="status-dot online" />
        <div><strong>Hanami Network</strong><small>Campus access active</small></div>
      </div>
    </aside>
  )
}
