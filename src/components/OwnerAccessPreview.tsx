import { ApplicationReviewPanel } from './ApplicationReviewPanel'
import { NewStudentManagementPanel } from './NewStudentManagementPanel'
import { useIdentity } from '../state/IdentityContext'

export function OwnerAccessPreview() {
  const { account, characters, capabilities, exitOwnerMode, signOut } = useIdentity()

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
            <span>You are operating as the Hanami account owner, not as an RP character.</span>
          </div>

          <div className="owner-summary-grid">
            <article>
              <span>ACCOUNT</span>
              <strong>{account?.discord_username || 'Connected owner'}</strong>
              <small>{account?.account_state || 'active'}</small>
            </article>
            <article>
              <span>CHARACTERS</span>
              <strong>{characters.length} / 2</strong>
              <small>Owner access is independent of these slots.</small>
            </article>
            <article>
              <span>CAPABILITIES</span>
              <strong>{capabilities.length}</strong>
              <small>Loaded from account-level platform roles.</small>
            </article>
          </div>

          <ApplicationReviewPanel />
          <NewStudentManagementPanel />

          <section className="owner-console-placeholder">
            <span className="eyebrow">OWNER FOUNDATION</span>
            <h1>More Owner modules will plug into this account mode.</h1>
            <p>
              Admissions and New Student promotion are now functional here. Portal preview, moderation, economy,
              school configuration, and the rest of the Owner Console will be added in their implementation phases
              without ever attaching Owner authority to an OC.
            </p>
          </section>

          <div className="identity-actions">
            <button className="primary-action" type="button" onClick={exitOwnerMode}>Return to Characters</button>
            <button className="secondary-action" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </div>
      </section>
    </main>
  )
}
