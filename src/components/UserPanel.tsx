export function UserPanel() {
  return (
    <div className="user-panel">
      <div className="avatar-placeholder">HM<span className="presence-dot" /></div>
      <div className="user-copy">
        <strong>Hana Mori</strong>
        <span>🌱 New Student</span>
      </div>
      <button title="Set status">◌</button>
      <button title="Settings">⚙</button>
    </div>
  )
}
