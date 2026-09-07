import type { RailItem } from '../types/navigation'

const primaryItems: RailItem[] = [
  { id: 'home', label: 'Hanami Home', icon: '⌂' },
  { id: 'messages', label: 'Messages', icon: '✉' },
  { id: 'social', label: 'Social', icon: '♡' },
  { id: 'academics', label: 'Academics', icon: '▤' },
  { id: 'campus', label: 'Campus', icon: '✿' },
  { id: 'profile', label: 'My Profile', icon: '☺' },
  { id: 'discover', label: 'Discover', icon: '⌕' },
]

const rewardItems: RailItem[] = [
  { id: 'petals', label: 'Petals', icon: '❀', badge: '1,240' },
  { id: 'boutique', label: 'Boutique', icon: '◇' },
  { id: 'achievements', label: 'Achievements', icon: '★' },
]

type Props = {
  active: string
  onSelect: (id: string) => void
}

export function MainRail({ active, onSelect }: Props) {
  const renderItem = (item: RailItem) => (
    <button
      className={`rail-button ${active === item.id ? 'is-active' : ''}`}
      key={item.id}
      onClick={() => onSelect(item.id)}
      aria-label={item.label}
      title={item.label}
    >
      <span className="rail-icon" aria-hidden="true">{item.icon}</span>
      {item.badge ? <span className="rail-badge">{item.badge}</span> : null}
    </button>
  )

  return (
    <nav className="main-rail" aria-label="Primary">
      <button className="rail-brand" onClick={() => onSelect('home')} aria-label="Hanami High home">
        <span>花</span>
      </button>
      <div className="rail-stack">{primaryItems.map(renderItem)}</div>
      <div className="rail-rule" />
      <div className="rail-stack">{rewardItems.map(renderItem)}</div>
      <div className="rail-spacer" />
      {renderItem({ id: 'settings', label: 'Settings', icon: '⚙' })}
    </nav>
  )
}
