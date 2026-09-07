import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { ApplicationReview, HanamiCharacter, StudentApplication } from '../types/database'

type EnrollmentApplicationProps = {
  character: HanamiCharacter
  application: StudentApplication
  onClose: () => void
}

type DraftState = {
  firstName: string
  lastName: string
  displayName: string
  nickname: string
  pronouns: string
  birthDate: string
  age: string
  schoolYear: string
  heightCm: string
  appearanceDescription: string
  distinguishingFeatures: string
  personality: string
  likes: string
  dislikes: string
  hobbies: string
  strengths: string
  weaknesses: string
  background: string
  attendanceReason: string
  familyInformation: string
  additionalNotes: string
  clubInterests: string
  electivePreference: string
  rulesRead: boolean
  seriousRpAck: boolean
  characterLimitAck: boolean
  deletionAck: boolean
}

const steps = [
  'Student Identity',
  'Appearance',
  'Personality',
  'Background',
  'School Interests',
  'Rules',
  'Review',
]

function initialDraft(character: HanamiCharacter, application: StudentApplication): DraftState {
  return {
    firstName: character.first_name ?? '',
    lastName: character.last_name ?? '',
    displayName: character.display_name ?? '',
    nickname: application.nickname ?? '',
    pronouns: application.pronouns ?? '',
    birthDate: application.birth_date ?? '',
    age: application.age?.toString() ?? '',
    schoolYear: application.school_year?.toString() ?? '',
    heightCm: application.height_cm?.toString() ?? '',
    appearanceDescription: application.appearance_description ?? '',
    distinguishingFeatures: application.distinguishing_features ?? '',
    personality: application.personality ?? '',
    likes: application.likes ?? '',
    dislikes: application.dislikes ?? '',
    hobbies: application.hobbies ?? '',
    strengths: application.strengths ?? '',
    weaknesses: application.weaknesses ?? '',
    background: application.background ?? '',
    attendanceReason: application.attendance_reason ?? '',
    familyInformation: application.family_information ?? '',
    additionalNotes: application.additional_notes ?? '',
    clubInterests: application.club_interests.join(', '),
    electivePreference: application.elective_preference ?? 'undecided',
    rulesRead: application.rules_read,
    seriousRpAck: application.serious_rp_ack,
    characterLimitAck: application.character_limit_ack,
    deletionAck: application.deletion_ack,
  }
}

function statusTitle(status: string) {
  switch (status) {
    case 'submitted': return 'Application Under Review'
    case 'denied': return 'Application Not Accepted'
    case 'accepted': return 'Application Accepted'
    default: return 'Student Enrollment'
  }
}

function statusCopy(status: string) {
  switch (status) {
    case 'submitted': return 'Your application is locked while Student Affairs reviews it. Any decision or requested changes will appear here.'
    case 'denied': return 'Student Affairs has closed this application. Review the decision below.'
    case 'accepted': return 'Your enrollment has been approved. Return to your character slots to open your acceptance letter.'
    default: return ''
  }
}

export function EnrollmentApplication({ character, application, onClose }: EnrollmentApplicationProps) {
  const { refreshIdentity } = useIdentity()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<DraftState>(() => initialDraft(character, application))
  const [reviews, setReviews] = useState<ApplicationReview[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Draft loaded')
  const [error, setError] = useState<string | null>(null)

  const editable = application.status === 'draft' || application.status === 'changes_requested'

  useEffect(() => {
    const client = supabase
    if (!client) return
    void client
      .from('application_reviews')
      .select('*')
      .eq('character_id', character.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: reviewError }) => {
        if (reviewError) setError(reviewError.message)
        else setReviews(data ?? [])
      })
  }, [character.id])

  const saveDraft = useCallback(async (quiet = false) => {
    const client = supabase
    if (!client || !editable) return false

    setSaving(true)
    if (!quiet) setSaveLabel('Saving…')
    setError(null)

    const clubInterests = draft.clubInterests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const [characterResult, applicationResult] = await Promise.all([
      client
        .from('characters')
        .update({
          first_name: draft.firstName.trim() || null,
          last_name: draft.lastName.trim() || null,
          display_name: draft.displayName.trim() || null,
        })
        .eq('id', character.id),
      client
        .from('student_applications')
        .update({
          school_year: draft.schoolYear ? Number(draft.schoolYear) : null,
          nickname: draft.nickname.trim() || null,
          pronouns: draft.pronouns.trim() || null,
          birth_date: draft.birthDate || null,
          age: draft.age ? Number(draft.age) : null,
          height_cm: draft.heightCm ? Number(draft.heightCm) : null,
          appearance_description: draft.appearanceDescription.trim() || null,
          distinguishing_features: draft.distinguishingFeatures.trim() || null,
          personality: draft.personality.trim() || null,
          likes: draft.likes.trim() || null,
          dislikes: draft.dislikes.trim() || null,
          hobbies: draft.hobbies.trim() || null,
          strengths: draft.strengths.trim() || null,
          weaknesses: draft.weaknesses.trim() || null,
          background: draft.background.trim() || null,
          attendance_reason: draft.attendanceReason.trim() || null,
          family_information: draft.familyInformation.trim() || null,
          additional_notes: draft.additionalNotes.trim() || null,
          club_interests: clubInterests,
          elective_preference: draft.electivePreference || 'undecided',
          rules_read: draft.rulesRead,
          serious_rp_ack: draft.seriousRpAck,
          character_limit_ack: draft.characterLimitAck,
          deletion_ack: draft.deletionAck,
        })
        .eq('character_id', character.id),
    ])

    setSaving(false)

    const saveError = characterResult.error ?? applicationResult.error
    if (saveError) {
      setError(saveError.message)
      setSaveLabel('Save failed')
      return false
    }

    setSaveLabel('Saved')
    return true
  }, [character.id, draft, editable])

  useEffect(() => {
    if (!editable) return
    const timer = window.setTimeout(() => {
      void saveDraft(true).then((saved) => {
        if (saved) setSaveLabel('Autosaved')
      })
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [draft, editable, saveDraft])

  const latestReview = reviews[0] ?? null

  const requiredComplete = useMemo(() => Boolean(
    draft.firstName.trim()
    && draft.lastName.trim()
    && draft.schoolYear
    && draft.age
    && draft.personality.trim()
    && draft.background.trim()
    && draft.rulesRead
    && draft.seriousRpAck
    && draft.characterLimitAck
    && draft.deletionAck
  ), [draft])

  async function saveAndExit() {
    const saved = await saveDraft()
    if (!saved) return
    await refreshIdentity()
    onClose()
  }

  async function submitApplication() {
    const client = supabase
    if (!client || !requiredComplete) return
    setSubmitting(true)
    setError(null)

    const saved = await saveDraft()
    if (!saved) {
      setSubmitting(false)
      return
    }

    const { error: submitError } = await client.rpc('submit_student_application', {
      p_character_id: character.id,
    })

    setSubmitting(false)
    if (submitError) {
      setError(submitError.message)
      return
    }

    await refreshIdentity()
    onClose()
  }

  function patch<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  if (!editable) {
    return (
      <main className="identity-screen enrollment-screen">
        <section className="identity-window enrollment-window">
          <header className="identity-titlebar">
            <span>HANAMI HIGH · OFFICE OF ADMISSIONS</span>
            <button type="button" onClick={onClose}>Return to Characters</button>
          </header>
          <div className="identity-body enrollment-status-body">
            <span className="eyebrow">APPLICATION STATUS</span>
            <h1>{statusTitle(application.status)}</h1>
            <p>{statusCopy(application.status)}</p>
            <div className={`application-status-stamp ${application.status}`}>{application.status.replace('_', ' ').toUpperCase()}</div>

            {reviews.length > 0 && (
              <section className="review-history">
                <h2>Student Affairs Notes</h2>
                {reviews.map((review) => (
                  <article key={review.id}>
                    <strong>{review.decision.replace('_', ' ')}</strong>
                    <p>{review.message}</p>
                    <time>{new Date(review.created_at).toLocaleDateString()}</time>
                  </article>
                ))}
              </section>
            )}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="identity-screen enrollment-screen">
      <section className="identity-window enrollment-window">
        <header className="identity-titlebar">
          <span>HANAMI HIGH · STUDENT ENROLLMENT</span>
          <button type="button" disabled={saving} onClick={() => void saveAndExit()}>{saving ? 'Saving…' : 'Save & Exit'}</button>
        </header>

        <div className="enrollment-layout">
          <aside className="enrollment-steps">
            <span className="eyebrow">APPLICATION FILE</span>
            <strong>Character Slot {character.slot_no}</strong>
            <div className="enrollment-step-list">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === step ? 'selected' : index < step ? 'complete' : ''}
                  onClick={() => setStep(index)}
                >
                  <span>{index < step ? '✓' : index + 1}</span>{label}
                </button>
              ))}
            </div>
            <div className="autosave-state">{saving ? 'Saving…' : saveLabel}</div>
          </aside>

          <div className="identity-body enrollment-form-area">
            {application.status === 'changes_requested' && latestReview && (
              <div className="changes-requested-banner">
                <strong>Changes Requested</strong>
                <p>{latestReview.message}</p>
              </div>
            )}
            {error && <div className="identity-notice error">{error}</div>}

            <div className="enrollment-step-heading">
              <span className="eyebrow">STEP {step + 1} OF {steps.length}</span>
              <h1>{steps[step]}</h1>
            </div>

            {step === 0 && (
              <div className="form-grid two-column">
                <label>First Name <b>*</b><input value={draft.firstName} onChange={(e) => patch('firstName', e.target.value)} /></label>
                <label>Last Name <b>*</b><input value={draft.lastName} onChange={(e) => patch('lastName', e.target.value)} /></label>
                <label>Display Name<input value={draft.displayName} onChange={(e) => patch('displayName', e.target.value)} /></label>
                <label>Nickname<input value={draft.nickname} onChange={(e) => patch('nickname', e.target.value)} /></label>
                <label>Pronouns<input value={draft.pronouns} onChange={(e) => patch('pronouns', e.target.value)} /></label>
                <label>Date of Birth<input type="date" value={draft.birthDate} onChange={(e) => patch('birthDate', e.target.value)} /></label>
                <label>Age <b>*</b><input type="number" min="14" max="19" value={draft.age} onChange={(e) => patch('age', e.target.value)} /></label>
                <label>School Year <b>*</b>
                  <select value={draft.schoolYear} onChange={(e) => patch('schoolYear', e.target.value)}>
                    <option value="">Select year</option><option value="1">First Year</option><option value="2">Second Year</option>
                  </select>
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="form-grid">
                <label>Height (cm)<input type="number" min="120" max="220" value={draft.heightCm} onChange={(e) => patch('heightCm', e.target.value)} /></label>
                <label>Appearance Description<textarea rows={6} value={draft.appearanceDescription} onChange={(e) => patch('appearanceDescription', e.target.value)} /></label>
                <label>Distinguishing Features<textarea rows={4} value={draft.distinguishingFeatures} onChange={(e) => patch('distinguishingFeatures', e.target.value)} /></label>
              </div>
            )}

            {step === 2 && (
              <div className="form-grid two-column">
                <label className="full-span">Personality <b>*</b><textarea rows={6} value={draft.personality} onChange={(e) => patch('personality', e.target.value)} /></label>
                <label>Likes<textarea rows={4} value={draft.likes} onChange={(e) => patch('likes', e.target.value)} /></label>
                <label>Dislikes<textarea rows={4} value={draft.dislikes} onChange={(e) => patch('dislikes', e.target.value)} /></label>
                <label>Hobbies<textarea rows={4} value={draft.hobbies} onChange={(e) => patch('hobbies', e.target.value)} /></label>
                <label>Strengths<textarea rows={4} value={draft.strengths} onChange={(e) => patch('strengths', e.target.value)} /></label>
                <label>Weaknesses<textarea rows={4} value={draft.weaknesses} onChange={(e) => patch('weaknesses', e.target.value)} /></label>
              </div>
            )}

            {step === 3 && (
              <div className="form-grid">
                <label>Character Background <b>*</b><textarea rows={8} value={draft.background} onChange={(e) => patch('background', e.target.value)} /></label>
                <label>Why are they attending Hanami High?<textarea rows={5} value={draft.attendanceReason} onChange={(e) => patch('attendanceReason', e.target.value)} /></label>
                <label>Family / Personal Information<textarea rows={5} value={draft.familyInformation} onChange={(e) => patch('familyInformation', e.target.value)} /></label>
                <label>Additional Notes<textarea rows={4} value={draft.additionalNotes} onChange={(e) => patch('additionalNotes', e.target.value)} /></label>
              </div>
            )}

            {step === 4 && (
              <div className="form-grid">
                <label>Club Interests
                  <input placeholder="Art Club, Music Club…" value={draft.clubInterests} onChange={(e) => patch('clubInterests', e.target.value)} />
                  <small>Interests do not guarantee placement. Separate multiple interests with commas.</small>
                </label>
                <label>Elective Preference
                  <select value={draft.electivePreference} onChange={(e) => patch('electivePreference', e.target.value)}>
                    <option value="undecided">Undecided</option><option value="art">Art</option><option value="computer">Computer Studies</option>
                  </select>
                </label>
              </div>
            )}

            {step === 5 && (
              <div className="rules-checklist">
                <label><input type="checkbox" checked={draft.rulesRead} onChange={(e) => patch('rulesRead', e.target.checked)} /><span><strong>I have read the Hanami High rules.</strong><small>School, community, and roleplay expectations apply to every character.</small></span></label>
                <label><input type="checkbox" checked={draft.seriousRpAck} onChange={(e) => patch('seriousRpAck', e.target.checked)} /><span><strong>I understand Hanami High uses serious roleplay standards.</strong><small>Character actions should remain consistent with the community's RP expectations.</small></span></label>
                <label><input type="checkbox" checked={draft.characterLimitAck} onChange={(e) => patch('characterLimitAck', e.target.checked)} /><span><strong>I understand every member has a maximum of two characters.</strong><small>Hanami+ cannot add more character slots.</small></span></label>
                <label><input type="checkbox" checked={draft.deletionAck} onChange={(e) => patch('deletionAck', e.target.checked)} /><span><strong>I understand permanent character deletion cannot be undone.</strong><small>Archiving will be recommended when a character is merely being retired.</small></span></label>
              </div>
            )}

            {step === 6 && (
              <div className="application-preview">
                <div className="preview-id-card">
                  <div className="slot-avatar">{(draft.displayName || `${draft.firstName} ${draft.lastName}`).trim().slice(0, 2).toUpperCase() || 'HH'}</div>
                  <div><span>STUDENT APPLICANT</span><h2>{draft.displayName || `${draft.firstName} ${draft.lastName}` || 'Unnamed Character'}</h2><p>{draft.schoolYear ? `${draft.schoolYear === '1' ? 'First' : 'Second'} Year` : 'Year not selected'} · Age {draft.age || '—'}</p></div>
                </div>
                <section><strong>Personality</strong><p>{draft.personality || 'Not completed.'}</p></section>
                <section><strong>Background</strong><p>{draft.background || 'Not completed.'}</p></section>
                <section><strong>School Interests</strong><p>{draft.clubInterests || 'No club interests listed.'} · {draft.electivePreference || 'undecided'}</p></section>
                <div className={`submission-readiness ${requiredComplete ? 'ready' : ''}`}>
                  <strong>{requiredComplete ? 'Ready to submit' : 'Required information is still missing'}</strong>
                  <span>First/last name, year, age, personality, background, and all four acknowledgements are required.</span>
                </div>
              </div>
            )}

            <footer className="enrollment-actions">
              <button className="secondary-action" type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>← Back</button>
              <button className="secondary-action" type="button" disabled={saving} onClick={() => void saveDraft()}>{saving ? 'Saving…' : 'Save Draft'}</button>
              {step < steps.length - 1 ? (
                <button className="primary-action" type="button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Continue →</button>
              ) : (
                <button className="primary-action" type="button" disabled={!requiredComplete || submitting} onClick={() => void submitApplication()}>{submitting ? 'Submitting…' : 'Submit Application'}</button>
              )}
            </footer>
          </div>
        </div>
      </section>
    </main>
  )
}
