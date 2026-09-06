"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./AppearanceCollectiblesPanel.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type StoreItem={id:string;label:string;category:string;description:string;rarity:string;cosmetic_slot:string|null;metadata:Record<string,unknown>};
type Ownership={item_id:string};
type Equipped={slot:string;item_id:string};

function headers(token:string,extra:Record<string,string>={}){return {apikey:K,Authorization:`Bearer ${token}`,...extra};}
function metadataLabel(item:StoreItem){const parts:string[]=[];const metadata=item.metadata??{};if(typeof metadata.accent==="string")parts.push("Accent");if(typeof metadata.surface==="string"||typeof metadata.sidebar==="string")parts.push("Panel treatment");if(typeof metadata.font==="string")parts.push("Font");if(typeof metadata.effect==="string")parts.push("Effect");return parts.length?parts.join(" · "):"Approved cosmetic";}

export default function AppearanceCollectiblesPanel({accessToken,characterId}:{accessToken:string;characterId:string}){
 const [items,setItems]=useState<StoreItem[]>([]);const [owned,setOwned]=useState<Ownership[]>([]);const [equipped,setEquipped]=useState<Equipped[]>([]);const [busy,setBusy]=useState("");const [message,setMessage]=useState("");
 const ownedIds=useMemo(()=>new Set(owned.map(row=>row.item_id)),[owned]);
 const wardrobe=useMemo(()=>items.filter(item=>item.cosmetic_slot&&ownedIds.has(item.id)),[items,ownedIds]);
 const load=useCallback(async()=>{if(!characterId)return;try{const [itemR,ownedR,equippedR]=await Promise.all([
  fetch(`${U}/rest/v1/school_store_items?select=id,label,category,description,rarity,cosmetic_slot,metadata&active=eq.true&cosmetic_slot=not.is.null&order=category.asc,label.asc`,{headers:headers(accessToken),cache:"no-store"}),
  fetch(`${U}/rest/v1/account_store_ownership?select=item_id`,{headers:headers(accessToken),cache:"no-store"}),
  fetch(`${U}/rest/v1/character_equipped_store_items?select=slot,item_id&character_id=eq.${encodeURIComponent(characterId)}`,{headers:headers(accessToken),cache:"no-store"})
 ]);if(itemR.ok)setItems(await itemR.json() as StoreItem[]);if(ownedR.ok)setOwned(await ownedR.json() as Ownership[]);if(equippedR.ok)setEquipped(await equippedR.json() as Equipped[]);}catch{setMessage("Your Exchange wardrobe could not be loaded.")}},[accessToken,characterId]);
 useEffect(()=>{void load()},[load]);
 async function equip(item:StoreItem){if(!item.cosmetic_slot)return;setBusy(item.id);setMessage("");try{const response=await fetch(`${U}/rest/v1/character_equipped_store_items?on_conflict=character_id,slot`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"}),body:JSON.stringify({character_id:characterId,slot:item.cosmetic_slot,item_id:item.id})});if(!response.ok)throw new Error("This cosmetic could not be equipped.");setMessage(`${item.label} equipped for this character.`);await load();window.dispatchEvent(new CustomEvent("hanami-portal-theme-changed",{detail:{characterId}}));}catch(error){setMessage(error instanceof Error?error.message:"Equip failed.");}finally{setBusy("")}}
 async function unequip(slot:string){setBusy(slot);setMessage("");try{const response=await fetch(`${U}/rest/v1/character_equipped_store_items?character_id=eq.${encodeURIComponent(characterId)}&slot=eq.${encodeURIComponent(slot)}`,{method:"DELETE",headers:headers(accessToken,{Prefer:"return=minimal"})});if(!response.ok)throw new Error("This cosmetic could not be unequipped.");setMessage("Cosmetic removed from this character.");await load();window.dispatchEvent(new CustomEvent("hanami-portal-theme-changed",{detail:{characterId}}));}catch(error){setMessage(error instanceof Error?error.message:"Unequip failed.");}finally{setBusy("")}}
 return <section className={styles.panel} aria-label="Exchange wardrobe"><header><div><p className={styles.eyebrow}>HANAMI CUSTOMIZATION</p><h3>Exchange Wardrobe</h3><p>Apply cosmetics your account already owns. These may change approved colors, panel treatment, fonts, or effects, but never portal geometry.</p></div><span>{wardrobe.length} owned</span></header>{message&&<p className={styles.notice}>{message}</p>}{wardrobe.length===0?<div className={styles.empty}><strong>No Exchange cosmetics owned yet.</strong><span>Visit Exchange to collect approved cosmetics with Petals, then return here to equip them.</span></div>:<div className={styles.grid}>{wardrobe.map(item=>{const active=equipped.find(row=>row.item_id===item.id);const occupying=equipped.find(row=>row.slot===item.cosmetic_slot);return <article key={item.id} className={active?styles.activeCard:styles.card}><div className={styles.top}><span>{item.category}</span><em>{item.rarity}</em></div><h4>{item.label}</h4><p>{item.description}</p><small>{metadataLabel(item)}</small><footer><span>{item.cosmetic_slot?.replaceAll("_"," ")}</span>{active?<button type="button" disabled={busy===active.slot} onClick={()=>void unequip(active.slot)}>{busy===active.slot?"Working…":"Unequip"}</button>:<button type="button" disabled={busy===item.id} onClick={()=>void equip(item)}>{busy===item.id?"Working…":occupying?"Replace equipped":"Equip"}</button>}</footer></article>})}</div>}</section>;
}
