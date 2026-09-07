export function ContextSidebar() {
  return (
    <aside className="context-sidebar">
      <section>
        <h3>ONLINE NOW — 12</h3>
        {['Yuki Tanaka', 'Mei Sato', 'Ren Ito', 'Ms. Aoki'].map((name, index) => (
          <div className="person-row" key={name}>
            <div className="mini-avatar">{name.split(' ').map((word) => word[0]).join('')}</div>
            <div><strong>{name}</strong><small>{index === 3 ? 'Faculty' : index === 2 ? 'Away' : 'Online'}</small></div>
            <span className={`status-dot ${index === 2 ? 'away' : 'online'}`} />
          </div>
        ))}
      </section>
      <section>
        <h3>COMING UP</h3>
        <article className="compact-event"><span>APR 21</span><strong>Art Club Exhibition</strong><small>After school · Art Room</small></article>
        <article className="compact-event"><span>APR 28</span><strong>Spring Festival</strong><small>Campus-wide event</small></article>
      </section>
    </aside>
  )
}
