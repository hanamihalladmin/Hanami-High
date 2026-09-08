const UNLOCK_PREFIX='hanami-lock-unlocked:'

export function lockscreenUnlockKey(accountId:string){return `${UNLOCK_PREFIX}${accountId}`}
export function isLockscreenUnlocked(accountId:string){return sessionStorage.getItem(lockscreenUnlockKey(accountId))==='1'}
export function markLockscreenUnlocked(accountId:string){sessionStorage.setItem(lockscreenUnlockKey(accountId),'1')}
export function clearHanamiLockscreenSession(){for(let index=sessionStorage.length-1;index>=0;index--){const key=sessionStorage.key(index);if(key?.startsWith(UNLOCK_PREFIX))sessionStorage.removeItem(key)}}
