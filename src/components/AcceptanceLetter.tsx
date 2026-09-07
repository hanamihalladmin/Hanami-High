import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiCharacter, StudentApplication } from '../types/database'

type AcceptanceLetterProps = {
  character: HanamiCharacter
  application: StudentApplication
  onBack: () => void
}

function characterName(character: HanamiCharacter) {
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || 'Student'
}

export function AcceptanceLetter({ character, application, onBack }: AcceptanceLetterProps) {
  const { refreshIdentity, selectCharacter } = useIdentity()
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enterCampus() {
    const client = supabase
    if (!client) return
    setOpening(true)
    setError(null)

    const { error: letterError } = await client.rpc('mark_acceptance_letter_opened', {
      p_character_id: character.id,
    })

    if (letterError) {
      setError(letterError.message)
      setOpening(false)
      return
    }

    await refreshIdentity()
    await selectCharacter(character.id)
    setOpening(false)
  }

  return (
    <main className="identity-screen acceptance-screen">
      <section className="acceptance-envelope">
        <button className="acceptance-back" type="button" onClick={onBack}>← Character Selection</button>
        <article className="acceptance-letter">
          <header>
            <div className="acceptance-crest">花</div>
            <div>
              <span>HANAMI HIGH SCHOOL</span>
              <strong>花見高校</strong>
              <small>Office of Student Affairs</small>
            </div>
          </header>

          <div className="letter-rule" />
          <p>Dear {characterName(character)},</p>
          <p>
            We are pleased to inform you that your application for enrollment at Hanami High School
            has been accepted.
          </p>
          <p>
            You have been admitted as a <strong>{application.school_year === 1 ? 'First-Year' : 'Second-Year'} student</strong>
            {' '}for the 2006 academic year. Your student profile and campus access are now available;
            your homeroom and class schedule will be assigned through the school system.
          </p>
          <p>
            Upon entering the Hanami Network, you will be recognized as a <strong>New Student</strong>.
            Completing orientation will not remove that status. Student Affairs will promote you to Student
            when the Owner determines that your New Student period is complete.
          </p>
          <p className="letter-welcome">Welcome to Hanami High. 🌸</p>

          <footer>
            <span>Office of Student Affairs</span>
            <strong>Hanami High School</strong>
          </footer>

          {error && <div className="identity-notice error">{error}</div>}
          <button className="acceptance-enter" type="button" disabled={opening} onClick={() => void enterCampus()}>
            {opening ? 'Opening campus…' : 'Enter Hanami High →'}
          </button>
        </article>
      </section>
    </main>
  )
}
