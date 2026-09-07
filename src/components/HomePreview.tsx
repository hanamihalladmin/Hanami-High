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
  const fullName = activeCharacter.display_name
    || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ')
    || firstName

  return (
    <main className="content-area hanami-home-page">
      <ShellTopbar
        eyebrow="HANAMI HOME"
        title={`Welcome back, ${firstName}.`}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <section className="home-floral-banner">
        <div className="home-floral-banner-copy">
          <span className="eyebrow">花見高校 · HANAMI HIGH SCHOOL</span>
          <h2>Welcome to our little garden on the web ✿</h2>
          <p>School life, friends, classes, clubs, and all the small things that make Hanami feel alive.</p>
        </div>
        <div className="home-floral-stamp"><strong>SPRING</strong><span>2006</span><small>❀ campus network ❀</small></div>
      </section>

      <div className="home-web-grid">
        <aside className="home-web-left">
          <section className="home-web-card home-id-card">
            <div className="home-card-title">✿ student corner</div>
            <div className="home-id-avatar">{fullName.slice(0, 2).toUpperCase()}</div>
            <strong>{fullName}</strong>
            <span>{activeCharacter.handle ? `@${activeCharacter.handle}` : 'Hanami member'}</span>
            <div className="home-id-badges"><b>❀ {roleLabel(activeCharacter.school_role)}</b><b>♡ enrolled</b></div>
            <a href="#/profile/view-profile">view my profile →</a>
          </section>

          <section className="home-web-card home-counter-card">
            <div className="home-card-title">❀ campus status</div>
            <dl><div><dt>day</dt><dd>Tuesday</dd></div><div><dt>date</dt><dd>April 18, 2006</dd></div><div><dt>school</dt><dd>In session</dd></div></dl>
          </section>

          <section className="home-web-card home-mini-note">
            <div className="home-card-title">pressed flower note</div>
            <p>“Bloom where you are planted.”</p>
            <span>— Hanami High</span>
          </section>
        </aside>

        <section className="home-web-center">
          <nav className="home-pixel-tabs" aria-label="Home shortcuts">
            <a href="#/home/overview">home</a>
            <a href="#/academics/overview">academics</a>
            <a href="#/social/feed">social</a>
            <a href="#/campus/overview">campus</a>
            <a href="#/profile/view-profile">profile</a>
          </nav>

          <section className="home-welcome-box">
            <div className="home-card-title">welcome to hanami high!! ❀</div>
            <div className="home-welcome-inner">
              <p>Hi {firstName}! This is your personal school homepage. Check what is happening today, jump into your classes, see campus updates, or decorate your profile.</p>
              <p className="home-handwritten">flowers bloom at their own pace ♡</p>
            </div>
          </section>

          <OrientationPanel />

          <div className="home-sticker-strip" aria-label="Quick links">
            <a href="#/academics/classes">✿ my classes</a>
            <a href="#/academics/homeroom">❀ homeroom</a>
            <a href="#/social/friends">♡ friends</a>
            <a href="#/campus/clubs">✾ clubs</a>
            <a href="#/boutique/featured">🌸 boutique</a>
          </div>

          <div className="dashboard-grid home-dashboard-grid">
            <section className="panel schedule-panel">
              <header><div><span className="eyebrow">TODAY</span><h2>Your schedule</h2></div><a className="text-link" href="#/academics/schedule">Full schedule →</a></header>
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
              <header><div><span className="eyebrow">SCHOOL ANNOUNCEMENT</span><h2>Spring Festival applications</h2></div><span className="paperclip">✿</span></header>
              <p>Club booths and performance applications close this Friday. Visit Campus to review the festival schedule and application details.</p>
              <a className="text-link home-inline-link" href="#/home/announcements">Read announcement →</a>
            </section>

            <section className="panel social-panel">
              <header><div><span className="eyebrow">YOUR NETWORK</span><h2>Campus activity</h2></div><a className="text-link" href="#/social/feed">Social →</a></header>
              <div className="home-empty-social"><span>❀</span><p>Your friends’ newest bulletins, blog posts, and profile updates will appear here.</p></div>
            </section>

            <section className="panel wallet-panel">
              <header><div><span className="eyebrow">PETALS</span><h2>🌸 Your wallet</h2></div><span className="hanami-plus">HANAMI+</span></header>
              <p>Petals are shared across your Hanami account.</p>
              <div className="wallet-actions"><a href="#/boutique/featured">Visit Boutique</a><a href="#/petals/rewards">View rewards</a></div>
            </section>
          </div>
        </section>

        <aside className="home-web-right">
          <section className="home-web-card home-navigation-card">
            <div className="home-card-title">navigation :3</div>
            <a href="#/home/announcements">announcements <span>✿</span></a>
            <a href="#/academics/classes">my classes <span>❀</span></a>
            <a href="#/academics/homeroom">homeroom <span>✾</span></a>
            <a href="#/messages/inbox">messages <span>♡</span></a>
            <a href="#/campus/events">events <span>✿</span></a>
            <a href="#/profile/profile-studio">profile studio <span>❀</span></a>
            <a href="#/boutique/featured">boutique <span>✾</span></a>
          </section>

          <section className="home-web-card home-calendar-card">
            <div className="home-card-title">april 2006</div>
            <div className="home-calendar-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
            <div className="home-calendar-days">{Array.from({ length: 30 }, (_, index) => <span className={index + 1 === 18 ? 'today' : ''} key={index}>{index + 1}</span>)}</div>
          </section>

          <section className="home-web-card home-link-card">
            <div className="home-card-title">link me!</div>
            <div className="home-mini-button">❀ HANAMI HIGH ❀</div>
            <code>&lt;a href="hanami"&gt;...&lt;/a&gt;</code>
          </section>
        </aside>
      </div>
    </main>
  )
}
