import { useState } from 'react'
import { MainRail } from '../components/MainRail'
import { SectionSidebar } from '../components/SectionSidebar'
import { ContextSidebar } from '../components/ContextSidebar'
import { HomePreview } from '../components/HomePreview'
import { UserPanel } from '../components/UserPanel'
import { LoginScreen } from '../components/LoginScreen'
import { CharacterHub } from '../components/CharacterHub'
import { OwnerAccessPreview } from '../components/OwnerAccessPreview'
import { useIdentity } from '../state/IdentityContext'

function LoadingScreen() {
  return (
    <main className="identity-loading">
      <div className="identity-loading-box">
        <strong>Opening Hanami High…</strong>
        <span>Checking your account and character session.</span>
      </div>
    </main>
  )
}

function AccountStateScreen() {
  const { account, signOut } = useIdentity()

  return (
    <main className="identity-screen">
      <section className="identity-window login-window">
        <header className="identity-titlebar"><span>HANAMI ACCOUNT</span><span>ACCESS NOTICE</span></header>
        <div className="identity-body login-body">
          <span className="eyebrow">ACCOUNT STATUS</span>
          <h1>Campus access is unavailable.</h1>
          <p>Your Hanami account is currently marked as <strong>{account?.account_state}</strong>.</p>
          <button className="secondary-action" type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </section>
    </main>
  )
}

function IdentityErrorScreen() {
  const { error, signOut, refreshIdentity } = useIdentity()

  return (
    <main className="identity-screen">
      <section className="identity-window login-window">
        <header className="identity-titlebar"><span>HANAMI HIGH NETWORK</span><span>ACCOUNT ERROR</span></header>
        <div className="identity-body login-body">
          <span className="eyebrow">WE COULDN'T OPEN YOUR ACCOUNT</span>
          <h1>Hanami needs another try.</h1>
          <div className="identity-notice error">{error || 'Unknown identity error.'}</div>
          <div className="identity-actions">
            <button className="primary-action" type="button" onClick={() => void refreshIdentity()}>Try again</button>
            <button className="secondary-action" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      </section>
    </main>
  )
}

export function App() {
  const [active, setActive] = useState('home')
  const { loading, session, account, activeCharacter, ownerMode, isOwner, error } = useIdentity()

  if (loading) return <LoadingScreen />
  if (!session) return <LoginScreen />
  if (error && !account) return <IdentityErrorScreen />
  if (!account) return <LoadingScreen />
  if (account.account_state === 'suspended' || account.account_state === 'archived') return <AccountStateScreen />
  if (ownerMode && isOwner) return <OwnerAccessPreview />
  if (!activeCharacter) return <CharacterHub />

  return (
    <div className="app-shell">
      <MainRail active={active} onSelect={setActive} />
      <div className="sidebar-column">
        <SectionSidebar active={active} />
        <UserPanel />
      </div>
      <HomePreview />
      <ContextSidebar />
    </div>
  )
}
