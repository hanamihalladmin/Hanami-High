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
        <small>Hanami High School Network · 2006</small>
      </header>
      <div className="section-decoration-strip" aria-hidden="true">❀ · ✿ · ❁ · ✿ · ❀</div>
      <button className="sidebar-search" type="button" onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
        <span>search hanami...</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="sidebar-nav-label">navigation ✿</div>
      <nav className="section-links" aria-label={`${title} navigation`}>
        {section.subsections.map((link) => (
          <button
            className={subsection === link.id ? 'selected' : ''}
            key={link.id}
            type="button"
            onClick={() => onSelect(link.id)}
          >
            <span className="section-link-flower" aria-hidden="true">❀</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-mini-banner">flowers bloom here ♡</div>
      <div className="sidebar-note">
        <span className="status-dot online" />
        <div><strong>Hanami Network</strong><small>campus access active</small></div>
      </div>
    </aside>
  )
}
