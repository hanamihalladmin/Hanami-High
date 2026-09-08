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

type Functions={
  my_lockscreen_status:{Args:Record<string,never>;Returns:MyLockscreenStatus[]}
  verify_my_lockscreen_pin:{Args:{p_pin:string};Returns:boolean}
  set_my_lockscreen_wallpaper:{Args:{p_path:string};Returns:boolean}
  owner_account_lockscreen_statuses:{Args:Record<string,never>;Returns:OwnerLockscreenStatus[]}
  owner_generate_account_lockscreen_pin:{Args:{p_account_id:string};Returns:string}
  owner_disable_account_lockscreen:{Args:{p_account_id:string};Returns:boolean}
}

export type HanamiLockscreenDatabase=Omit<HanamiCreatorFollowingDatabase,'public'>&{
  public:Omit<HanamiCreatorFollowingDatabase['public'],'Functions'>&{
    Tables:HanamiCreatorFollowingDatabase['public']['Tables']
    Functions:HanamiCreatorFollowingDatabase['public']['Functions']&Functions
  }
}
