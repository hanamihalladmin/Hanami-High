import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { BoutiqueItem, HanamiPlusEntitlement, InventoryItem, PetalWallet } from '../types/database-rewards'
import type { BoutiqueWishlistRow } from '../types/database-customization'
import { BoutiqueProductArtwork } from './BoutiqueProductArtwork'
import { ShellTopbar } from './ShellTopbar'

type Mode='featured'|'new'|'seasonal'|'avatar-decorations'|'frames'|'effects'|'nameplates'|'profile-cards'|'background-packs'|'stickers'|'hanami-plus-passes'|'my-inventory'
type CatalogView='mode'|'browse'|'wishlist'
type Props={mode:Mode;onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type BoutiqueCatalogItem=BoutiqueItem&{is_animated?:boolean;pricing_state?:'priced'|'tbd'|string}

const modeMeta:Record<Mode,{title:string;description:string}>={
 featured:{title:'Featured',description:'The current Hanami collectible spotlight, animated drops, and staff picks.'},
 new:{title:'New',description:'Recently released decorations, effects, frames, cards, and collectibles.'},
 seasonal:{title:'Seasonal',description:'Limited collections tied to Hanami High’s 2006 school calendar.'},
 'avatar-decorations':{title:'Avatar Decorations',description:'Orbiting friends, halos, charms, and decorations for your character avatar.'},
 frames:{title:'Frames',description:'Collectible frames built around your character portrait and profile presentation.'},
 effects:{title:'Profile Effects',description:'Animated atmosphere, particles, lighting, and scene effects.'},
 nameplates:{title:'Nameplates',description:'Collectible display plates for your character name across Hanami.'},
 'profile-cards':{title:'Profile Cards',description:'Alternative visual treatments for identity cards and profile summaries.'},
 'background-packs':{title:'Background Packs',description:'Collectible scenes and environments for profile customization.'},
 stickers:{title:'Stickers',description:'Decorative sticker sheets for profile layouts and personal spaces.'},
 'hanami-plus-passes':{title:'Hanami+ Passes',description:'Optional customization access purchased with Petals.'},
 'my-inventory':{title:'My Inventory',description:'Everything owned by your account, ready for character-specific equipment.'},
}

const typeLabels:Record<string,string>={avatar_decoration:'Avatar Decoration',frame:'Frame',effect:'Profile Effect',nameplate:'Nameplate',profile_card:'Profile Card',background_pack:'Background',sticker:'Sticker',hanami_plus_pass:'Hanami+ Pass'}
const equippableTypes=new Set(['avatar_decoration','frame','effect','nameplate','profile_card','background_pack'])
const legacyAnimatedNames=new Set(['Petal Drift','Petal Shower','Sakura Drift Halo','Star Spark','Starlight Trail','Starlight Sprites','Bubble Pop','Firefly Drift','Arcade Bloom','Midnight Shrine','Aurora Mist','Moonlit Koi Orbit','Crystal Bloom Frame','Gilded Moon Frame','Aurora Wing Frame'])
const categoryLinks=[
 ['#/boutique/avatar-decorations','Decorations'],['#/boutique/effects','Effects'],['#/boutique/frames','Frames'],['#/boutique/nameplates','Nameplates'],['#/boutique/profile-cards','Profile Cards'],['#/boutique/background-packs','Backgrounds'],['#/boutique/stickers','Stickers'],['#/boutique/hanami-plus-passes','Hanami+'],
] as const

function isAnimated(item:BoutiqueCatalogItem){return Boolean(item.is_animated||legacyAnimatedNames.has(item.name))}
function hasPrice(item:BoutiqueCatalogItem){return item.pricing_state!=='tbd'&&item.price_petals>0}
function priceLabel(item:BoutiqueCatalogItem){return hasPrice(item)?`❀ ${item.price_petals}`:'Price TBD'}
function seasonalLabel(item:BoutiqueCatalogItem){return item.season==='fall'?'HALLOWEEN 2006':item.season!=='permanent'?item.season.toUpperCase():null}

export function BoutiquePage({mode,onSearch,onNotifications,unreadCount}:Props){
 const {account,activeCharacter}=useIdentity()
 const [wallet,setWallet]=useState<PetalWallet|null>(null)
 const [items,setItems]=useState<BoutiqueCatalogItem[]>([])
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
  setWallet(w.data);setItems((i.data??[]) as BoutiqueCatalogItem[]);setInventory(n.data??[]);setPlus(h.data);setWishlist(l.data??[])
 },[account])
 useEffect(()=>{void load()},[load])

 const owned=useMemo(()=>new Map(inventory.map(i=>[i.item_id,i])),[inventory])
 const wished=useMemo(()=>new Set(wishlist.map(i=>i.item_id)),[wishlist])
 const collectionCounts=useMemo(()=>{const counts=new Map<string,number>();items.forEach(item=>{if(item.collection_name)counts.set(item.collection_name,(counts.get(item.collection_name)||0)+1)});return counts},[items])
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
  const q=catalogQuery.trim().toLowerCase();if(!q)return base
  return base.filter(item=>[item.name,item.description,item.collection_name,item.season,typeLabels[item.item_type]||item.item_type,item.rarity].filter(Boolean).some(value=>String(value).toLowerCase().includes(q)))
 },[catalogView,items,modeItems,wished,catalogQuery])
 const viewTitle=catalogView==='browse'?'Browse All':catalogView==='wishlist'?'Wishlist':modeMeta[mode].title
 const viewDescription=catalogView==='browse'?'Every published Hanami collectible in one visual catalog.':catalogView==='wishlist'?'The cosmetics and passes you saved for later.':modeMeta[mode].description
 const hero=useMemo(()=>items.find(i=>i.id===previewId)||visible.find(i=>i.featured)||visible[0]||null,[items,previewId,visible])
 const plusActive=Boolean(plus&&new Date(plus.ends_at).getTime()>Date.now())
 const characterName=activeCharacter?.display_name||activeCharacter?.first_name||'Current character'
 const ownedCount=inventory.reduce((sum,row)=>sum+row.quantity,0)

 const collections=useMemo(()=>{const map=new Map<string,BoutiqueCatalogItem[]>();visible.forEach(item=>{const key=item.collection_name||'Hanami Collection';map.set(key,[...(map.get(key)||[]),item])});return [...map.entries()]},[visible])

 async function purchase(item:BoutiqueCatalogItem){const client=supabase;if(!client)return;if(!hasPrice(item)){setNotice(`${item.name} is available to preview now. Its Petal price has not been set by the owner yet.`);return}setWorking(item.id);setError(null);setNotice(null);const {data,error:e}=await client.rpc('purchase_boutique_item',{p_item_id:item.id,p_request_id:crypto.randomUUID()});setWorking(null);if(e)return setError(e.message);setNotice(item.item_type==='hanami_plus_pass'?`${item.name} extended your Hanami+ access.`:`${item.name} is now in your account inventory. ${data?.[0]?.balance??wallet?.balance??0} Petals remaining.`);await load()}
 async function toggleWish(item:BoutiqueCatalogItem){const client=supabase;if(!client||!account)return;setError(null);if(wished.has(item.id)){const {error:e}=await client.from('boutique_wishlist').delete().eq('account_id',account.id).eq('item_id',item.id);if(e)return setError(e.message);setWishlist(current=>current.filter(row=>row.item_id!==item.id))}else{const {data,error:e}=await client.from('boutique_wishlist').insert({account_id:account.id,item_id:item.id}).select('*').single();if(e)return setError(e.message);setWishlist(current=>[data,...current])}}
 function buyButton(item:BoutiqueCatalogItem,compact=false){const row=owned.get(item.id),priced=hasPrice(item),enough=priced&&(wallet?.balance??0)>=item.price_petals,repeat=item.item_type==='hanami_plus_pass',can=priced&&enough&&(!row||repeat);if(mode==='my-inventory'&&catalogView==='mode')return equippableTypes.has(item.item_type)?<a className="boutique-v3-equip" href="#/profile/profile-studio" onClick={e=>e.stopPropagation()}>Equip</a>:<span className="boutique-v3-owned">Owned ×{row?.quantity??1}</span>;return <button className={`boutique-v3-buy ${!priced?'price-tbd':''}`} disabled={!can||working===item.id} onClick={e=>{e.stopPropagation();void purchase(item)}}>{working===item.id?'Purchasing…':row&&!repeat?'Owned':!priced?'Price TBD':!enough?'Need more Petals':compact?`❀ ${item.price_petals}`:`Buy for ❀ ${item.price_petals}`}</button>}
 function heart(item:BoutiqueCatalogItem){return <button className={`boutique-v3-heart ${wished.has(item.id)?'wished':''}`} type="button" aria-label={wished.has(item.id)?'Remove from wishlist':'Add to wishlist'} onClick={e=>{e.stopPropagation();void toggleWish(item)}}>{wished.has(item.id)?'♥':'♡'}</button>}
 function card(item:BoutiqueCatalogItem){const row=owned.get(item.id),bundle=(collectionCounts.get(item.collection_name||'')||0)>=3,seasonal=seasonalLabel(item),animated=isAnimated(item);return <article className={`boutique-v3-card rarity-${item.rarity} ${hero?.id===item.id?'selected':''} ${seasonal?'seasonal-card':''}`} key={item.id} onClick={()=>setPreviewId(item.id)}><div className="boutique-v3-card-art"><BoutiqueProductArtwork name={item.name} type={item.item_type} animated={animated}/>{heart(item)}<div className="boutique-v3-flags">{item.is_new&&<span>NEW</span>}{bundle&&<span>BUNDLE SET</span>}{seasonal&&<span className="season-chip">{seasonal}</span>}{animated&&<span>ANIMATED</span>}{row&&<span>OWNED</span>}</div></div><div className="boutique-v3-card-copy"><span className="boutique-v3-collection">{item.collection_name||item.season}</span><h3>{item.name}</h3><p>{item.description}</p><div className="boutique-v3-meta"><span>{typeLabels[item.item_type]||item.item_type}</span><span>{item.rarity}</span></div></div><footer><strong className={!hasPrice(item)?'price-tbd-label':''}>{row?'In inventory':priceLabel(item)}</strong>{buyButton(item,true)}</footer></article>}

 return <main className="content-area boutique-page boutique-v3">
  <ShellTopbar eyebrow="BOUTIQUE" title={viewTitle} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
  <section className="boutique-v3-shell">
   <header className="boutique-v3-storehead"><div><span className="boutique-v3-brandmark">✿</span><div><strong>Hanami Boutique</strong><small>Collectible cosmetics · school network · 2006</small></div></div><nav><a href="#/boutique/featured">Featured</a><button type="button" onClick={()=>{setCatalogView('browse');setCatalogQuery('');setPreviewId(null)}}>Browse</button><a href="#/boutique/new">New</a><a href="#/boutique/seasonal">Seasonal</a><a href="#/boutique/my-inventory">Inventory</a></nav><div className="boutique-v3-account"><button type="button" onClick={()=>{setCatalogView('wishlist');setCatalogQuery('');setPreviewId(null)}}>♥ <span>{wishlist.length}</span></button><div><small>YOUR PETALS</small><strong>❀ {wallet?.balance??0}</strong></div></div></header>
   <div className="boutique-v3-categories">{categoryLinks.map(([href,label])=><a key={href} href={href}>{label}</a>)}</div>
   <div className="boutique-v3-toolbar"><div><span className="eyebrow">{catalogView==='wishlist'?'SAVED COLLECTION':catalogView==='browse'?'FULL CATALOG':'HANAMI COLLECTIBLES'}</span><h1>{viewTitle}</h1><p>{viewDescription}</p></div><label><span>⌕</span><input value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder="Search cosmetics, collections, effects…"/><small>{visible.length} items</small></label></div>
   {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
   {loading?<div className="boutique-v3-empty">Loading the Boutique…</div>:<>
    {hero&&<section className={`boutique-v3-hero rarity-${hero.rarity} ${seasonalLabel(hero)?'seasonal-hero':''}`}><div className="boutique-v3-hero-art"><BoutiqueProductArtwork name={hero.name} type={hero.item_type} large animated={isAnimated(hero)}/>{heart(hero)}{isAnimated(hero)&&<span className="boutique-v3-animated-chip">✦ ANIMATED</span>}{seasonalLabel(hero)&&<span className="boutique-v3-season-chip">{seasonalLabel(hero)}</span>}</div><div className="boutique-v3-hero-copy"><div className="boutique-v3-meta"><span>{typeLabels[hero.item_type]||hero.item_type}</span><span>{hero.rarity}</span>{hero.is_new&&<span>new</span>}{(collectionCounts.get(hero.collection_name||'')||0)>=3&&<span>matching set</span>}</div><span className="eyebrow">{hero.collection_name||hero.season}</span><h2>{hero.name}</h2><p>{hero.description}</p><div className="boutique-v3-price"><strong className={!hasPrice(hero)?'price-tbd-label':''}>{priceLabel(hero)}</strong>{hero.pass_days&&<small>{hero.pass_days} days of Hanami+</small>}{!hasPrice(hero)&&<small>Preview now · owner will set Petal price</small>}</div><div className="boutique-v3-actions">{buyButton(hero)}<button type="button" onClick={()=>void toggleWish(hero)}>{wished.has(hero.id)?'♥ Wishlisted':'♡ Add to wishlist'}</button></div><div className="boutique-v3-ownership"><span>Account owns purchases</span><span>Character equips cosmetics</span>{plusActive&&<span>Hanami+ active</span>}</div></div></section>}
    {mode==='my-inventory'&&catalogView==='mode'&&<section className="boutique-v3-stats"><article><span>Owned</span><strong>{ownedCount}</strong></article><article><span>Wishlist</span><strong>{wishlist.length}</strong></article><article><span>Character</span><strong>{characterName}</strong></article><article><span>Hanami+</span><strong>{plusActive?'Active':'Standard'}</strong></article></section>}
    {catalogView==='mode'&&mode==='featured'?<div className="boutique-v3-collection-stack">{collections.map(([collection,rows])=><section className={`boutique-v3-shelf ${rows.some(row=>row.season==='fall')?'halloween-shelf':''}`} key={collection}><header><div><span className="eyebrow">{rows.some(row=>row.season==='fall')?'HALLOWEEN 2006 COLLECTION':'MATCHING COLLECTION'}</span><h2>{collection}</h2></div><span>{rows.length>=3?`${rows.length}-piece matching set`:`${rows.length} collectible${rows.length===1?'':'s'}`}</span></header><div className="boutique-v3-grid">{rows.map(card)}</div></section>)}</div>:<section className={`boutique-v3-shelf ${visible.some(row=>row.season==='fall')?'halloween-shelf':''}`}><header><div><span className="eyebrow">{catalogView==='wishlist'?'WISHLIST':mode==='my-inventory'?'ACCOUNT INVENTORY':mode==='seasonal'?'HALLOWEEN 2006 + SEASONAL':'CATALOG'}</span><h2>{viewTitle}</h2></div><span>{visible.length} item{visible.length===1?'':'s'}</span></header>{visible.length?<div className="boutique-v3-grid">{visible.map(card)}</div>:<div className="boutique-v3-empty">{catalogView==='wishlist'?'Your wishlist is empty. Tap ♡ on any item to save it here.':'No items are available in this collection yet.'}</div>}</section>}
   </>}
  </section>
 </main>
}
