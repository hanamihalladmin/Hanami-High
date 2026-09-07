import { useEffect, useState } from 'react'
import { useIdentity } from '../state/IdentityContext'
import { ProfileDraftPreview } from './ProfileDraftPreview'

export function ProfileDraftPreviewLauncher() {
  const { activeCharacter } = useIdentity()
  const [hash, setHash] = useState(() => window.location.hash)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleHash = () => {
      setHash(window.location.hash)
      setOpen(false)
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  if (!activeCharacter || !hash.startsWith('#/profile/profile-studio')) return null

  return <>
    {!open && <button className="profile-draft-preview-launcher" type="button" onClick={() => setOpen(true)}>◉ Preview Draft</button>}
    {open && <ProfileDraftPreview onClose={() => setOpen(false)}/>} 
  </>
}
