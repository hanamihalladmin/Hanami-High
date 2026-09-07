import { useState } from 'react'
import { AcceptanceLetter } from './AcceptanceLetter'
import { EnrollmentApplication } from './EnrollmentApplication'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiCharacter, StudentApplication } from '../types/database'

function characterName(character: HanamiCharacter) {
  if (character.display_name) return character.display_name
  const fullName = [character.first_name, character.last_name].filter(Boolean).join(' ')
  return fullName || `Character Slot ${character.slot_no}`
}

function roleLabel(character: HanamiCharacter) {
  if (character.character_kind === 'faculty' && character.school_role === 'new_faculty') return 'New Teacher'
  if (character.character_kind === 'faculty' && (character.school_role === 'faculty' || character.school_role === null)) return 'Teacher'
  if (character.school_role === 'administration') return 'Staff'
  if (!character.school_role) return 'Applicant'
  return character.school_role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function statusCopy(character: HanamiCharacter, application: StudentApplication | null) {
  if (application?.status === 'accepted' && !application.acceptance_letter_opened_at) return 'Accepted — letter waiting'
  switch (character.character_state) {
    case 'draft': return 'Draft — ready for enrollment'
    case 'submitted': return 'Application under review'
    case 'changes_requested': return 'Student Affairs requested changes'
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

function actionLabel(character: HanamiCharacter, application: StudentApplication | null) {
  if (application?.status === 'accepted' && !application.acceptance_letter_opened_at) return 'Open Acceptance Letter →'
  switch (character.character_state) {
    case 'draft': return 'Continue Enrollment →'
    case 'changes_requested': return 'Revise Application →'
    case 'submitted': return 'View Application Status →'
    case 'denied': return 'View Decision →'
    case 'active': return 'Enter Hanami →'
    default: return 'Unavailable'
  }
}

export function CharacterHub() {
  const {
    account,
    characters,
    applications,
    createStudentSlot,
    selectCharacter,
    deleteCharacter,
    isOwner,
    isPlatformAdmin,
    enterOwnerMode,
    enterAdminMode,
    mutating,
    error,
    signOut,
  } = useIdentity()
  const [applicationCharacterId, setApplicationCharacterId] = useState<string | null>(null)
  const [letterCharacterId, setLetterCharacterId] = useState<string | null>(null)
  const [deleteCharacterId, setDeleteCharacterId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const applicationCharacter = characters.find((character) => character.id === applicationCharacterId) ?? null
  const selectedApplication = applications.find((application) => application.character_id === applicationCharacterId) ?? null
  if (applicationCharacter && selectedApplication) {
    return (
      <EnrollmentApplication
        character={applicationCharacter}
        application={selectedApplication}
        onClose={() => setApplicationCharacterId(null)}
      />
    )
  }

  const letterCharacter = characters.find((character) => character.id === letterCharacterId) ?? null
  const letterApplication = applications.find((application) => application.character_id === letterCharacterId) ?? null
  if (letterCharacter && letterApplication) {
    return (
      <AcceptanceLetter
        character={letterCharacter}
        application={letterApplication}
        onBack={() => setLetterCharacterId(null)}
      />
    )
  }

  const slots = ([1, 2] as const).map((slotNo) => ({
    slotNo,
    character: characters.find((character) => character.slot_no === slotNo) ?? null,
  }))
  const deleteTarget = characters.find((character) => character.id === deleteCharacterId) ?? null

  function handleCharacterAction(character: HanamiCharacter, application: StudentApplication | null) {
    if (application?.status === 'accepted' && !application.acceptance_letter_opened_at) {
      setLetterCharacterId(character.id)
      return
    }

    if (['draft', 'changes_requested', 'submitted', 'denied'].includes(character.character_state) && application) {
      setApplicationCharacterId(character.id)
      return
    }

    if (character.character_state === 'active') {
      void selectCharacter(character.id)
    }
  }

  function openDelete(characterId: string) {
    setDeleteCharacterId(characterId)
    setDeleteConfirmation('')
  }

  function closeDelete() {
    if (mutating) return
    setDeleteCharacterId(null)
    setDeleteConfirmation('')
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteConfirmation !== 'DELETE') return
    await deleteCharacter(deleteTarget.id, deleteConfirmation)
    setDeleteCharacterId(null)
    setDeleteConfirmation('')
  }

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
            {slots.map(({ slotNo, character }) => {
              const application = character
                ? applications.find((candidate) => candidate.character_id === character.id) ?? null
                : null
              const applicationState = Boolean(character && ['draft', 'changes_requested', 'submitted', 'denied'].includes(character.character_state))
              const actionable = character
                ? applicationState || character.character_state === 'active'
                : false
              const missingRequiredApplication = applicationState && !application

              return (
                <article className={`character-slot ${character ? 'occupied' : 'empty'}`} key={slotNo}>
                  <div className="slot-number">SLOT {slotNo}</div>
                  {character ? (
                    <>
                      <div className="slot-avatar">{characterName(character).slice(0, 2).toUpperCase()}</div>
                      <div className="slot-copy">
                        <h2>{characterName(character)}</h2>
                        <span>{roleLabel(character)}</span>
                        <small>{statusCopy(character, application)}</small>
                      </div>
                      <div className="character-slot-actions">
                        <button
                          className={character.character_state === 'active' ? 'primary-action' : 'secondary-action'}
                          type="button"
                          disabled={mutating || !actionable || missingRequiredApplication}
                          onClick={() => handleCharacterAction(character, application)}
                        >
                          {actionLabel(character, application)}
                        </button>
                        <button
                          className="character-delete-trigger"
                          type="button"
                          disabled={mutating}
                          onClick={() => openDelete(character.id)}
                        >
                          Delete Character
                        </button>
                      </div>
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
              )
            })}
          </div>

          <div className="character-deletion-note">
            <strong>Character deletion is permanent.</strong>
            <span>Deleting a character removes that character's profile, social history, submissions, memberships, and personal school records. Account-wide Petals, Hanami+, Boutique inventory, and account preferences are not deleted.</span>
          </div>

          {(isOwner || isPlatformAdmin) && (
            <section className="owner-entry-card">
              <div>
                <span className="eyebrow">ACCOUNT-LEVEL ACCESS</span>
                <h2>{isOwner && isPlatformAdmin ? 'Owner & Administrator Consoles' : isOwner ? 'Owner Console' : 'Administrator Console'}</h2>
                <p>Elevated platform access never requires an OC or an active character. Member mode remains separate from these consoles.</p>
              </div>
              <div className="identity-actions">
                {isOwner && <button type="button" onClick={enterOwnerMode}>Enter Owner Console →</button>}
                {isPlatformAdmin && <button type="button" onClick={enterAdminMode}>Enter Administrator Console →</button>}
              </div>
            </section>
          )}
        </div>
      </section>

      {deleteTarget && (
        <div className="character-delete-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDelete() }}>
          <section className="character-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="character-delete-title">
            <header>
              <div>
                <span className="eyebrow">PERMANENT CHARACTER DELETION</span>
                <h2 id="character-delete-title">Delete {characterName(deleteTarget)}?</h2>
              </div>
              <button type="button" disabled={mutating} onClick={closeDelete} aria-label="Close deletion dialog">×</button>
            </header>
            <div className="character-delete-warning">
              <strong>This cannot be undone.</strong>
              <p>The character in Slot {deleteTarget.slot_no}, their profile, posts, messages, friendships, class enrollments, submissions, achievements, club memberships, and other character-specific records will be permanently deleted.</p>
              <p>Shared Hanami school records created by the character may remain as unattributed institutional history so other students' grades, events, and school records are not destroyed.</p>
            </div>
            <label className="character-delete-confirmation">
              <span>Type <b>DELETE</b> to confirm</span>
              <input
                autoFocus
                autoComplete="off"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={mutating}
                placeholder="DELETE"
              />
            </label>
            <footer>
              <button className="secondary-action" type="button" disabled={mutating} onClick={closeDelete}>Cancel</button>
              <button className="character-delete-confirm" type="button" disabled={mutating || deleteConfirmation !== 'DELETE'} onClick={() => void confirmDelete()}>
                {mutating ? 'Deleting…' : 'Permanently Delete Character'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  )
}
