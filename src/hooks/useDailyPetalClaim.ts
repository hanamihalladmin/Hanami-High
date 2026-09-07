import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

export function useDailyPetalClaim() {
  const { account, activeCharacter } = useIdentity()

  useEffect(() => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    void client.rpc('claim_daily_petals')
  }, [account?.id, activeCharacter?.id])
}
