import { sectionById } from '../app/navigation'
import type { ShellSectionId } from '../types/navigation'

type Props = {
  section: ShellSectionId
  subsection: string
  onSelect: (subsection: string) => void
}

export function MobileSectionNav({ section, subsection, onSelect }: Props) {
  const definition = sectionById[section]
  return (
    <div className="mobile-section-nav">
      <div><span className="eyebrow">{definition.eyebrow}</span><strong>{definition.label}</strong></div>
      <select aria-label={`${definition.label} page`} value={subsection} onChange={(event) => onSelect(event.target.value)}>
        {definition.subsections.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
      </select>
    </div>
  )
}
