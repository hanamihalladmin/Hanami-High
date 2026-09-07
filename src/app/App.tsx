import { useEffect, useMemo, useState } from 'react'
import { MainRail } from '../components/MainRail'
import { SectionSidebar } from '../components/SectionSidebar'
import { ContextSidebar } from '../components/ContextSidebar'
import { HomePreview } from '../components/HomePreview'
import { UserPanel } from '../components/UserPanel'
import { LoginScreen } from '../components/LoginScreen'
import { CharacterHub } from '../components/CharacterHub'
import { OwnerAccessPreview } from '../components/OwnerAccessPreview'
import { GlobalSearch } from '../components/GlobalSearch'
import { NotificationCenter } from '../components/NotificationCenter'
import { MobileSectionNav } from '../components/MobileSectionNav'
import { ShellPage } from '../components/ShellPage'
import { ProfileStudio } from '../components/ProfileStudio'
import { ProfileView } from '../components/ProfileView'
import { SavedThemes } from '../components/SavedThemes'
import { GuestbookPage } from '../components/GuestbookPage'
import { FriendsPage } from '../components/FriendsPage'
import { TopFriendsPage } from '../components/TopFriendsPage'
import { SocialPostsPage } from '../components/SocialPostsPage'
import { GuestbookActivityPage } from '../components/GuestbookActivityPage'
import { MessagesPage } from '../components/MessagesPage'
import { defaultRoute, routeFromHash, routeHash } from './navigation'
import { useIdentity } from '../state/IdentityContext'
import { useNotificationInbox } from '../hooks/useNotificationInbox'
import type { ShellRoute, ShellSectionId } from '../types/navigation'

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

function displayName(character: NonNullable<ReturnType<typeof useIdentity>['activeCharacter']>) {
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character ${character.slot_no}`
}

export function App() {
  const [route, setRoute] = useState<ShellRoute>(() => routeFromHash())
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { loading, session, account, activeCharacter, ownerMode, isOwner, error } = useIdentity()
  const notificationInbox = useNotificationInbox()

  useEffect(() => {
    const handleHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        setNotificationsOpen(false)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [])

  const profileTitle = useMemo(
    () => activeCharacter ? displayName(activeCharacter) : undefined,
    [activeCharacter],
  )

  function navigate(nextRoute: ShellRoute) {
    const nextHash = routeHash(nextRoute)
    setRoute(nextRoute)
    if (window.location.hash !== nextHash) window.location.hash = nextHash
  }

  function selectSection(section: ShellSectionId) {
    navigate(defaultRoute(section))
  }

  function selectSubsection(subsection: string) {
    navigate({ section: route.section, subsection })
  }

  function openSearch() {
    setSearchOpen(true)
    setNotificationsOpen(false)
  }

  function openNotifications() {
    setNotificationsOpen(true)
    setSearchOpen(false)
  }

  function renderPage() {
    const shared = {
      onSearch: openSearch,
      onNotifications: openNotifications,
      unreadCount: notificationInbox.unreadCount,
    }

    if (route.section === 'home' && route.subsection === 'overview') {
      return <HomePreview {...shared} />
    }
    if (route.section === 'profile' && route.subsection === 'profile-studio') {
      return <ProfileStudio {...shared} />
    }
    if (route.section === 'profile' && route.subsection === 'view-profile') {
      return <ProfileView targetCharacterId={route.targetId} {...shared} />
    }
    if (route.section === 'profile' && route.subsection === 'saved-themes') {
      return <SavedThemes {...shared} />
    }
    if (route.section === 'profile' && route.subsection === 'guestbook') {
      return <GuestbookPage targetEntryId={route.targetId} {...shared} />
    }
    if (route.section === 'social' && route.subsection === 'friends') {
      return <FriendsPage {...shared} />
    }
    if (route.section === 'social' && route.subsection === 'top-friends') {
      return <TopFriendsPage {...shared} />
    }
    if (route.section === 'social' && route.subsection === 'feed') {
      return <SocialPostsPage mode="feed" targetPostId={route.targetId} {...shared} />
    }
    if (route.section === 'social' && route.subsection === 'bulletins') {
      return <SocialPostsPage mode="bulletins" targetPostId={route.targetId} {...shared} />
    }
    if (route.section === 'social' && route.subsection === 'blogs') {
      return <SocialPostsPage mode="blogs" targetPostId={route.targetId} {...shared} />
    }
    if (route.section === 'social' && route.subsection === 'guestbook-activity') {
      return <GuestbookActivityPage {...shared} />
    }
    if (route.section === 'messages' && route.subsection === 'friends') {
      return <MessagesPage mode="friends" targetConversationId={route.targetId} {...shared} />
    }
    if (route.section === 'messages' && route.subsection === 'message-requests') {
      return <MessagesPage mode="message-requests" targetConversationId={route.targetId} {...shared} />
    }
    if (route.section === 'messages' && route.subsection === 'direct-messages') {
      return <MessagesPage mode="direct-messages" targetConversationId={route.targetId} {...shared} />
    }
    if (route.section === 'messages' && route.subsection === 'groups') {
      return <MessagesPage mode="groups" targetConversationId={route.targetId} {...shared} />
    }
    return <ShellPage route={route} {...shared} />
  }

  if (loading) return <LoadingScreen />
  if (!session) return <LoginScreen />
  if (error && !account) return <IdentityErrorScreen />
  if (!account) return <LoadingScreen />
  if (account.account_state === 'suspended' || account.account_state === 'archived') return <AccountStateScreen />
  if (ownerMode && isOwner) return <OwnerAccessPreview />
  if (!activeCharacter) return <CharacterHub />

  return (
    <>
      <div className="app-shell">
        <MainRail active={route.section} onSelect={selectSection} />
        <div className="sidebar-column">
          <SectionSidebar
            active={route.section}
            subsection={route.subsection}
            profileTitle={profileTitle}
            onSelect={selectSubsection}
            onSearch={openSearch}
          />
          <UserPanel />
        </div>

        <MobileSectionNav section={route.section} subsection={route.subsection} onSelect={selectSubsection} />
        {renderPage()}
        <ContextSidebar route={route} onSelect={selectSubsection} />
      </div>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigate}
      />
      <NotificationCenter
        open={notificationsOpen}
        notifications={notificationInbox.notifications}
        loading={notificationInbox.loading}
        error={notificationInbox.error}
        onClose={() => setNotificationsOpen(false)}
        onMarkRead={notificationInbox.markRead}
        onMarkAllRead={notificationInbox.markAllRead}
        onNavigate={navigate}
      />
    </>
  )
}
