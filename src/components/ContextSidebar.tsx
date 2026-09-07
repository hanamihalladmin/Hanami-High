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

function roleLabel(role: string | null) {
  if (!role) return 'Student'
  return role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function ContextSidebar({ route, onSelect }: Props) {
  const { activeCharacter } = useIdentity()
  const section = sectionById[route.section]
  const current = section.subsections.find((item) => item.id === route.subsection) ?? section.subsections[0]
  const nearby = section.subsections.filter((item) => item.id !== current.id).slice(0, 4)

  return (
    <aside className="context-sidebar">
      <section>
        <h3>YOU ARE HERE</h3>
        <article className="context-current-card">
          <span>{section.label}</span>
          <strong>{current.label}</strong>
          <small>{current.description}</small>
        </article>
      </section>

      {nearby.length > 0 && (
        <section>
          <h3>IN THIS SECTION</h3>
          <div className="context-link-list">
            {nearby.map((item) => (
              <button type="button" key={item.id} onClick={() => onSelect(item.id)}>
                <strong>{item.label}</strong><span>→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeCharacter && (
        <section>
          <h3>CURRENT IDENTITY</h3>
          <div className="context-identity-card">
            <div className="mini-avatar">{characterName(activeCharacter).slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{characterName(activeCharacter)}</strong>
              <small>{roleLabel(activeCharacter.school_role)} · Slot {activeCharacter.slot_no}</small>
            </div>
          </div>
        </section>
      )}
    </aside>
  )
}
