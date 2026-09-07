import { useIdentity } from '../state/IdentityContext'
import type { HanamiCharacter } from '../types/database'

function characterName(character: HanamiCharacter) {
  if (character.display_name) return character.display_name
  const fullName = [character.first_name, character.last_name].filter(Boolean).join(' ')
  return fullName || `Character Slot ${character.slot_no}`
}

function roleLabel(character: HanamiCharacter) {
  if (!character.school_role) return 'Applicant Draft'
  return character.school_role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function statusCopy(character: HanamiCharacter) {
  switch (character.character_state) {
    case 'draft': return 'Draft — ready for enrollment'
    case 'submitted': return 'Application submitted'
    case 'changes_requested': return 'Changes requested'
    case 'denied': return 'Application not accepted'
    case 'accepted': return 'Accepted — activation pending'
    case 'active': return 'Campus access active'
    case 'inactive': return 'Character inactive'
    case 'graduated': return 'Graduated'
    case 'archived': return 'Archived'
    case 'suspended': return 'Character suspended'
    default: return character.character_state
  }
}

export function CharacterHub() {
  const {
    account,
    characters,
    createStudentSlot,
    selectCharacter,
    isOwner,
    enterOwnerMode,
    mutating,
    error,
    signOut,
  } = useIdentity()

  const slots = ([1, 2] as const).map((slotNo) => ({
    slotNo,
    character: characters.find((character) => character.slot_no === slotNo) ?? null,
  }))

  return (
    <main className="identity-screen character-screen">
      <section className="identity-window character-window">
        <header className="identity-titlebar">
          <span>SELECT HANAMI IDENTITY</span>
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </header>

        <div className="identity-body">
          <div className="character-heading">
            <div>
              <span className="eyebrow">HANAMI ACCOUNT</span>
              <h1>Who are you entering campus as?</h1>
              <p>Your selected character stays active until you switch characters or sign out.</p>
            </div>
            <div className="discord-account-card">
              <span>DISCORD MEMBER</span>
              <strong>{account?.discord_username || 'Connected account'}</strong>
              <small>{characters.length} / 2 character slots used</small>
            </div>
          </div>

          {error && <div className="identity-notice error">{error}</div>}

          <div className="character-slot-grid">
            {slots.map(({ slotNo, character }) => (
              <article className={`character-slot ${character ? 'occupied' : 'empty'}`} key={slotNo}>
                <div className="slot-number">SLOT {slotNo}</div>
                {character ? (
                  <>
                    <div className="slot-avatar">{characterName(character).slice(0, 2).toUpperCase()}</div>
                    <div className="slot-copy">
                      <h2>{characterName(character)}</h2>
                      <span>{roleLabel(character)}</span>
                      <small>{statusCopy(character)}</small>
                    </div>
                    {character.character_state === 'active' ? (
                      <button
                        className="primary-action"
                        type="button"
                        disabled={mutating}
                        onClick={() => void selectCharacter(character.id)}
                      >
                        Enter Hanami →
                      </button>
                    ) : (
                      <button className="secondary-action" type="button" disabled>
                        {character.character_state === 'draft' || character.character_state === 'changes_requested'
                          ? 'Enrollment form next'
                          : 'Unavailable'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="empty-slot-mark">＋</div>
                    <div className="slot-copy">
                      <h2>Empty Character Slot</h2>
                      <span>Student character</span>
                      <small>Each member may have no more than two characters.</small>
                    </div>
                    <button
                      className="primary-action"
                      type="button"
                      disabled={mutating}
                      onClick={() => void createStudentSlot(slotNo)}
                    >
                      Create Student Character
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>

          {isOwner && (
            <section className="owner-entry-card">
              <div>
                <span className="eyebrow">ACCOUNT-LEVEL ACCESS</span>
                <h2>Owner Console</h2>
                <p>Owner access never requires an OC or an active character.</p>
              </div>
              <button type="button" onClick={enterOwnerMode}>Enter Owner Console →</button>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}
