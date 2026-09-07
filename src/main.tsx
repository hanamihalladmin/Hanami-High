import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { IdentityProvider } from './state/IdentityContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/identity.css'
import './styles/enrollment.css'
import './styles/orientation.css'
import './styles/shell.css'
import './styles/profile-studio.css'
import './styles/profile-studio-enhancements.css'
import './styles/saved-themes.css'
import './styles/friends.css'
import './styles/top-friends.css'
import './styles/social-posts.css'
import './styles/social-interactions.css'
import './styles/guestbook.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IdentityProvider>
      <App />
    </IdentityProvider>
  </StrictMode>,
)
