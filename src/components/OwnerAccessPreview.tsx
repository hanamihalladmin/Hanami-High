import { useState } from 'react'
import { ApplicationReviewPanel } from './ApplicationReviewPanel'
import { NewStudentManagementPanel } from './NewStudentManagementPanel'
import { OwnerOperationsPanel } from './OwnerOperationsPanel'
import { useIdentity } from '../state/IdentityContext'

type OwnerWorkspace = 'admissions' | 'new-students' | 'operations'

export function OwnerAccessPreview() {
  const { account, characters, capabilities, exitOwnerMode, signOut } = useIdentity()
  const [workspace, setWorkspace] = useState<OwnerWorkspace>('operations')

  return (
    <main className="identity-screen owner-screen">
      <section className="identity-window owner-window">
        <header className="identity-titlebar">
          <span>OWNER CONSOLE · ACCOUNT MODE</span>
          <span>NO ACTIVE CHARACTER REQUIRED</span>
        </header>
        <div className="identity-body owner-body">
          <div className="owner-mode-banner">
            <strong>OWNER VIEW MODE</strong>
            <span>You are operating as the Hanami account owner, not as an RP character. Portal previews are read-only and clearly labeled.</span>
          </div>

          <div className="owner-summary-grid">
            <article>
              <span>ACCOUNT</span>
              <strong>{account?.discord_username || 'Connected owner'}</strong>
              <small>{account?.account_state || 'active'}</small>
            </article>
            <article>
              <span>OWN CHARACTERS</span>
              <strong>{characters.length} / 2</strong>
              <small>Owner access is independent of character slots.</small>
            </article>
            <article>
              <span>CAPABILITIES</span>
              <strong>{capabilities.length}</strong>
              <small>Account-level Owner permissions loaded from Supabase.</small>
            </article>
          </div>

          <nav className="owner-workspace-tabs" aria-label="Owner Console workspaces">
            <button className={workspace === 'admissions' ? 'active' : ''} onClick={() => setWorkspace('admissions')}>Admissions</button>
            <button className={workspace === 'new-students' ? 'active' : ''} onClick={() => setWorkspace('new-students')}>New Students</button>
            <button className={workspace === 'operations' ? 'active' : ''} onClick={() => setWorkspace('operations')}>Operations</button>
          </nav>

          {workspace === 'admissions' && <ApplicationReviewPanel />}
          {workspace === 'new-students' && <NewStudentManagementPanel />}
          {workspace === 'operations' && <OwnerOperationsPanel />}

          <div className="identity-actions owner-exit-actions">
            <button className="primary-action" type="button" onClick={exitOwnerMode}>Return to Characters</button>
            <button className="secondary-action" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      </section>
    </main>
  )
}
