import { AdministratorAccessPreview } from '../components/AdministratorAccessPreview'
import { useIdentity } from '../state/IdentityContext'
import { App } from './App'

export function RootApp() {
  const { adminMode, isPlatformAdmin, loading } = useIdentity()

  if (!loading && adminMode && isPlatformAdmin) {
    return <AdministratorAccessPreview />
  }

  return <App />
}
