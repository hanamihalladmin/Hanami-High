import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { IdentityProvider } from './state/IdentityContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/identity.css'
import './styles/enrollment.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IdentityProvider>
      <App />
    </IdentityProvider>
  </StrictMode>,
)
