import { useEffect, useRef, useState } from 'react'
import { MemberProfilePopover } from './MemberProfilePopover'

const profilePrefix = '#/profile/view-profile/'

function isMessagesRoute(hash: string) {
  return hash === '#/messages' || hash.startsWith('#/messages/')
}

function characterIdFromProfileHash(hash: string) {
  if (!hash.startsWith(profilePrefix)) return null
  const encoded = hash.slice(profilePrefix.length).split('/')[0]
  if (!encoded) return null
  try { return decodeURIComponent(encoded) } catch { return encoded }
}

export function MemberProfileNavigationBridge() {
  const [characterId, setCharacterId] = useState<string | null>(null)
  const lastHash = useRef(window.location.hash)
  const allowNextFullProfile = useRef(false)

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-member-full-profile="true"]')) {
        allowNextFullProfile.current = true
        setCharacterId(null)
      }
    }

    const handleHashChange = () => {
      const previous = lastHash.current
      const next = window.location.hash

      if (allowNextFullProfile.current && next.startsWith(profilePrefix)) {
        allowNextFullProfile.current = false
        lastHash.current = next
        return
      }

      const nextCharacterId = characterIdFromProfileHash(next)
      if (isMessagesRoute(previous) && nextCharacterId) {
        setCharacterId(nextCharacterId)
        const restoredUrl = `${window.location.pathname}${window.location.search}${previous}`
        window.history.replaceState(window.history.state, '', restoredUrl)
        lastHash.current = previous
        window.dispatchEvent(new Event('hashchange'))
        return
      }

      lastHash.current = next
      if (!isMessagesRoute(next)) setCharacterId(null)
    }

    document.addEventListener('click', handleClickCapture, true)
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      document.removeEventListener('click', handleClickCapture, true)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return <MemberProfilePopover characterId={characterId} onClose={() => setCharacterId(null)} />
}
