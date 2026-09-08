import { useEffect, useState } from 'react'
import { savedPresence, presenceStorageKey, type HanamiPresenceStatus } from '../hooks/usePresenceHeartbeat'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiCharacter } from '../types/database'

function characterName(character: HanamiCharacter) {
  if (character.display_name) return character.display_name
  const fullName = [character.first_name, character.last_name].filter(Boolean).join(' ')
  return fullName || `Character Slot ${character.slot_no}`
}

function roleLabel(character: HanamiCharacter) {
  if (character.character_kind === 'faculty' && character.school_role === 'new_faculty') return 'New Teacher'
  if (character.character_kind === 'faculty' && (character.school_role === 'faculty' || character.school_role === null)) return 'Teacher'
  if (character.school_role === 'administration') return 'Staff'
  if (!character.school_role) return 'Applicant'
  return character.school_role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

const presenceOptions: Array<{ value: HanamiPresenceStatus; label: string; description: string }> = [
  { value: 'online', label: 'Online', description: 'You appear online.' },
  { value: 'idle', label: 'Idle', description: 'You appear away.' },
  { value: 'dnd', label: 'Do Not Disturb', description: 'Shows a red status indicator.' },
  { value: 'invisible', label: 'Invisible', description: 'You appear offline to other members.' },
]

export function UserPanel() {
  const { activeCharacter, characters, selectCharacter, clearActiveCharacter, isOwner, isPlatformAdmin, enterOwnerMode, enterAdminMode, signOut, mutating } = useIdentity()
  const [presence, setPresence] = useState<HanamiPresenceStatus>(() => activeCharacter ? savedPresence(activeCharacter.id) : 'online')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (activeCharacter) setPresence(savedPresence(activeCharacter.id))
  }, [activeCharacter?.id])

  useEffect(() => {
    let cancelled = false
    async function loadAvatar() {
      const client = supabase
      if (!client || !activeCharacter) return setAvatarUrl('')
      const { data: profile } = await client.from('character_profiles').select('avatar_path').eq('character_id', activeCharacter.id).maybeSingle()
      if (!profile?.avatar_path) return setAvatarUrl('')
      const { data, error } = await client.storage.from('profile-media').createSignedUrl(profile.avatar_path, 3600)
      if (!cancelled) setAvatarUrl(error ? '' : data.signedUrl)
    }
    void loadAvatar()
    return () => { cancelled = true }
  }, [activeCharacter?.id])

  if (!activeCharacter) return null
  const name = characterName(activeCharacter)
  const initials = name.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase()

  function choosePresence(next: HanamiPresenceStatus) {
    localStorage.setItem(presenceStorageKey(activeCharacter!.id), next)
    setPresence(next)
    window.dispatchEvent(new CustomEvent('hanami-presence-change', { detail: { characterId: activeCharacter!.id } }))
  }

  return <div className="user-panel">
    <a className="user-panel-identity" href="#/profile/view-profile" title="View your profile">
      <div className="user-panel-avatar">{avatarUrl ? <img src={avatarUrl} alt={`${name} profile`} /> : <span>{initials}</span>}<i className={`presence-dot status-${presence}`} /></div>
      <div className="user-copy"><strong>{name}</strong><span>{roleLabel(activeCharacter)}</span></div>
    </a>
    <div className="user-panel-controls">
      <details className="presence-menu"><summary title="Set your status" aria-label={`Set status. Current status: ${presence}`}><span className={`presence-control-dot status-${presence}`} /></summary><div className="presence-menu-popover"><span className="user-menu-label">SET STATUS</span>{presenceOptions.map((option) => <button className={presence === option.value ? 'selected' : ''} type="button" key={option.value} onClick={() => choosePresence(option.value)}><span className={`presence-option-dot status-${option.value}`} /><span><strong>{option.label}</strong><small>{option.description}</small></span>{presence === option.value && <b>✓</b>}</button>)}</div></details>
      <button type="button" title="Profile Studio" aria-label="Profile Studio" onClick={() => { window.location.hash = '#/profile/profile-studio' }}>☺</button>
      <button type="button" title="Appearance & Accessibility" aria-label="Appearance & Accessibility" onClick={() => { window.location.hash = '#/settings/accessibility' }}>⚙</button>
      <details className="user-menu"><summary title="Character and account menu" aria-label="Character and account menu">•••</summary><div className="user-menu-popover"><span className="user-menu-label">SWITCH CHARACTER</span>{characters.map((character) => <button key={character.id} type="button" disabled={mutating || character.character_state !== 'active' || character.id === activeCharacter.id} onClick={() => void selectCharacter(character.id)}>{character.id === activeCharacter.id ? '✓ ' : ''}{characterName(character)} · {character.character_state === 'active' ? roleLabel(character) : character.character_state}</button>)}<button type="button" disabled={mutating} onClick={() => void clearActiveCharacter()}>Character selection…</button>{(isOwner || isPlatformAdmin) && <div className="user-menu-rule" />}{isOwner && <><span className="user-menu-label">OWNER</span><button type="button" onClick={enterOwnerMode}>Open Owner Console</button></>}{isPlatformAdmin && <><span className="user-menu-label">ADMINISTRATOR</span><button type="button" onClick={enterAdminMode}>Open Administrator Console</button></>}<div className="user-menu-rule" /><button type="button" onClick={() => void signOut()}>Sign out</button></div></details>
    </div>
  </div>
}
