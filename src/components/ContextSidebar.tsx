import { sectionById } from '../app/navigation'
import { useIdentity } from '../state/IdentityContext'
import type { ShellRoute } from '../types/navigation'

type Props = {
  route: ShellRoute
  onSelect: (subsection: string) => void
}

function characterName(character: NonNullable<ReturnType<typeof useIdentity>['activeCharacter']>) {
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character ${character.slot_no}`
}

function roleLabel(character: NonNullable<ReturnType<typeof useIdentity>['activeCharacter']>) {
  if (character.character_kind === 'faculty' && character.school_role === 'new_faculty') return 'New Teacher'
  if (character.character_kind === 'faculty' && (character.school_role === 'faculty' || character.school_role === null)) return 'Teacher'
  if (character.school_role === 'administration') return 'Staff'
  if (!character.school_role) return character.character_kind === 'student' ? 'Student' : 'Applicant'
  return character.school_role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'H'
}

export function ContextSidebar({ route, onSelect }: Props) {
  const { activeCharacter } = useIdentity()
  const section = sectionById[route.section]
  const current = section.subsections.find((item) => item.id === route.subsection) ?? section.subsections[0]
  const nearby = section.subsections.filter((item) => item.id !== current.id).slice(0, 4)
  const activeName = activeCharacter ? characterName(activeCharacter) : ''

  return (
    <aside className="context-sidebar">
      <section className="context-activity-section">
        <h3>ACTIVITY</h3>
        <article className="context-activity-card">
          <div className="context-activity-art">花</div>
          <div>
            <strong>{current.label}</strong>
            <span>{section.label}</span>
            <small>{current.description}</small>
          </div>
        </article>
      </section>

      {activeCharacter && (
        <section>
          <h3>ONLINE — 1</h3>
          <a className="context-member-row" href={`#/profile/view-profile/${encodeURIComponent(activeCharacter.id)}`}>
            <span className="context-member-avatar">{initials(activeName)}<i /></span>
            <span><strong>{activeName}</strong><small>{roleLabel(activeCharacter)}</small></span>
          </a>
        </section>
      )}

      {nearby.length > 0 && (
        <section>
          <h3>QUICK ACCESS</h3>
          <div className="context-link-list">
            {nearby.map((item) => (
              <button type="button" key={item.id} onClick={() => onSelect(item.id)} title={item.description}>
                <span aria-hidden="true">#</span><strong>{item.label}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="context-network-status">
        <h3>HANAMI HIGH</h3>
        <div><span className="status-dot online" /><strong>Campus Network</strong></div>
        <small>School year 2006 · connected</small>
      </section>
    </aside>
  )
}
