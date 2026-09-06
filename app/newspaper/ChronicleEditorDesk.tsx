"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import styles from "./ChronicleEditorDesk.module.css";

const U=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const K=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";
const SESSION_KEY="hanami.portal.session.v1";

type Session={accessToken:string};
type Capability={chronicle_publish:boolean};
type AdminAccess={site_admin:boolean;content_editor:boolean;moderator:boolean};
type Character={id:string;display_name:string;handle:string};
type Editor={character_id:string;title:string};
type Article={id:string;author_character_id:string|null;section:string;headline:string;dek:string;body:string;status:string;published_at:string|null;updated_at:string};
type Draft={id:string|null;author_character_id:string|null;section:string;headline:string;dek:string;body:string};

const EMPTY:Draft={id:null,author_character_id:null,section:"news",headline:"",dek:"",body:""};
function headers(token:string,extra:Record<string,string>={}){return {apikey:K,Authorization:`Bearer ${token}`,...extra};}
function session():Session|null{try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const parsed=JSON.parse(raw) as Partial<Session>;return typeof parsed.accessToken==="string"?{accessToken:parsed.accessToken}:null;}catch{return null;}}
async function rpc<T>(token:string,name:string,body:Record<string,unknown>={}){const r=await fetch(`${U}/rest/v1/rpc/${name}`,{method:"POST",headers:headers(token,{"Content-Type":"application/json"}),body:JSON.stringify(body)});if(!r.ok){let message="Request failed.";try{const e=await r.json() as {message?:string};if(e.message)message=e.message}catch{}throw new Error(message)}if(r.status===204)return undefined as T;const text=await r.text();return (text?JSON.parse(text):undefined) as T;}

export default function ChronicleEditorDesk(){
 const [token,setToken]=useState("");
 const [enabled,setEnabled]=useState(false);
 const [adminEditor,setAdminEditor]=useState(false);
 const [characters,setCharacters]=useState<Character[]>([]);
 const [editors,setEditors]=useState<Editor[]>([]);
 const [articles,setArticles]=useState<Article[]>([]);
 const [draft,setDraft]=useState<Draft>(EMPTY);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState("Checking Chronicle access…");
 const editorCharacters=useMemo(()=>{const ids=new Set(editors.map(e=>e.character_id));return characters.filter(c=>ids.has(c.id));},[characters,editors]);

 const loadDesk=useCallback(async(accessToken:string)=>{try{
  const userR=await fetch(`${U}/auth/v1/user`,{headers:headers(accessToken),cache:"no-store"});if(!userR.ok)throw new Error("Your portal session has expired.");const user=await userR.json() as {id?:string};if(!user.id)throw new Error("Your Hanami account could not be resolved.");
  const cap=await rpc<Capability[]>(accessToken,"current_publishing_capabilities");if(!cap[0]?.chronicle_publish){setEnabled(false);setStatus("");return;}
  const [adminR,charR,editorR,articleR]=await Promise.all([
   fetch(`${U}/rest/v1/rpc/current_account_admin_access`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:"{}",cache:"no-store"}),
   fetch(`${U}/rest/v1/characters?select=id,display_name,handle&owner_user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&order=slot.asc`,{headers:headers(accessToken),cache:"no-store"}),
   fetch(`${U}/rest/v1/newspaper_editors?select=character_id,title`,{headers:headers(accessToken),cache:"no-store"}),
   fetch(`${U}/rest/v1/newspaper_articles?select=id,author_character_id,section,headline,dek,body,status,published_at,updated_at&order=updated_at.desc&limit=80`,{headers:headers(accessToken),cache:"no-store"})
  ]);
  const access=adminR.ok?((await adminR.json() as AdminAccess[])[0]??null):null;
  const chars=charR.ok?await charR.json() as Character[]:[];
  const editorRows=editorR.ok?await editorR.json() as Editor[]:[];
  const articleRows=articleR.ok?await articleR.json() as Article[]:[];
  setAdminEditor(Boolean(access?.site_admin||access?.content_editor));setCharacters(chars);setEditors(editorRows);setArticles(articleRows);setEnabled(true);
  const ownEditorIds=new Set(editorRows.map(row=>row.character_id));const first=chars.find(c=>ownEditorIds.has(c.id));
  setDraft(current=>current.id?current:{...current,author_character_id:first?.id??null});
  setStatus(`${articleRows.filter(a=>a.status!=="published").length} working draft${articleRows.filter(a=>a.status!=="published").length===1?"":"s"} in your editorial scope.`);
 }catch(error){setEnabled(false);setStatus(error instanceof Error?error.message:"Chronicle editor access could not be loaded.")}},[]);

 useEffect(()=>{const stored=session();if(!stored){setStatus("");return;}setToken(stored.accessToken);void loadDesk(stored.accessToken);},[loadDesk]);
 function startNew(){const author=editorCharacters[0]?.id??null;setDraft({...EMPTY,author_character_id:author});}
 function edit(article:Article){setDraft({id:article.id,author_character_id:article.author_character_id,section:article.section,headline:article.headline,dek:article.dek,body:article.body});}
 async function save(event:FormEvent){event.preventDefault();if(!token||busy)return;setBusy(true);setStatus("Saving Chronicle draft…");try{const id=await rpc<string>(token,"chronicle_save_article",{target_article_id:draft.id,target_author_character_id:draft.author_character_id,requested_section:draft.section,requested_headline:draft.headline,requested_dek:draft.dek,requested_body:draft.body});setDraft(d=>({...d,id}));await loadDesk(token);setStatus("Chronicle draft saved.");}catch(error){setStatus(error instanceof Error?error.message:"Draft could not be saved.")}finally{setBusy(false)}}
 async function publish(articleId:string){if(!token||busy)return;setBusy(true);setStatus("Sending story to the Chronicle front page…");try{await rpc<void>(token,"chronicle_publish_article",{target_article_id:articleId});await loadDesk(token);if(draft.id===articleId)startNew();setStatus("Story published to the Hanami Chronicle.");window.dispatchEvent(new Event("hanami-chronicle-published"));}catch(error){setStatus(error instanceof Error?error.message:"Story could not be published.")}finally{setBusy(false)}}
 async function archive(articleId:string){if(!token||busy)return;setBusy(true);try{await rpc<void>(token,"chronicle_archive_article",{target_article_id:articleId});await loadDesk(token);if(draft.id===articleId)startNew();setStatus("Story archived.");}catch(error){setStatus(error instanceof Error?error.message:"Story could not be archived.")}finally{setBusy(false)}}
 if(!enabled)return null;
 const working=articles.filter(article=>article.status!=="published");
 return <section className={styles.desk} aria-label="Chronicle editorial desk"><header><div><p>CHRONICLE STAFF ACCESS</p><h2>Editorial Desk</h2><span>Reader pages and editor tools stay separate. Only accounts with <code>chronicle_publish</code> can see this desk.</span></div><button type="button" onClick={startNew}>New story</button></header><div className={styles.layout}><form onSubmit={save} className={styles.editor}><label>BYLINE<select value={draft.author_character_id??""} onChange={e=>setDraft(d=>({...d,author_character_id:e.target.value||null}))}>{adminEditor&&<option value="">Hanami Chronicle Staff</option>}{editorCharacters.map(c=><option key={c.id} value={c.id}>{c.display_name} · @{c.handle}</option>)}</select></label><label>SECTION<input value={draft.section} maxLength={32} onChange={e=>setDraft(d=>({...d,section:e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,"")}))} placeholder="news" required/></label><label className={styles.wide}>HEADLINE<input value={draft.headline} minLength={3} maxLength={180} onChange={e=>setDraft(d=>({...d,headline:e.target.value}))} required/></label><label className={styles.wide}>DEK / SUMMARY<textarea rows={3} maxLength={500} value={draft.dek} onChange={e=>setDraft(d=>({...d,dek:e.target.value}))}/></label><label className={styles.wide}>ARTICLE<textarea rows={14} maxLength={30000} value={draft.body} onChange={e=>setDraft(d=>({...d,body:e.target.value}))} required/></label><div className={styles.actions}><button type="submit" disabled={busy}>{busy?"Working…":draft.id?"Save changes":"Save draft"}</button>{draft.id&&<button type="button" disabled={busy} onClick={()=>void publish(draft.id!)}>Publish</button>}</div></form><aside className={styles.queue}><h3>Working Queue</h3>{working.length===0?<p>No unpublished stories are waiting.</p>:working.map(article=><article key={article.id}><small>{article.section.toUpperCase()} · {article.status.toUpperCase()}</small><strong>{article.headline}</strong><span>Updated {new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(article.updated_at))}</span><div><button type="button" onClick={()=>edit(article)}>Edit</button><button type="button" disabled={busy} onClick={()=>void publish(article.id)}>Publish</button><button type="button" disabled={busy} onClick={()=>void archive(article.id)}>Archive</button></div></article>)}</aside></div><footer aria-live="polite">{status}</footer></section>;
}
