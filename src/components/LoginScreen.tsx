import { useState } from 'react'
import { useIdentity } from '../state/IdentityContext'

export function LoginScreen() {
  const { configured, signIn } = useIdentity()
  const [signingIn, setSigningIn] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSignIn() {
    setSigningIn(true)
    setLocalError(null)
    try {
      await signIn()
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Discord sign-in could not start.')
      setSigningIn(false)
    }
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
          <span className="eyebrow">PRIVATE CAMPUS NETWORK</span>
          <h1>Welcome to Hanami High.</h1>
          <p>
            Sign in with the Discord account connected to your Hanami membership. Your Discord account
            identifies the member; your Hanami character is selected after sign-in.
          </p>

          {!configured && (
            <div className="identity-notice warning">
              This build does not have its Supabase environment variables configured yet.
            </div>
          )}
          {localError && <div className="identity-notice error">{localError}</div>}

          <button
            className="discord-login-button"
            type="button"
            disabled={!configured || signingIn}
            onClick={handleSignIn}
          >
            <span>◈</span>
            {signingIn ? 'Opening Discord…' : 'Continue with Discord'}
          </button>

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
