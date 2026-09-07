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
import { hasSupabaseConfig, signInWithDiscord, supabase, type LoginIntent } from '../lib/supabase'
import type { HanamiAccount, HanamiCharacter, StudentApplication } from '../types/database'

const ACCESS_MODE_KEY = 'hanami-access-mode'
const LOGIN_INTENT_KEY = 'hanami-login-intent'
const ACCESS_ERROR_KEY = 'hanami-access-error'

type IdentityContextValue = {
  configured: boolean
  loading: boolean
  mutating: boolean
  error: string | null
  session: Session | null
  account: HanamiAccount | null
  characters: HanamiCharacter[]
  applications: StudentApplication[]
  activeCharacter: HanamiCharacter | null
  roles: string[]
  capabilities: string[]
  isOwner: boolean
  isPlatformAdmin: boolean
  ownerMode: boolean
  adminMode: boolean
  signIn: (intent?: LoginIntent) => Promise<void>
  signOut: () => Promise<void>
  refreshIdentity: () => Promise<void>
  createStudentSlot: (slotNo: 1 | 2) => Promise<void>
  selectCharacter: (characterId: string) => Promise<void>
  clearActiveCharacter: () => Promise<void>
  enterOwnerMode: () => void
  exitOwnerMode: () => void
  enterAdminMode: () => void
  exitAdminMode: () => void
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

function messageFromError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Something went wrong while loading your Hanami account.'
}

function storedAccessMode() {
  if (typeof window === 'undefined') return null
  const mode = sessionStorage.getItem(ACCESS_MODE_KEY)
  return mode === 'owner' || mode === 'administrator' ? mode : null
}

export function IdentityProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<HanamiAccount | null>(null)
  const [characters, setCharacters] = useState<HanamiCharacter[]>([])
  const [applications, setApplications] = useState<StudentApplication[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerMode, setOwnerMode] = useState(() => storedAccessMode() === 'owner')
  const [adminMode, setAdminMode] = useState(() => storedAccessMode() === 'administrator')

  const clearSpecialMode = useCallback(() => {
    setOwnerMode(false)
    setAdminMode(false)
    sessionStorage.removeItem(ACCESS_MODE_KEY)
  }, [])

  const clearIdentity = useCallback(() => {
    setAccount(null)
    setCharacters([])
    setApplications([])
    setRoles([])
    setCapabilities([])
    setOwnerMode(false)
    setAdminMode(false)
    sessionStorage.removeItem(ACCESS_MODE_KEY)
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

      const [accountResult, characterResult, applicationResult, roleResult, capabilityResult] = await Promise.all([
        client.from('accounts').select('*').eq('id', userData.user.id).single(),
        client.from('characters').select('*').order('slot_no', { ascending: true }),
        client
          .from('student_applications')
          .select('*')
          .eq('applicant_account_id', userData.user.id)
          .order('created_at', { ascending: true }),
        client.rpc('current_platform_roles'),
        client.rpc('current_capabilities'),
      ])

      if (accountResult.error) throw accountResult.error
      if (characterResult.error) throw characterResult.error
      if (applicationResult.error) throw applicationResult.error
      if (roleResult.error) throw roleResult.error
      if (capabilityResult.error) throw capabilityResult.error

      const nextRoles = (roleResult.data ?? []).map((row) => row.code)
      const nextCapabilities = (capabilityResult.data ?? []).map((row) => row.code)

      setAccount(accountResult.data)
      setCharacters(characterResult.data ?? [])
      setApplications(applicationResult.data ?? [])
      setRoles(nextRoles)
      setCapabilities(nextCapabilities)

      const requestedIntent = sessionStorage.getItem(LOGIN_INTENT_KEY) as LoginIntent | null
      if (requestedIntent) sessionStorage.removeItem(LOGIN_INTENT_KEY)

      if (requestedIntent === 'owner') {
        if (!nextRoles.includes('owner')) {
          sessionStorage.setItem(ACCESS_ERROR_KEY, 'This Discord account is not authorized for Owner access.')
          clearSpecialMode()
          await client.auth.signOut()
          return
        }
        sessionStorage.setItem(ACCESS_MODE_KEY, 'owner')
        setOwnerMode(true)
        setAdminMode(false)
      } else if (requestedIntent === 'administrator') {
        if (!nextRoles.includes('platform_admin')) {
          sessionStorage.setItem(ACCESS_ERROR_KEY, 'This Discord account is not authorized for Administrator access.')
          clearSpecialMode()
          await client.auth.signOut()
          return
        }
        sessionStorage.setItem(ACCESS_MODE_KEY, 'administrator')
        setAdminMode(true)
        setOwnerMode(false)
      } else if (requestedIntent === 'member') {
        clearSpecialMode()
      } else {
        const currentMode = storedAccessMode()
        if (currentMode === 'owner' && !nextRoles.includes('owner')) clearSpecialMode()
        if (currentMode === 'administrator' && !nextRoles.includes('platform_admin')) clearSpecialMode()
      }
    } catch (nextError) {
      setError(messageFromError(nextError))
    } finally {
      setIdentityLoading(false)
    }
  }, [clearIdentity, clearSpecialMode])

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
  const isPlatformAdmin = roles.includes('platform_admin')

  useEffect(() => {
    if (!isOwner && ownerMode) clearSpecialMode()
  }, [clearSpecialMode, isOwner, ownerMode])

  useEffect(() => {
    if (!isPlatformAdmin && adminMode) clearSpecialMode()
  }, [adminMode, clearSpecialMode, isPlatformAdmin])

  const runMutation = useCallback(async (action: () => Promise<void>) => {
    setMutating(true)
    setError(null)
    try {
      await action()
      await refreshIdentity()
    } catch (nextError) {
      setError(messageFromError(nextError))
    } finally {
      setMutating(false)
    }
  }, [refreshIdentity])

  const createStudentSlot = useCallback(async (slotNo: 1 | 2) => {
    const client = supabase
    if (!client) {
      setError('Supabase is not configured.')
      return
    }
    await runMutation(async () => {
      const { error: rpcError } = await client.rpc('create_student_character_slot', { p_slot_no: slotNo })
      if (rpcError) throw rpcError
    })
  }, [runMutation])

  const selectCharacter = useCallback(async (characterId: string) => {
    const client = supabase
    if (!client) {
      setError('Supabase is not configured.')
      return
    }
    await runMutation(async () => {
      const { error: rpcError } = await client.rpc('set_active_character', { p_character_id: characterId })
      if (rpcError) throw rpcError
      clearSpecialMode()
    })
  }, [clearSpecialMode, runMutation])

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

  const signIn = useCallback(async (intent: LoginIntent = 'member') => {
    setError(null)
    sessionStorage.removeItem(ACCESS_ERROR_KEY)
    clearSpecialMode()
    await signInWithDiscord(intent)
  }, [clearSpecialMode])

  const signOut = useCallback(async () => {
    const client = supabase
    if (!client) return
    setError(null)
    sessionStorage.removeItem(LOGIN_INTENT_KEY)
    sessionStorage.removeItem(ACCESS_MODE_KEY)
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }, [])

  const enterOwnerMode = useCallback(() => {
    if (!isOwner) return
    sessionStorage.setItem(ACCESS_MODE_KEY, 'owner')
    setOwnerMode(true)
    setAdminMode(false)
  }, [isOwner])

  const exitOwnerMode = useCallback(() => clearSpecialMode(), [clearSpecialMode])

  const enterAdminMode = useCallback(() => {
    if (!isPlatformAdmin) return
    sessionStorage.setItem(ACCESS_MODE_KEY, 'administrator')
    setAdminMode(true)
    setOwnerMode(false)
  }, [isPlatformAdmin])

  const exitAdminMode = useCallback(() => clearSpecialMode(), [clearSpecialMode])

  const value = useMemo<IdentityContextValue>(() => ({
    configured: hasSupabaseConfig,
    loading: authLoading || Boolean(session && !account && !error) || identityLoading,
    mutating,
    error,
    session,
    account,
    characters,
    applications,
    activeCharacter,
    roles,
    capabilities,
    isOwner,
    isPlatformAdmin,
    ownerMode,
    adminMode,
    signIn,
    signOut,
    refreshIdentity,
    createStudentSlot,
    selectCharacter,
    clearActiveCharacter,
    enterOwnerMode,
    exitOwnerMode,
    enterAdminMode,
    exitAdminMode,
  }), [
    account,
    activeCharacter,
    adminMode,
    applications,
    authLoading,
    capabilities,
    characters,
    clearActiveCharacter,
    createStudentSlot,
    enterAdminMode,
    enterOwnerMode,
    error,
    exitAdminMode,
    exitOwnerMode,
    identityLoading,
    isOwner,
    isPlatformAdmin,
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
