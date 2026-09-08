import { AccountLockGate } from '../components/AccountLockGate'
import { AdministratorAccessPreview } from '../components/AdministratorAccessPreview'
import { useIdentity } from '../state/IdentityContext'
import { App } from './App'

export function RootApp() {
  const { adminMode, isPlatformAdmin, loading } = useIdentity()

  const content = !loading && adminMode && isPlatformAdmin
    ? <AdministratorAccessPreview />
    : <App />

  return <AccountLockGate>{content}</AccountLockGate>
}
