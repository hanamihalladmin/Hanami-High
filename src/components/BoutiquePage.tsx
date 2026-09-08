import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { BoutiqueItem, HanamiPlusEntitlement, InventoryItem, PetalWallet } from '../types/database-rewards'
import type { BoutiqueWishlistRow } from '../types/database-customization'
import { BoutiqueArtwork } from './BoutiqueArtwork'
import { BoutiqueOwnershipGuide } from './BoutiqueOwnershipGuide'
import { ShellTopbar } from './ShellTopbar'

type Mode='featured'|'new'|'seasonal'|'avatar-decorations'|'frames'|'effects'|'nameplates'|'profile-cards'|'background-packs'|'stickers'|'hanami-plus-passes'|'my-inventory'
type CatalogView='mode'|'browse'|'wishlist'
type Props={mode:Mode;onSearch:()=>void;onNotifications:()=>void;unreadCount:number}

const modeMeta:Record<Mode,{title:string;description:string}>={
 featured:{title:'Featured',description:'Hanami’s current collectible drops and highlighted cosmetics.'},
 new:{title:'New',description:'Recently added cosmetics, decorations, cards, and effects.'},
 seasonal:{title:'Seasonal',description:'Limited collections tied to the 2006 Hanami school year.'},
 'avatar-decorations':{title:'Avatar Decorations',description:'Collectible decorations that frame and orbit your avatar.'},
 frames:{title:'Frames',description:'Profile and avatar frames for your Hanami identity card.'},
 effects:{title:'Effects',description:'Decorative profile effects and animated-style visual treatments.'},
 nameplates:{title:'Nameplates',description:'Character nameplate styles for profiles and social surfaces.'},
 'profile-cards':{title:'Profile Cards',description:'Alternative identity-card treatments for your profile.'},
 'background-packs':{title:'Background Packs',description:'Collectible background scenes for profile customization.'},
 stickers:{title:'Stickers',description:'Sticker sheets and decorative profile pieces.'},
 'hanami-plus-passes':{title:'Hanami+ Passes',description:'Optional time-limited customization access purchased with Petals.'},
 'my-inventory':{title:'My Inventory',description:'Account-wide ownership with character-specific equipment.'},
}
const typeLabels:Record<string,string>={avatar_decoration:'Avatar Decoration',frame:'Frame',effect:'Profile Effect',nameplate:'Nameplate',profile_card:'Profile Card',background_pack:'Background Pack',sticker:'Sticker',hanami_plus_pass:'Hanami+ Pass'}
const equippableTypes=new Set(['avatar_decoration','frame','effect','nameplate','profile_card','background_pack'])

export function BoutiquePage({mode,onSearch,onNotifications,unreadCount}:Props){
 const {account,activeCharacter}=useIdentity()
 const [wallet,setWallet]=useState<PetalWallet|null>(null)
 const [items,setItems]=useState<BoutiqueItem[]>([])
 const [inventory,setInventory]=useState<InventoryItem[]>([])
 const [wishlist,setWishlist]=useState<BoutiqueWishlistRow[]>([])
 const [plus,setPlus]=useState<HanamiPlusEntitlement|null>(null)
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState<string|null>(null)
 const [error,setError]=useState<string|null>(null)
 const [notice,setNotice]=useState<string|null>(null)
 const [previewId,setPreviewId]=useState<string|null>(null)
 const [catalogView,setCatalogView]=useState<CatalogView>('mode')
 const [catalogQuery,setCatalogQuery]=useState('')

 useEffect(()=>{setCatalogView('mode');setCatalogQuery('');setPreviewId(null)},[mode])
 const load=useCallback(async()=>{
  const client=supabase;if(!client||!account)return
  setLoading(true);setError(null)
  const [w,i,n,h,l]=await Promise.all([
   client.from('petal_wallets').select('*').eq('account_id',account.id).maybeSingle(),
   client.from('boutique_items').select('*').eq('state','published').order('featured',{ascending:false}).order('created_at',{ascending:false}),
   client.from('inventory_items').select('*').eq('account_id',account.id).order('acquired_at',{ascending:false}),
   client.from('hanami_plus_entitlements').select('*').eq('account_id',account.id).maybeSingle(),
   client.from('boutique_wishlist').select('*').eq('account_id',account.id).order('created_at',{ascending:false}),
  ])
  const first=[w.error,i.error,n.error,h.error,l.error].find(Boolean);setLoading(false);if(first)return setError(first.message)
  setWallet(w.data);setItems(i.data??[]);setInventory(n.data??[]);setPlus(h.data);setWishlist(l.data??[])
 },[account])
 useEffect(()=>{void load()},[load])

 const owned=useMemo(()=>new Map(inventory.map(i=>[i.item_id,i])),[inventory])
 const wished=useMemo(()=>new Set(wishlist.map(i=>i.item_id)),[wishlist])
 const modeItems=useMemo(()=>{
  if(mode==='my-inventory')return items.filter(i=>owned.has(i.id))
  if(mode==='featured')return items.filter(i=>i.featured)
  if(mode==='new')return items.filter(i=>i.is_new)
  if(mode==='seasonal')return items.filter(i=>i.season!=='permanent')
  const map:Record<string,string>={'avatar-decorations':'avatar_decoration',frames:'frame',effects:'effect',nameplates:'nameplate','profile-cards':'profile_card','background-packs':'background_pack',stickers:'sticker','hanami-plus-passes':'hanami_plus_pass'}
  return items.filter(i=>i.item_type===map[mode])
 },[items,mode,owned])
 const visible=useMemo(()=>{
  const base=catalogView==='browse'?items:catalogView==='wishlist'?items.filter(item=>wished.has(item.id)):modeItems
  const q=catalogQuery.trim().toLowerCase()
  if(!q)return base
  return base.filter(item=>[item.name,item.description,item.collection_name,item.season,typeLabels[item.item_type]||item.item_type,item.rarity].filter(Boolean).some(value=>String(value).toLowerCase().includes(q)))
 },[catalogView,items,modeItems,wished,catalogQuery])
 const viewTitle=catalogView==='browse'?'Browse All':catalogView==='wishlist'?'Wishlist':modeMeta[mode].title
 const viewDescription=catalogView==='browse'?'Browse every published Hanami cosmetic and pass in one catalog.':catalogView==='wishlist'?'Everything you saved for later, in one place.':modeMeta[mode].description
 const hero=useMemo(()=>items.find(i=>i.id===previewId)||visible.find(i=>i.featured)||visible[0]||null,[items,previewId,visible])
 const plusActive=Boolean(plus&&new Date(plus.ends_at).getTime()>Date.now())
 const equipCount=items.filter(item=>owned.has(item.id)&&equippableTypes.has(item.item_type)).length
 const characterName=activeCharacter?.display_name||activeCharacter?.first_name||'your current character'

 async function purchase(item:BoutiqueItem){
  const client=supabase;if(!client)return
  setWorking(item.id);setError(null);setNotice(null)
  const {data,error:e}=await client.rpc('purchase_boutique_item',{p_item_id:item.id,p_request_id:crypto.randomUUID()})
  setWorking(null);if(e)return setError(e.message)
  setNotice(item.item_type==='hanami_plus_pass'?`${item.name} applied to your Hanami+ entitlement. ${data?.[0]?.balance??wallet?.balance??0} Petals remaining.`:`${item.name} added to your account inventory. ${data?.[0]?.balance??wallet?.balance??0} Petals remaining.`)
  await load()
 }
 async function toggleWish(item:BoutiqueItem){
  const client=supabase;if(!client||!account)return;setError(null)
  if(wished.has(item.id)){
   const {error:e}=await client.from('boutique_wishlist').delete().eq('account_id',account.id).eq('item_id',item.id);if(e)return setError(e.message)
   setWishlist(current=>current.filter(row=>row.item_id!==item.id));setNotice(`${item.name} removed from your Wishlist.`)
  }else{
   const {data,error:e}=await client.from('boutique_wishlist').insert({account_id:account.id,item_id:item.id}).select('*').single();if(e)return setError(e.message)
   setWishlist(current=>[data,...current]);setNotice(`${item.name} added to your Wishlist.`)
  }
 }
 function buyButton(item:BoutiqueItem,compact=false){
  const row=owned.get(item.id),enough=(wallet?.balance??0)>=item.price_petals,repeat=item.item_type==='hanami_plus_pass',can=enough&&(!row||repeat)
  if(mode==='my-inventory'&&catalogView==='mode')return equippableTypes.has(item.item_type)?<a className="boutique-equip-link" href="#/profile/profile-studio" onClick={e=>e.stopPropagation()}>Equip</a>:<span className="boutique-owned-badge">Owned ×{row?.quantity??1}</span>
  return <button className="boutique-buy-button" disabled={!can||working===item.id} onClick={e=>{e.stopPropagation();void purchase(item)}}>{working===item.id?'Purchasing…':row&&!repeat?'Owned by account':!enough?'Need more Petals':compact?`❀ ${item.price_petals}`:`Purchase · ❀ ${item.price_petals}`}</button>
 }
 function heart(item:BoutiqueItem){return <button className={`boutique-heart ${wished.has(item.id)?'wished':''}`} type="button" title={wished.has(item.id)?'Remove from Wishlist':'Add to Wishlist'} onClick={e=>{e.stopPropagation();void toggleWish(item)}}>{wished.has(item.id)?'♥':'♡'}</button>}

 return <main className="content-area boutique-page boutique-storefront">
  <ShellTopbar eyebrow="BOUTIQUE" title={viewTitle} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
  <div className="boutique-orbs-nav"><strong>✿ HANAMI BOUTIQUE</strong><nav><a href="#/boutique/featured">Featured</a><button type="button" onClick={()=>{setCatalogView('browse');setCatalogQuery('');setPreviewId(null)}}>Browse</button><a href="#/boutique/avatar-decorations">Decorations</a><a href="#/boutique/my-inventory">My Inventory</a></nav><button className="boutique-wishlist-link" type="button" onClick={()=>{setCatalogView('wishlist');setCatalogQuery('');setPreviewId(null)}}>♥ {wishlist.length}</button><span>❀ {wallet?.balance??0}</span></div>
  <div className="boutique-storebar"><div><span className="eyebrow">HANAMI COLLECTIBLES</span><p>{viewDescription}</p>{catalogView!=='mode'&&<button className="boutique-return-collection" type="button" onClick={()=>{setCatalogView('mode');setCatalogQuery('');setPreviewId(null)}}>← Return to {modeMeta[mode].title}</button>}</div><div className="boutique-wallet-chip"><span>YOUR PETALS</span><strong>❀ {wallet?.balance??0}</strong><small>{plusActive?`Hanami+ active through ${new Date(plus!.ends_at).toLocaleDateString()}`:'Hanami+ optional · core Hanami stays available'}</small></div></div>
  {(catalogView==='browse'||catalogView==='wishlist')&&<div className="boutique-catalog-search"><span>⌕</span><input value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder={catalogView==='wishlist'?'Search your wishlist…':'Search all Boutique items…'} aria-label="Search Boutique catalog"/><small>{visible.length} matching item{visible.length===1?'':'s'}</small></div>}
  {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
  {loading?<div className="rewards-empty">Loading the Boutique…</div>:<><BoutiqueOwnershipGuide/>
   {mode==='my-inventory'&&catalogView==='mode'&&<section className="boutique-inventory-summary"><article><span>Owned items</span><strong>{inventory.reduce((sum,row)=>sum+row.quantity,0)}</strong></article><article><span>Equippable cosmetics</span><strong>{equipCount}</strong></article><article><span>Active character</span><strong>{characterName}</strong></article><article><span>Hanami+</span><strong>{plusActive?'Active':'Not active'}</strong></article></section>}
   {hero&&!(mode==='my-inventory'&&catalogView==='mode')&&<section className={`boutique-feature-hero rarity-${hero.rarity}`}><div className="boutique-feature-art"><BoutiqueArtwork token={hero.preview_token} name={hero.name} type={hero.item_type} large/>{heart(hero)}</div><div className="boutique-feature-copy"><div className="boutique-feature-tags"><span>{typeLabels[hero.item_type]||hero.item_type}</span><span>{hero.rarity}</span>{hero.is_new&&<span>NEW</span>}</div><span className="eyebrow">{hero.collection_name||`${hero.season} collection`}</span><h1>{hero.name}</h1><p>{hero.description}</p><div className="boutique-feature-price"><strong>❀ {hero.price_petals}</strong>{hero.pass_days&&<span>{hero.pass_days} days added to Hanami+</span>}</div><div className="boutique-feature-actions">{buyButton(hero)}<button type="button" onClick={()=>setPreviewId(null)}>Reset preview</button></div></div></section>}
   <section className="boutique-shelf"><header><div><span className="eyebrow">{catalogView==='wishlist'?'SAVED ITEMS':mode==='my-inventory'&&catalogView==='mode'?'ACCOUNT INVENTORY':'BROWSE'}</span><h2>{viewTitle}</h2></div><strong>{visible.length} item{visible.length===1?'':'s'}</strong></header>{visible.length===0?<div className="rewards-empty">{catalogView==='wishlist'?'Your Wishlist is empty. Tap ♡ on a Boutique item to save it here.':'No items are available in this collection yet.'}</div>:<div className="boutique-orb-grid">{visible.map(item=>{const row=owned.get(item.id);return <article className={`boutique-orb-card rarity-${item.rarity} ${hero?.id===item.id?'previewing':''}`} key={item.id} onClick={()=>setPreviewId(item.id)}><div className="boutique-orb-art"><BoutiqueArtwork token={item.preview_token} name={item.name} type={item.item_type}/>{heart(item)}{item.is_new&&<span className="boutique-new-flag">NEW</span>}{row&&<span className="boutique-owned-flag">ACCOUNT OWNED</span>}</div><div className="boutique-orb-copy"><span className="eyebrow">{item.collection_name||item.season}</span><h3>{item.name}</h3><p>{item.description}</p><div className="boutique-orb-meta"><span>{typeLabels[item.item_type]||item.item_type}</span><span>{item.rarity}</span>{item.pass_days&&<span>{item.pass_days} days</span>}</div></div><footer><strong>{row?'Account owned':`❀ ${item.price_petals}`}</strong>{buyButton(item,true)}</footer></article>})}</div>}</section>
  </>}
 </main>
}
