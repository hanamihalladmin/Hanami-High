import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RootApp } from './app/RootApp'
import { ProfileStudioTools } from './components/ProfileStudioTools'
import { IdentityProvider } from './state/IdentityContext'
import './styles/tokens.css'
import './styles/global.css'
import './styles/hanami-floral-theme.css'
import './styles/home-floral.css'
import './styles/identity.css'
import './styles/enrollment.css'
import './styles/orientation.css'
import './styles/shell.css'
import './styles/profile-studio.css'
import './styles/profile-studio-enhancements.css'
import './styles/discord-profile.css'
import './styles/hanami-profile.css'
import './styles/profile-display-styles.css'
import './styles/profile-studio-tools.css'
import './styles/profile-background-editor.css'
import './styles/saved-themes.css'
import './styles/friends.css'
import './styles/top-friends.css'
import './styles/social-posts.css'
import './styles/social-interactions.css'
import './styles/guestbook.css'
import './styles/guestbook-activity.css'
import './styles/messages.css'
import './styles/messages-discord.css'
import './styles/academics.css'
import './styles/academic-rooms.css'
import './styles/campus.css'
import './styles/utilities.css'
import './styles/rewards.css'
import './styles/boutique-animated-collections.css'
import './styles/settings.css'
import './styles/owner-operations.css'
import './styles/access-modes.css'
import './styles/early-web-site.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IdentityProvider>
      <RootApp />
      <ProfileStudioTools />
    </IdentityProvider>
  </StrictMode>,
)
