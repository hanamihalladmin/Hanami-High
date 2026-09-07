import { sections } from '../app/navigation'
import type { ShellSectionId } from '../types/navigation'

type Props = {
  active: ShellSectionId
  onSelect: (id: ShellSectionId) => void
}

export function MainRail({ active, onSelect }: Props) {
  const primaryItems = sections.filter((section) => section.group === 'primary')
  const rewardItems = sections.filter((section) => section.group === 'rewards')
  const settingsItem = sections.find((section) => section.id === 'settings')!

  const renderItem = (item: (typeof sections)[number]) => (
    <button
      className={`rail-button ${active === item.id ? 'is-active' : ''}`}
      key={item.id}
      onClick={() => onSelect(item.id)}
      aria-label={item.label}
      title={item.label}
      type="button"
    >
      <span className="rail-icon" aria-hidden="true">{item.icon}</span>
    </button>
  )

  return (
    <nav className="main-rail" aria-label="Primary">
      <button className="rail-brand" onClick={() => onSelect('home')} aria-label="Hanami High home" type="button">
        <span>花</span>
      </button>
      <div className="rail-stack">{primaryItems.map(renderItem)}</div>
      <div className="rail-rule" />
      <div className="rail-stack">{rewardItems.map(renderItem)}</div>
      <div className="rail-spacer" />
      {renderItem(settingsItem)}
    </nav>
  )
}
