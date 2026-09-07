type Props = {
  active: string
}

const sectionCopy: Record<string, { eyebrow: string; title: string; links: string[] }> = {
  home: { eyebrow: 'HANAMI HIGH', title: 'Campus Network', links: ['Overview', 'Announcements', 'School Calendar', "Who's Online", 'My Schedule', 'My Classes', 'My Clubs'] },
  messages: { eyebrow: 'MESSAGES', title: 'Inbox', links: ['Friends', 'Message Requests', 'Direct Messages', 'Groups'] },
  social: { eyebrow: 'SOCIAL', title: 'Your Circle', links: ['Feed', 'Friends', 'Top Friends', 'Bulletins', 'Blogs', 'Guestbook Activity'] },
  academics: { eyebrow: 'ACADEMICS', title: 'Schoolwork', links: ['Overview', 'My Schedule', 'Classes', 'Assignments', 'Grades', 'Attendance'] },
  campus: { eyebrow: 'CAMPUS', title: 'After School', links: ['Campus Overview', 'Events', 'Clubs', 'Organizations', 'Opportunities', 'Student Council'] },
  profile: { eyebrow: 'PROFILE', title: 'Hana Mori', links: ['View Profile', 'Profile Studio', 'Blog', 'Guestbook', 'Saved Themes'] },
  discover: { eyebrow: 'DISCOVER', title: 'Search Hanami', links: ['Students', 'Faculty', 'Clubs', 'Posts', 'Events'] },
  petals: { eyebrow: 'PETALS', title: 'Your Wallet', links: ['Balance', 'Earning History', 'Rewards', 'Ways to Earn'] },
  boutique: { eyebrow: 'BOUTIQUE', title: 'Hanami Boutique', links: ['Featured', 'New', 'Seasonal', 'Frames', 'Effects', 'Nameplates', 'Hanami+ Passes', 'My Inventory'] },
  achievements: { eyebrow: 'ACHIEVEMENTS', title: 'Milestones', links: ['My Achievements', 'Collections', 'School History'] },
  settings: { eyebrow: 'SETTINGS', title: 'Hanami Settings', links: ['Account', 'Character', 'Privacy & Safety', 'Notifications', 'Accessibility', 'Connections'] },
}

export function SectionSidebar({ active }: Props) {
  const copy = sectionCopy[active] ?? sectionCopy.home
  return (
    <aside className="section-sidebar">
      <header className="section-header">
        <span className="eyebrow">{copy.eyebrow}</span>
        <strong>{copy.title}</strong>
      </header>
      <div className="sidebar-search">⌕ <span>Search this section</span></div>
      <nav className="section-links" aria-label={`${copy.title} navigation`}>
        {copy.links.map((link, index) => (
          <button className={index === 0 ? 'selected' : ''} key={link}>{link}</button>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="status-dot online" />
        <div><strong>Hanami Network</strong><small>12 students online</small></div>
      </div>
    </aside>
  )
}
