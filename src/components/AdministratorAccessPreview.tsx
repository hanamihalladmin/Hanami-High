import { useState } from 'react'
import { AdministratorOperationsPanel } from './AdministratorOperationsPanel'
import { ApplicationReviewPanel } from './ApplicationReviewPanel'
import { SchoolAdministrationPanel } from './SchoolAdministrationPanel'
import { useIdentity } from '../state/IdentityContext'

type AdminWorkspace = 'applications' | 'school' | 'operations'

export function AdministratorAccessPreview() {
  const { account, characters, capabilities, exitAdminMode, signOut } = useIdentity()
  const [workspace, setWorkspace] = useState<AdminWorkspace>('school')

  return (
    <main className="identity-screen owner-screen administrator-screen">
      <section className="identity-window owner-window">
        <header className="identity-titlebar"><span>ADMINISTRATOR CONSOLE · ACCOUNT MODE</span><span>NO ACTIVE CHARACTER REQUIRED</span></header>
        <div className="identity-body owner-body">
          <div className="owner-mode-banner administrator-mode-banner">
            <strong>ADMINISTRATOR MODE</strong>
            <span>You are operating with assigned Platform Administrator permissions. School Office actions use school.configure. Owner-only Student promotion, platform-role management, moderation authority, and audit access remain separate.</span>
          </div>

          <div className="owner-summary-grid">
            <article><span>ACCOUNT</span><strong>{account?.discord_username || 'Connected administrator'}</strong><small>{account?.account_state || 'active'}</small></article>
            <article><span>OWN CHARACTERS</span><strong>{characters.length} / 2</strong><small>Administrator access is independent of character slots.</small></article>
            <article><span>ADMIN CAPABILITIES</span><strong>{capabilities.length}</strong><small>Effective permissions loaded from Supabase.</small></article>
          </div>

          <nav className="owner-workspace-tabs" aria-label="Administrator Console workspaces">
            <button className={workspace === 'applications' ? 'active' : ''} onClick={() => setWorkspace('applications')}>Applications</button>
            <button className={workspace === 'school' ? 'active' : ''} onClick={() => setWorkspace('school')}>School Office</button>
            <button className={workspace === 'operations' ? 'active' : ''} onClick={() => setWorkspace('operations')}>Platform Administration</button>
          </nav>

          {workspace === 'applications' && <ApplicationReviewPanel />}
          {workspace === 'school' && <SchoolAdministrationPanel />}
          {workspace === 'operations' && <AdministratorOperationsPanel />}

          <div className="identity-actions owner-exit-actions">
            <button className="primary-action" type="button" onClick={exitAdminMode}>Return to Characters</button>
            <button className="secondary-action" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      </section>
    </main>
  )
}
