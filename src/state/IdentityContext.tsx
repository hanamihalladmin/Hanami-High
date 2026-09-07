import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { hasSupabaseConfig, signInWithDiscord, supabase } from '../lib/supabase'
import type { HanamiAccount, HanamiCharacter } from '../types/database'

type IdentityContextValue = {
  configured: boolean
  loading: boolean
  mutating: boolean
  error: string | null
  session: Session | null
  account: HanamiAccount | null
  characters: HanamiCharacter[]
  activeCharacter: HanamiCharacter | null
  roles: string[]
  capabilities: string[]
  isOwner: boolean
  ownerMode: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refreshIdentity: () => Promise<void>
  createStudentSlot: (slotNo: 1 | 2) => Promise<void>
  selectCharacter: (characterId: string) => Promise<void>
  clearActiveCharacter: () => Promise<void>
  enterOwnerMode: () => void
  exitOwnerMode: () => void
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

function messageFromError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Something went wrong while loading your Hanami account.'
}

export function IdentityProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<HanamiAccount | null>(null)
  const [characters, setCharacters] = useState<HanamiCharacter[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerMode, setOwnerMode] = useState(false)

  const clearIdentity = useCallback(() => {
    setAccount(null)
    setCharacters([])
    setRoles([])
    setCapabilities([])
    setOwnerMode(false)
    setError(null)
  }, [])

  const refreshIdentity = useCallback(async () => {
    const client = supabase
    if (!client) return

    setIdentityLoading(true)
    setError(null)

    try {
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError) throw userError
      if (!userData.user) {
        clearIdentity()
        return
      }

      const [accountResult, characterResult, roleResult, capabilityResult] = await Promise.all([
        client.from('accounts').select('*').eq('id', userData.user.id).single(),
        client.from('characters').select('*').order('slot_no', { ascending: true }),
        client.rpc('current_platform_roles'),
        client.rpc('current_capabilities'),
      ])

      if (accountResult.error) throw accountResult.error
      if (characterResult.error) throw characterResult.error
      if (roleResult.error) throw roleResult.error
      if (capabilityResult.error) throw capabilityResult.error

      setAccount(accountResult.data)
      setCharacters(characterResult.data ?? [])
      setRoles((roleResult.data ?? []).map((row) => row.code))
      setCapabilities((capabilityResult.data ?? []).map((row) => row.code))
    } catch (nextError) {
      setError(messageFromError(nextError))
    } finally {
      setIdentityLoading(false)
    }
  }, [clearIdentity])

  useEffect(() => {
    const client = supabase
    if (!client) {
      setAuthLoading(false)
      return
    }

    let mounted = true

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) clearIdentity()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [clearIdentity])

  useEffect(() => {
    if (!authLoading && session) void refreshIdentity()
  }, [authLoading, session?.user.id, refreshIdentity])

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === account?.active_character_id) ?? null,
    [account?.active_character_id, characters],
  )

  const isOwner = roles.includes('owner')

  useEffect(() => {
    if (!isOwner && ownerMode) setOwnerMode(false)
  }, [isOwner, ownerMode])

  const runMutation = useCallback(async (action: () => Promise<void>) => {
    setMutating(true)
    setError(null)
    try {
      await action()
      await refreshIdentity()
    } catch (nextError) {
      setError(messageFromError(nextError))
      throw nextError
    } finally {
      setMutating(false)
    }
  }, [refreshIdentity])

  const createStudentSlot = useCallback(async (slotNo: 1 | 2) => {
    const client = supabase
    if (!client) throw new Error('Supabase is not configured.')
    await runMutation(async () => {
      const { error: rpcError } = await client.rpc('create_student_character_slot', { p_slot_no: slotNo })
      if (rpcError) throw rpcError
    })
  }, [runMutation])

  const selectCharacter = useCallback(async (characterId: string) => {
    const client = supabase
    if (!client) throw new Error('Supabase is not configured.')
    await runMutation(async () => {
      const { error: rpcError } = await client.rpc('set_active_character', { p_character_id: characterId })
      if (rpcError) throw rpcError
      setOwnerMode(false)
    })
  }, [runMutation])

  const clearActiveCharacter = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    await runMutation(async () => {
      const { error: updateError } = await client
        .from('accounts')
        .update({ active_character_id: null })
        .eq('id', account.id)
      if (updateError) throw updateError
    })
  }, [account, runMutation])

  const signIn = useCallback(async () => {
    setError(null)
    await signInWithDiscord()
  }, [])

  const signOut = useCallback(async () => {
    const client = supabase
    if (!client) return
    setError(null)
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) throw signOutError
  }, [])

  const value = useMemo<IdentityContextValue>(() => ({
    configured: hasSupabaseConfig,
    loading: authLoading || Boolean(session && !account && !error) || identityLoading,
    mutating,
    error,
    session,
    account,
    characters,
    activeCharacter,
    roles,
    capabilities,
    isOwner,
    ownerMode,
    signIn,
    signOut,
    refreshIdentity,
    createStudentSlot,
    selectCharacter,
    clearActiveCharacter,
    enterOwnerMode: () => {
      if (isOwner) setOwnerMode(true)
    },
    exitOwnerMode: () => setOwnerMode(false),
  }), [
    account,
    activeCharacter,
    authLoading,
    capabilities,
    characters,
    clearActiveCharacter,
    createStudentSlot,
    error,
    identityLoading,
    isOwner,
    mutating,
    ownerMode,
    refreshIdentity,
    roles,
    selectCharacter,
    session,
    signIn,
    signOut,
  ])

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity() {
  const value = useContext(IdentityContext)
  if (!value) throw new Error('useIdentity must be used within IdentityProvider.')
  return value
}
