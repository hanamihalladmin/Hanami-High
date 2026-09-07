import { OrientationPanel } from './OrientationPanel'
import { ShellTopbar } from './ShellTopbar'
import { useIdentity } from '../state/IdentityContext'

function roleLabel(role: string | null) {
  if (!role) return 'Student'
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

export function HomePreview({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  if (!activeCharacter) return null

  const firstName = activeCharacter.first_name
    || activeCharacter.display_name?.split(/\s+/)[0]
    || 'Student'

  return (
    <main className="content-area">
      <ShellTopbar
        eyebrow="HANAMI HOME"
        title={`Good afternoon, ${firstName}.`}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <div className="date-strip">
        <div><span>TUESDAY</span><strong>April 18, 2006</strong></div>
        <div><span>SCHOOL STATUS</span><strong><i className="status-dot online" /> In session</strong></div>
        <div><span>STATUS</span><strong>{roleLabel(activeCharacter.school_role)}</strong></div>
      </div>

      <OrientationPanel />

      <div className="dashboard-grid">
        <section className="panel schedule-panel">
          <header><div><span className="eyebrow">TODAY</span><h2>Your schedule</h2></div><button>Full schedule →</button></header>
          {[
            ['08:30', 'Homeroom', '2-B', 'Complete'],
            ['09:00', 'English II', 'Room 204', 'Now'],
            ['10:00', 'Mathematics II', 'Room 302', 'Next'],
            ['11:00', 'Science II', 'Lab 1', 'Later'],
          ].map(([time, subject, room, state]) => (
            <div className={`schedule-row ${state === 'Now' ? 'current' : ''}`} key={subject}>
              <time>{time}</time><div><strong>{subject}</strong><span>{room}</span></div><em>{state}</em>
            </div>
          ))}
        </section>

        <section className="panel announcement-panel">
          <header><div><span className="eyebrow">SCHOOL ANNOUNCEMENT</span><h2>Spring Festival applications</h2></div><span className="paperclip">✦</span></header>
          <p>Club booths and performance applications close this Friday. Visit Campus to review the festival schedule and application details.</p>
          <button className="text-link">Read announcement →</button>
        </section>

        <section className="panel social-panel">
          <header><div><span className="eyebrow">FROM YOUR FRIENDS</span><h2>Campus activity</h2></div><button>Social →</button></header>
          <div className="activity"><div className="mini-avatar">YT</div><p><strong>Yuki</strong> posted a bulletin<br/><span>“art club after school today!!”</span></p><time>4m</time></div>
          <div className="activity"><div className="mini-avatar">RI</div><p><strong>Ren</strong> changed their status<br/><span>“library until 4 ♡”</span></p><time>12m</time></div>
          <div className="activity"><div className="mini-avatar">MS</div><p><strong>Mei</strong> updated her profile theme<br/><span>Cyber Café → Spring</span></p><time>31m</time></div>
        </section>

        <section className="panel wallet-panel">
          <header><div><span className="eyebrow">PETALS</span><h2>🌸 1,240</h2></div><span className="hanami-plus">HANAMI+</span></header>
          <p>+150 earned this week</p>
          <div className="wallet-actions"><button>Visit Boutique</button><button>View rewards</button></div>
        </section>
      </div>
    </main>
  )
}
