import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfileBadge, CharacterSocialIdentityCustomization, SocialPostStyle } from '../types/database-social-identity'

function profileTarget(hash: string, activeId?: string) {
  const [section,subsection,target]=hash.replace(/^#\/?/,'').split('/')
  if(section!=='profile') return null
  if(subsection==='view-profile') return target?decodeURIComponent(target):activeId||null
  if(subsection==='guestbook') return activeId||null
  return null
}

export function SocialIdentityLayer(){
  const {activeCharacter}=useIdentity()
  const [hash,setHash]=useState(window.location.hash)
  const [identity,setIdentity]=useState<CharacterSocialIdentityCustomization|null>(null)
  const [badges,setBadges]=useState<CharacterProfileBadge[]>([])
  const [postStyles,setPostStyles]=useState<SocialPostStyle[]>([])

  useEffect(()=>{const sync=()=>setHash(window.location.hash);window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])
  const targetId=profileTarget(hash,activeCharacter?.id)
  const socialRoute=/^#\/?social\//.test(hash)

  const load=useCallback(async()=>{
    const client=supabase
    if(!client)return
    if(targetId){
      const [identityResult,badgeResult]=await Promise.all([
        client.from('character_social_identity_customization').select('*').eq('character_id',targetId).maybeSingle(),
        client.from('character_profile_badges').select('*').eq('character_id',targetId).eq('visible',true).order('sort_order'),
      ])
      if(!identityResult.error)setIdentity(identityResult.data)
      if(!badgeResult.error)setBadges(badgeResult.data??[])
    }else{setIdentity(null);setBadges([])}
    if(socialRoute){
      const result=await client.from('social_post_styles').select('*').limit(200)
      if(!result.error)setPostStyles(result.data??[])
    }else setPostStyles([])
  },[targetId,socialRoute])
  useEffect(()=>{void load()},[load])

  useEffect(()=>{
    const root=document.documentElement
    if(!identity)return
    root.dataset.socialNameFont=identity.display_name_font
    root.dataset.socialNameEffect=identity.display_name_effect
    root.dataset.socialStatusStyle=identity.status_style
    root.dataset.socialBadgeLayout=identity.badge_layout
    root.dataset.socialGuestbookStyle=identity.guestbook_style
    root.dataset.socialReactionPack=identity.reaction_pack
    root.dataset.socialStickerPack=identity.sticker_pack
    root.style.setProperty('--social-name-color',identity.display_name_color)
    return()=>{
      delete root.dataset.socialNameFont;delete root.dataset.socialNameEffect;delete root.dataset.socialStatusStyle;delete root.dataset.socialBadgeLayout;delete root.dataset.socialGuestbookStyle;delete root.dataset.socialReactionPack;delete root.dataset.socialStickerPack;root.style.removeProperty('--social-name-color')
    }
  },[identity])

  useEffect(()=>{
    if(!socialRoute||postStyles.length===0)return
    const apply=()=>{
      for(const style of postStyles){
        const element=document.getElementById(`social-post-${style.post_id}`)
        if(!element)continue
        element.dataset.hanamiPostStyle=style.card_style
        element.dataset.hanamiPostAccent=style.accent_key
        element.dataset.hanamiPostTitle=style.title_style
        if(style.sticker_key)element.dataset.hanamiPostSticker=style.sticker_key;else delete element.dataset.hanamiPostSticker
      }
    }
    apply()
    const observer=new MutationObserver(apply)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>observer.disconnect()
  },[socialRoute,postStyles])

  if(!targetId||badges.length===0||!/^#\/?profile\/(view-profile|guestbook)/.test(hash))return null
  return <aside className={`social-profile-badge-dock layout-${identity?.badge_layout??'row'}`} aria-label="Profile badges">
    {badges.map(badge=><span key={badge.id} title={badge.description??badge.label}><b>{badge.icon||'✦'}</b>{badge.label}</span>)}
  </aside>
}
