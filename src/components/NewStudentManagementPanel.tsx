import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterOrientation, HanamiCharacter } from '../types/database'

function characterName(character: HanamiCharacter) {
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character Slot ${character.slot_no}`
}

export function NewStudentManagementPanel() {
  const { account, capabilities, refreshIdentity } = useIdentity()
  const [students, setStudents] = useState<HanamiCharacter[]>([])
  const [orientations, setOrientations] = useState<CharacterOrientation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canPromote = capabilities.includes('students.promote')

  const loadStudents = useCallback(async () => {
    const client = supabase
    if (!client || !canPromote) return
    setLoading(true)
    setError(null)

    const [characterResult, orientationResult] = await Promise.all([
      client.from('characters').select('*').eq('school_role', 'new_student').order('created_at', { ascending: true }),
      client.from('character_orientations').select('*'),
    ])

    setLoading(false)
    if (characterResult.error || orientationResult.error) {
      setError(characterResult.error?.message || orientationResult.error?.message || 'New Student list could not be loaded.')
      return
    }

    setStudents(characterResult.data ?? [])
    setOrientations(orientationResult.data ?? [])
    setSelectedId((current) => {
      if (current && characterResult.data?.some((character) => character.id === current)) return current
      return characterResult.data?.[0]?.id ?? null
    })
  }, [canPromote])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  const selected = useMemo(
    () => students.find((student) => student.id === selectedId) ?? null,
    [selectedId, students],
  )
  const selectedOrientation = useMemo(
    () => orientations.find((orientation) => orientation.character_id === selectedId) ?? null,
    [orientations, selectedId],
  )

  async function promoteStudent() {
    const client = supabase
    if (!client || !account || !selected) return
    setPromoting(true)
    setError(null)

    const { error: promotionError } = await client.from('student_status_actions').insert({
      character_id: selected.id,
      actor_account_id: account.id,
      note: note.trim() || null,
    })

    setPromoting(false)
    if (promotionError) {
      setError(promotionError.message)
      return
    }

    setNote('')
    await Promise.all([loadStudents(), refreshIdentity()])
  }

  if (!canPromote) return null

  return (
    <section className="new-student-console">
      <header>
        <div><span className="eyebrow">STUDENT STATUS</span><h2>New Student Management</h2></div>
        <span className="review-count">{students.length} NEW</span>
      </header>

      {error && <div className="identity-notice error">{error}</div>}

      {loading ? (
        <div className="review-empty">Loading New Students…</div>
      ) : students.length === 0 ? (
        <div className="review-empty">There are no New Students awaiting an Owner promotion decision.</div>
      ) : (
        <div className="new-student-layout">
          <aside className="new-student-list">
            {students.map((student) => {
              const orientation = orientations.find((candidate) => candidate.character_id === student.id)
              return (
                <button
                  type="button"
                  key={student.id}
                  className={student.id === selectedId ? 'selected' : ''}
                  onClick={() => {
                    setSelectedId(student.id)
                    setNote('')
                  }}
                >
                  <strong>{characterName(student)}</strong>
                  <span>🌱 New Student</span>
                  <small>{orientation?.completed_at ? '✓ Orientation complete' : '○ Orientation in progress'}</small>
                </button>
              )
            })}
          </aside>

          {selected && (
            <article className="promotion-card">
              <span className="tag">🌱 NEW STUDENT</span>
              <h3>{characterName(selected)}</h3>
              <p>
                Orientation: <strong>{selectedOrientation?.completed_at ? 'Complete' : 'In progress'}</strong>
                {' · '}Track: <strong>{selectedOrientation?.track || '—'}</strong>
              </p>
              <div className="promotion-rule">
                Orientation completion does not change this role. Only the Owner action below promotes this character.
              </div>
              <label>
                Promotion note (optional)
                <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal note about the promotion…" />
              </label>
              <button className="promote-button" type="button" disabled={promoting} onClick={() => void promoteStudent()}>
                {promoting ? 'Promoting…' : 'Promote New Student → Student'}
              </button>
            </article>
          )}
        </div>
      )}
    </section>
  )
}
