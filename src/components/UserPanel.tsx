import { useIdentity } from '../state/IdentityContext'
import type { HanamiCharacter } from '../types/database'

function characterName(character: HanamiCharacter) {
  if (character.display_name) return character.display_name
  const fullName = [character.first_name, character.last_name].filter(Boolean).join(' ')
  return fullName || `Character Slot ${character.slot_no}`
}

function roleLabel(character: HanamiCharacter) {
  if (character.character_kind === 'faculty' && character.school_role === 'new_faculty') return 'New Teacher'
  if (character.character_kind === 'faculty' && (character.school_role === 'faculty' || character.school_role === null)) return 'Teacher'
  if (character.school_role === 'administration') return 'Staff (future portal)'
  if (!character.school_role) return 'Applicant'
  return character.school_role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function UserPanel() {
  const {
    activeCharacter,
    characters,
    selectCharacter,
    clearActiveCharacter,
    isOwner,
    enterOwnerMode,
    signOut,
    mutating,
  } = useIdentity()

  if (!activeCharacter) return null

  const name = characterName(activeCharacter)
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="user-panel">
      <div className="avatar-placeholder">{initials}<span className="presence-dot" /></div>
      <div className="user-copy">
        <strong>{name}</strong>
        <span>{activeCharacter.school_role === 'new_student' ? '🌱 ' : '🌸 '}{roleLabel(activeCharacter)}</span>
      </div>

      <details className="user-menu">
        <summary title="Character and account menu">•••</summary>
        <div className="user-menu-popover">
          <span className="user-menu-label">SWITCH CHARACTER</span>
          {characters.map((character) => (
            <button
              key={character.id}
              type="button"
              disabled={mutating || character.character_state !== 'active' || character.id === activeCharacter.id}
              onClick={() => void selectCharacter(character.id)}
            >
              {character.id === activeCharacter.id ? '✓ ' : ''}{characterName(character)}
              {' · '}{character.character_state === 'active' ? roleLabel(character) : character.character_state}
            </button>
          ))}
          <button type="button" disabled={mutating} onClick={() => void clearActiveCharacter()}>
            Character selection…
          </button>
          {isOwner && (
            <>
              <div className="user-menu-rule" />
              <span className="user-menu-label">OWNER</span>
              <button type="button" onClick={enterOwnerMode}>Open Owner Console</button>
            </>
          )}
          <div className="user-menu-rule" />
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </details>
    </div>
  )
}
