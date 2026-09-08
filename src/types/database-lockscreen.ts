import type { HanamiCreatorFollowingDatabase } from './database-creator-following'

export type MyLockscreenStatus={
  lock_enabled:boolean
  wallpaper_path:string|null
  pin_issued_at:string|null
  locked_until:string|null
}

export type OwnerLockscreenStatus={
  account_id:string
  discord_username:string|null
  lock_enabled:boolean
  pin_issued_at:string|null
  wallpaper_configured:boolean
  locked_until:string|null
}

export type OwnerAccountTrackingSummary={
  account_id:string
  discord_user_id:string|null
  discord_username:string|null
  account_state:string
  account_created_at:string
  first_recorded_signin_at:string|null
  last_recorded_signin_at:string|null
  recorded_signin_count:number
  character_count:number
  lock_enabled:boolean
  pin_issued_at:string|null
  wallpaper_configured:boolean
  locked_until:string|null
  moderation_report_count:number
}

export type OwnerSigninEvent={
  event_id:string
  account_id:string
  discord_username:string|null
  signed_in_at:string
}

type Functions={
  my_lockscreen_status:{Args:Record<string,never>;Returns:MyLockscreenStatus[]}
  verify_my_lockscreen_pin:{Args:{p_pin:string};Returns:boolean}
  set_my_lockscreen_wallpaper:{Args:{p_path:string};Returns:boolean}
  owner_account_lockscreen_statuses:{Args:Record<string,never>;Returns:OwnerLockscreenStatus[]}
  owner_generate_account_lockscreen_pin:{Args:{p_account_id:string};Returns:string}
  owner_disable_account_lockscreen:{Args:{p_account_id:string};Returns:boolean}
  record_my_signin:{Args:Record<string,never>;Returns:string}
  owner_account_tracking_summary:{Args:Record<string,never>;Returns:OwnerAccountTrackingSummary[]}
  owner_signin_events:{Args:{p_limit?:number};Returns:OwnerSigninEvent[]}
}

export type HanamiLockscreenDatabase=Omit<HanamiCreatorFollowingDatabase,'public'>&{
  public:Omit<HanamiCreatorFollowingDatabase['public'],'Functions'>&{
    Tables:HanamiCreatorFollowingDatabase['public']['Tables']
    Functions:HanamiCreatorFollowingDatabase['public']['Functions']&Functions
  }
}
