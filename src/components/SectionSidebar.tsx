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

  return <aside className="section-sidebar discord-channel-sidebar">
    <header className="section-header discord-server-header">
      <div><span className="discord-server-badge">✿</span><strong>HANAMI HIGH</strong></div>
      <span aria-hidden="true">⌄</span>
    </header>

    <button className="sidebar-search discord-sidebar-search" type="button" onClick={onSearch}>
      <span>Find or start a conversation</span><kbd>⌘K</kbd>
    </button>

    <div className="discord-sidebar-tools">
      <button type="button" onClick={() => onSelect(section.subsections[0]?.id ?? subsection)}><span>⌂</span><strong>{section.label}</strong></button>
      <button type="button" onClick={onSearch}><span>⌕</span><strong>Search</strong></button>
    </div>

    <div className="discord-channel-category"><span>⌄</span><strong>{title.toUpperCase()}</strong><button type="button" title="Section options">＋</button></div>
    <nav className="section-links discord-channel-list" aria-label={`${title} navigation`}>
      {section.subsections.map((link) => <button className={subsection === link.id ? 'selected' : ''} key={link.id} type="button" onClick={() => onSelect(link.id)} title={link.description}>
        <span className="discord-channel-prefix">#</span><span>{link.label}</span>{subsection === link.id && <em>•••</em>}
      </button>)}
    </nav>

    <div className="discord-channel-category secondary"><span>⌄</span><strong>HANAMI NETWORK</strong></div>
    <div className="discord-static-channel"><span>☷</span><div><strong>Server Guide</strong><small>Rules, onboarding & help</small></div></div>
    <div className="discord-static-channel"><span>◇</span><div><strong>Events</strong><small>Campus activity</small></div></div>
  </aside>
}
