import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'

const KEY_PREFIX='hanami-signin-recorded:'

export function AccountSigninRecorder(){
  const {account,session}=useIdentity()

  useEffect(()=>{
    const client=supabase
    if(!client||!account||!session)return
    const key=`${KEY_PREFIX}${account.id}`
    if(sessionStorage.getItem(key)==='1')return

    let cancelled=false
    void client.rpc('record_my_signin',{}).then(({error})=>{
      if(cancelled)return
      if(error){console.warn('Hanami sign-in tracking could not be recorded.',error.message);return}
      sessionStorage.setItem(key,'1')
    })
    return()=>{cancelled=true}
  },[account,session])

  return null
}
