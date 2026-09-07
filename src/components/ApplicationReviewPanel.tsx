import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiCharacter, StudentApplication } from '../types/database'

type Decision = 'changes_requested' | 'accepted' | 'denied'

function characterName(character: HanamiCharacter | undefined) {
  if (!character) return 'Unknown Character'
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character Slot ${character.slot_no}`
}

export function ApplicationReviewPanel() {
  const { account, capabilities, refreshIdentity } = useIdentity()
  const [applications, setApplications] = useState<StudentApplication[]>([])
  const [characters, setCharacters] = useState<HanamiCharacter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canReview = capabilities.includes('characters.review')

  const loadQueue = useCallback(async () => {
    const client = supabase
    if (!client || !canReview) return
    setLoading(true)
    setError(null)

    const [applicationResult, characterResult] = await Promise.all([
      client
        .from('student_applications')
        .select('*')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true }),
      client.from('characters').select('*'),
    ])

    setLoading(false)
    if (applicationResult.error || characterResult.error) {
      setError(applicationResult.error?.message || characterResult.error?.message || 'Review queue could not be loaded.')
      return
    }

    setApplications(applicationResult.data ?? [])
    setCharacters(characterResult.data ?? [])
    setSelectedId((current) => {
      if (current && applicationResult.data?.some((application) => application.character_id === current)) return current
      return applicationResult.data?.[0]?.character_id ?? null
    })
  }, [canReview])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const selectedApplication = useMemo(
    () => applications.find((application) => application.character_id === selectedId) ?? null,
    [applications, selectedId],
  )
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedId),
    [characters, selectedId],
  )

  async function makeDecision(decision: Decision) {
    const client = supabase
    if (!client || !account || !selectedApplication || !message.trim()) return
    setDeciding(true)
    setError(null)

    const { error: decisionError } = await client.from('application_reviews').insert({
      character_id: selectedApplication.character_id,
      reviewer_account_id: account.id,
      decision,
      message: message.trim(),
    })

    setDeciding(false)
    if (decisionError) {
      setError(decisionError.message)
      return
    }

    setMessage('')
    await Promise.all([loadQueue(), refreshIdentity()])
  }

  if (!canReview) return null

  return (
    <section className="application-review-console">
      <header>
        <div>
          <span className="eyebrow">STUDENT AFFAIRS</span>
          <h2>Application Review</h2>
        </div>
        <span className="review-count">{applications.length} PENDING</span>
      </header>

      {error && <div className="identity-notice error">{error}</div>}

      {loading ? (
        <div className="review-empty">Loading submitted applications…</div>
      ) : applications.length === 0 ? (
        <div className="review-empty">No student applications are waiting for review.</div>
      ) : (
        <div className="review-console-layout">
          <aside className="review-queue">
            {applications.map((application) => {
              const character = characters.find((candidate) => candidate.id === application.character_id)
              return (
                <button
                  type="button"
                  key={application.character_id}
                  className={selectedId === application.character_id ? 'selected' : ''}
                  onClick={() => {
                    setSelectedId(application.character_id)
                    setMessage('')
                  }}
                >
                  <strong>{characterName(character)}</strong>
                  <span>{application.school_year === 1 ? 'First Year' : 'Second Year'} · Age {application.age ?? '—'}</span>
                  <small>{application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Submitted'}</small>
                </button>
              )
            })}
          </aside>

          {selectedApplication && (
            <article className="review-dossier">
              <div className="review-dossier-title">
                <div className="slot-avatar">{characterName(selectedCharacter).slice(0, 2).toUpperCase()}</div>
                <div>
                  <span>STUDENT APPLICANT</span>
                  <h3>{characterName(selectedCharacter)}</h3>
                  <p>{selectedApplication.school_year === 1 ? 'First Year' : 'Second Year'} · Age {selectedApplication.age ?? '—'} · {selectedApplication.pronouns || 'No pronouns listed'}</p>
                </div>
              </div>

              <div className="dossier-grid">
                <section><strong>Appearance</strong><p>{selectedApplication.appearance_description || 'Not provided.'}</p></section>
                <section><strong>Personality</strong><p>{selectedApplication.personality || 'Not provided.'}</p></section>
                <section className="wide"><strong>Background</strong><p>{selectedApplication.background || 'Not provided.'}</p></section>
                <section><strong>Strengths</strong><p>{selectedApplication.strengths || 'Not provided.'}</p></section>
                <section><strong>Weaknesses</strong><p>{selectedApplication.weaknesses || 'Not provided.'}</p></section>
                <section className="wide"><strong>Why Hanami High?</strong><p>{selectedApplication.attendance_reason || 'Not provided.'}</p></section>
                <section><strong>Club Interests</strong><p>{selectedApplication.club_interests.join(', ') || 'None listed.'}</p></section>
                <section><strong>Elective</strong><p>{selectedApplication.elective_preference || 'Undecided'}</p></section>
              </div>

              <div className="review-acknowledgements">
                <span>✓ Rules acknowledged</span><span>✓ Serious RP acknowledged</span><span>✓ Two-character limit acknowledged</span><span>✓ Deletion permanence acknowledged</span>
              </div>

              <label className="review-message-label">
                Student Affairs message <b>*</b>
                <textarea
                  rows={5}
                  value={message}
                  placeholder="Explain requested changes, the decision, or leave an acceptance note…"
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>

              <div className="review-actions">
                <button type="button" disabled={deciding || !message.trim()} onClick={() => void makeDecision('changes_requested')}>Request Changes</button>
                <button className="accept" type="button" disabled={deciding || !message.trim()} onClick={() => void makeDecision('accepted')}>Accept → New Student</button>
                <button className="deny" type="button" disabled={deciding || !message.trim()} onClick={() => void makeDecision('denied')}>Deny</button>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  )
}
