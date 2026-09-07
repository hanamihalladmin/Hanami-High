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

          <section className="owner-console-placeholder">
            <span className="eyebrow">PHASE 2 VERIFIED</span>
            <h1>Owner access is active without an OC.</h1>
            <p>
              Full Owner Console modules will be added in the staff-system phase. The identity and permission
              boundary is already live, so portal preview, promotions, moderation, and administration can be
              built without attaching Owner authority to a character.
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
