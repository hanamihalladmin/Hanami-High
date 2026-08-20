"use client";

import {useEffect,useMemo,useState} from "react";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";
type Session={accessToken:string};
type Block={block_key:string;content:string};
type Editable={key:string;element:HTMLElement;baseline:string};

function publicPath(){let path=window.location.pathname;if(path.startsWith("/Hanami-High"))path=path.slice("/Hanami-High".length)||"/";if(!path.startsWith("/"))path=`/${path}`;return path.endsWith("/")&&path!=="/"?path.slice(0,-1):path;}
function readSession():Session|null{try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const parsed=JSON.parse(raw) as Partial<Session>;return typeof parsed.accessToken==="string"?{accessToken:parsed.accessToken}:null;}catch{return null;}}
function candidates(){const nodes=[...document.querySelectorAll<HTMLElement>("main h1,main h2,main h3,main h4,main p,main li,main blockquote,main figcaption")];return nodes.filter(node=>node.children.length===0&&!node.closest("form,button,a,nav,footer,[data-owner-editor-ignore]")&&(node.textContent??"").trim().length>0);}
function applyEditableState(items:Editable[],enabled:boolean){for(const item of items){item.element.contentEditable=enabled?"true":"false";item.element.spellcheck=enabled;item.element.dataset.ownerEditable=enabled?"true":"false";if(enabled){item.element.style.outline="1px dashed #9b315b";item.element.style.outlineOffset="3px";item.element.style.cursor="text";}else{item.element.style.removeProperty("outline");item.element.style.removeProperty("outline-offset");item.element.style.removeProperty("cursor");}}}

export default function PublicPageTextEditor(){
 const [owner,setOwner]=useState(false);const [editing,setEditing]=useState(false);const [status,setStatus]=useState("");const [items,setItems]=useState<Editable[]>([]);const [token,setToken]=useState("");const page=useMemo(()=>typeof window==="undefined"?"/":publicPath(),[]);
 useEffect(()=>{if(page.startsWith("/portal"))return;let cancelled=false;async function init(){const session=readSession();if(session){setToken(session.accessToken);try{const ownerResponse=await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_owner_status`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.accessToken}`,"Content-Type":"application/json"},body:"{}"});if(ownerResponse.ok&&!cancelled)setOwner(Boolean(await ownerResponse.json()));}catch{}}
 const detected=candidates().map((element,index)=>{const key=element.dataset.ownerTextKey??`${element.tagName.toLowerCase()}-${index}`;element.dataset.ownerTextKey=key;return {key,element,baseline:(element.textContent??"").trim()};});
 try{const response=await fetch(`${SUPABASE_URL}/rest/v1/public_page_text_blocks?select=block_key,content&page_path=eq.${encodeURIComponent(page)}`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});if(response.ok){const blocks=await response.json() as Block[];const map=new Map(blocks.map(block=>[block.block_key,block.content]));for(const item of detected){const override=map.get(item.key);if(typeof override==="string"){item.element.textContent=override;item.baseline=override;}}}}catch{}
 if(!cancelled)setItems(detected);}void init();return()=>{cancelled=true;};},[page]);
 useEffect(()=>{applyEditableState(items,editing);return()=>applyEditableState(items,false);},[editing,items]);
 async function save(){if(!token)return;setStatus("Saving page text…");let changed=0;for(const item of items){const content=(item.element.textContent??"").trim();if(content===item.baseline)continue;const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_save_public_page_text`,{method:"POST",headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({requested_page_path:page,requested_block_key:item.key,requested_content:content})});if(!response.ok){setStatus("One or more text blocks could not be saved.");return;}item.baseline=content;changed++;}setEditing(false);setStatus(changed?`${changed} text block${changed===1?"":"s"} published.`:"No text changes to publish.");}
 function cancel(){for(const item of items)item.element.textContent=item.baseline;setEditing(false);setStatus("Changes cancelled.");}
 if(!owner||page.startsWith("/portal"))return null;
 return <div style={{position:"fixed",right:14,bottom:14,zIndex:10050,width:"min(360px,calc(100vw - 28px))",border:"1px solid #7f2c4d",background:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,.2)",padding:10,fontFamily:"Arial,sans-serif",fontSize:12}} aria-label="Owner public page editor"><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong>OWNER PAGE EDITOR</strong><span>{page}</span></div><p style={{margin:"6px 0",fontSize:11}}>Edit plain text blocks directly on this public page. Dynamic school data stays managed by its normal Admin tools.</p><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{!editing?<button type="button" onClick={()=>{setEditing(true);setStatus("Click outlined text and type your changes.");}}>Edit page text</button>:<><button type="button" onClick={()=>void save()}>Publish changes</button><button type="button" onClick={cancel}>Cancel</button></>}</div>{status&&<small style={{display:"block",marginTop:6}}>{status}</small>}</div>;
}
