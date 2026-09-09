import { useState } from 'react'
import { useIdentity } from '../state/IdentityContext'
import type { LoginIntent } from '../lib/supabase'

export function LoginScreen() {
  const { configured, signIn } = useIdentity()
  const [signingIn, setSigningIn] = useState<LoginIntent | null>(null)
  const [localError, setLocalError] = useState<string | null>(() => {
    const message = sessionStorage.getItem('hanami-access-error')
    if (message) sessionStorage.removeItem('hanami-access-error')
    return message
  })

  async function handleSignIn(intent: LoginIntent) {
    setSigningIn(intent)
    setLocalError(null)
    try {
      await signIn(intent)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Discord sign-in could not start.')
      setSigningIn(null)
    }
  }

  function openGuestView() {
    window.location.hash = '#/guest/home'
  }

  return (
    <main className="identity-screen">
      <section className="identity-window login-window">
        <header className="identity-titlebar">
          <span>HANAMI HIGH NETWORK</span>
          <span>花見高校 · 2006</span>
        </header>
        <div className="identity-body login-body">
          <div className="login-mark">花</div>
          <span className="eyebrow">HANAMI HIGH SCHOOL NETWORK</span>
          <h1>Welcome to Hanami High.</h1>
          <p>
            Browse the public school network as a Guest without signing in, or authenticate through Discord for
            Member, Owner, or Administrator access. Account-level access is granted only to Discord accounts with
            the matching platform role.
          </p>

          {!configured && (
            <div className="identity-notice warning">
              Member sign-in is unavailable because this build does not have its Supabase environment variables configured yet.
              Guest View can still open the public shell, but live public data also requires the configured production backend.
            </div>
          )}
          {localError && <div className="identity-notice error">{localError}</div>}

          <div className="login-choice-stack">
            <button
              className="discord-login-button guest-login-button"
              type="button"
              disabled={Boolean(signingIn)}
              onClick={openGuestView}
            >
              <span>✿</span>
              Guest View
            </button>

            <button
              className="discord-login-button member-login-button"
              type="button"
              disabled={!configured || Boolean(signingIn)}
              onClick={() => void handleSignIn('member')}
            >
              <span>◈</span>
              {signingIn === 'member' ? 'Opening Discord…' : 'Member Login'}
            </button>

            <button
              className="discord-login-button owner-login-button"
              type="button"
              disabled={!configured || Boolean(signingIn)}
              onClick={() => void handleSignIn('owner')}
            >
              <span>◆</span>
              {signingIn === 'owner' ? 'Opening Owner Login…' : 'Owner Login'}
            </button>

            <button
              className="discord-login-button administrator-login-button"
              type="button"
              disabled={!configured || Boolean(signingIn)}
              onClick={() => void handleSignIn('administrator')}
            >
              <span>▣</span>
              {signingIn === 'administrator' ? 'Opening Administrator Login…' : 'Administrator Login'}
            </button>
          </div>

          <div className="login-access-note">
            <span><strong>Guest</strong> sees only the public school network and public Search.</span>
            <span><strong>Member</strong> uses your character slots.</span>
            <span><strong>Owner</strong> is account-level and requires no character.</span>
            <span><strong>Administrator</strong> opens platform administration with assigned admin permissions.</span>
          </div>

          <div className="login-rules">
            <span>1 Discord member</span>
            <span>1 Hanami account</span>
            <span>2 character slots maximum</span>
          </div>
        </div>
      </section>
    </main>
  )
}
