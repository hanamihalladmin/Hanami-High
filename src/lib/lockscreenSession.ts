const UNLOCK_PREFIX='hanami-lock-unlocked:'

function marker(accessToken:string){return accessToken.slice(-24)}
export function lockscreenUnlockKey(accountId:string){return `${UNLOCK_PREFIX}${accountId}`}
export function isLockscreenUnlocked(accountId:string,accessToken:string){return sessionStorage.getItem(lockscreenUnlockKey(accountId))===marker(accessToken)}
export function markLockscreenUnlocked(accountId:string,accessToken:string){sessionStorage.setItem(lockscreenUnlockKey(accountId),marker(accessToken))}
export function clearHanamiLockscreenSession(){for(let index=sessionStorage.length-1;index>=0;index--){const key=sessionStorage.key(index);if(key?.startsWith(UNLOCK_PREFIX))sessionStorage.removeItem(key)}}
