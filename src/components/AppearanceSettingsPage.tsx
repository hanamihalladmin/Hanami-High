import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { notifyInterfacePreferencesChanged } from '../hooks/useInterfacePreferences'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AccountPreferences, AccountSiteThemePreset, ThemeGlossMode } from '../types/database-settings'
import { ShellTopbar } from './ShellTopbar'
import '../styles/appearance-control-center.css'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type Palette={ink:string;soft:string;paper:string;surface:string;border:string;accent:string;text:string;textSecondary:string;link:string;glossMode:ThemeGlossMode;glossColor:string;glossStrength:number}
type ColorKey='ink'|'soft'|'paper'|'surface'|'border'|'accent'|'text'|'textSecondary'|'link'

const themes=[
 {id:'hanami',name:'Hanami',mood:'School default',swatches:['#4f6f5b','#8eaa94','#fffefd','#e27f9f']},
 {id:'sakura',name:'Sakura',mood:'Pink & nostalgic',swatches:['#452238','#ae9088','#fffafb','#df7298']},
 {id:'sage',name:'Sage',mood:'Garden notebook',swatches:['#233a33','#78947d','#fbfcf7','#bd7e8f']},
 {id:'navy',name:'Navy',mood:'Classic school',swatches:['#13203d','#8398a8','#fbfcff','#aa78a0']},
] as const
const defaultCustom:Palette={ink:'#243249',soft:'#8fa394',paper:'#f6f4ef',surface:'#fffdf8',border:'#c9d1ca',accent:'#d39aae',text:'#26322b',textSecondary:'#69746d',link:'#a84f72',glossMode:'soft',glossColor:'#ffffff',glossStrength:55}
const colorFields:Array<{key:ColorKey;label:string;hint:string}>=[
 {key:'ink',label:'Primary',hint:'Navigation and strongest interface color'},
 {key:'soft',label:'Secondary',hint:'Supporting panels and subtle UI color'},
 {key:'paper',label:'Background',hint:'Website canvas behind panels'},
 {key:'surface',label:'Surface',hint:'Cards, modules, dialogs, and inputs'},
 {key:'border',label:'Border',hint:'Panel outlines, dividers, and separators'},
 {key:'accent',label:'Accent',hint:'Buttons, selected states, badges, highlights'},
 {key:'text',label:'Text',hint:'Primary readable text'},
 {key:'textSecondary',label:'Muted text',hint:'Descriptions, metadata, timestamps'},
 {key:'link',label:'Link',hint:'Clickable text and navigation emphasis'},
]
const glossModes:Array<{id:ThemeGlossMode;label:string;description:string}>=[
 {id:'none',label:'Flat',description:'No shine. Best for very dark, monochrome, or matte palettes.'},
 {id:'soft',label:'Soft',description:'A light early-web sheen with gentle depth.'},
 {id:'glass',label:'Glass',description:'Brighter highlights and a clearer glossy Web 2.0 finish.'},
 {id:'metallic',label:'Metallic',description:'Banded shine with stronger light and shadow contrast.'},
]

function fromPreferences(data:AccountPreferences):Palette{return {ink:data.custom_theme_ink||defaultCustom.ink,soft:data.custom_theme_soft||defaultCustom.soft,paper:data.custom_theme_paper||defaultCustom.paper,surface:data.custom_theme_surface||data.custom_theme_paper||defaultCustom.surface,border:data.custom_theme_border||data.custom_theme_soft||defaultCustom.border,accent:data.custom_theme_accent||defaultCustom.accent,text:data.custom_theme_text||data.custom_theme_ink||defaultCustom.text,textSecondary:data.custom_theme_text_secondary||data.custom_theme_soft||defaultCustom.textSecondary,link:data.custom_theme_link||data.custom_theme_accent||defaultCustom.link,glossMode:data.custom_theme_gloss_mode||defaultCustom.glossMode,glossColor:data.custom_theme_gloss_color||defaultCustom.glossColor,glossStrength:data.custom_theme_gloss_strength??defaultCustom.glossStrength}}
function fromPreset(row:AccountSiteThemePreset):Palette{return {ink:row.ink,soft:row.soft,paper:row.paper,surface:row.surface,border:row.border,accent:row.accent,text:row.text_primary,textSecondary:row.text_secondary,link:row.link,glossMode:row.gloss_mode||defaultCustom.glossMode,glossColor:row.gloss_color||defaultCustom.glossColor,glossStrength:row.gloss_strength??defaultCustom.glossStrength}}
function hexRgb(hex:string){const m=/^#([0-9a-f]{6})$/i.exec(hex);if(!m)return null;const n=parseInt(m[1],16);return [(n>>16)&255,(n>>8)&255,n&255] as const}
function luminance(hex:string){const rgb=hexRgb(hex);if(!rgb)return 0;const values=rgb.map(v=>{const s=v/255;return s<=.03928?s/12.92:Math.pow((s+.055)/1.055,2.4)});return values[0]*.2126+values[1]*.7152+values[2]*.0722}
function contrast(a:string,b:string){const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}

export function AppearanceSettingsPage({onSearch,onNotifications,unreadCount}:Props){
 const {account,activeCharacter}=useIdentity()
 const [prefs,setPrefs]=useState<AccountPreferences|null>(null)
 const [presets,setPresets]=useState<AccountSiteThemePreset[]>([])
 const [plusActive,setPlusActive]=useState(false)
 const [custom,setCustom]=useState<Palette>(defaultCustom)
 const [presetName,setPresetName]=useState('')
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState(false)
 const [error,setError]=useState<string|null>(null)
 const [notice,setNotice]=useState<string|null>(null)

 const load=useCallback(async()=>{const client=supabase;if(!client||!account)return;setLoading(true);const [preferenceResult,plusResult,presetResult]=await Promise.all([client.from('account_preferences').select('*').eq('account_id',account.id).maybeSingle(),client.from('hanami_plus_entitlements').select('ends_at').eq('account_id',account.id).maybeSingle(),client.from('account_site_theme_presets').select('*').eq('account_id',account.id).order('updated_at',{ascending:false})]);setLoading(false);const first=preferenceResult.error||plusResult.error||presetResult.error;if(first)return setError(first.message);const data=preferenceResult.data;setPrefs(data);setPlusActive(Boolean(plusResult.data&&new Date(plusResult.data.ends_at).getTime()>Date.now()));setPresets(presetResult.data??[]);if(data)setCustom(fromPreferences(data))},[account])
 useEffect(()=>{void load()},[load])

 async function save(patch:Partial<AccountPreferences>){const client=supabase;if(!client||!account)return;setWorking(true);setError(null);setNotice(null);const {error:updateError}=await client.from('account_preferences').update(patch).eq('account_id',account.id);setWorking(false);if(updateError)return setError(updateError.message);setPrefs(current=>current?{...current,...patch}:current);notifyInterfacePreferencesChanged();setNotice('Appearance preferences saved.')}
 async function applyCustom(palette:Palette,enabled=true){const client=supabase;if(!client)return;setWorking(true);setError(null);setNotice(null);const {error:rpcError}=await client.rpc('set_my_custom_site_theme_v3',{p_enabled:enabled,p_ink:palette.ink,p_soft:palette.soft,p_paper:palette.paper,p_surface:palette.surface,p_border:palette.border,p_accent:palette.accent,p_text:palette.text,p_text_secondary:palette.textSecondary,p_link:palette.link,p_gloss_mode:palette.glossMode,p_gloss_color:palette.glossColor,p_gloss_strength:palette.glossStrength});setWorking(false);if(rpcError)return setError(rpcError.message);setCustom(palette);setPrefs(current=>current?{...current,custom_theme_enabled:enabled,custom_theme_ink:palette.ink,custom_theme_soft:palette.soft,custom_theme_paper:palette.paper,custom_theme_surface:palette.surface,custom_theme_border:palette.border,custom_theme_accent:palette.accent,custom_theme_text:palette.text,custom_theme_text_secondary:palette.textSecondary,custom_theme_link:palette.link,custom_theme_gloss_mode:palette.glossMode,custom_theme_gloss_color:palette.glossColor,custom_theme_gloss_strength:palette.glossStrength}:current);notifyInterfacePreferencesChanged();setNotice(enabled?'Custom Hanami+ website theme applied.':'Returned to your selected school preset.')}
 async function savePreset(){const client=supabase;if(!client||!account||!presetName.trim())return;setWorking(true);setError(null);const {data,error:e}=await client.from('account_site_theme_presets').insert({account_id:account.id,name:presetName.trim(),ink:custom.ink,soft:custom.soft,paper:custom.paper,surface:custom.surface,border:custom.border,accent:custom.accent,text_primary:custom.text,text_secondary:custom.textSecondary,link:custom.link,gloss_mode:custom.glossMode,gloss_color:custom.glossColor,gloss_strength:custom.glossStrength}).select('*').single();setWorking(false);if(e)return setError(e.message);setPresets(current=>[data,...current]);setPresetName('');setNotice(`Saved “${data.name}” to your Hanami+ palettes.`)}
 async function deletePreset(id:string){const client=supabase;if(!client)return;setWorking(true);const {error:e}=await client.from('account_site_theme_presets').delete().eq('id',id);setWorking(false);if(e)return setError(e.message);setPresets(current=>current.filter(row=>row.id!==id));setNotice('Saved palette deleted.')}

 const selectedTheme=useMemo(()=>themes.find(theme=>theme.id===prefs?.site_theme)??themes[0],[prefs?.site_theme])
 const characterName=activeCharacter?.display_name||activeCharacter?.first_name||'Current character'
 const contrastChecks=useMemo(()=>[
  {label:'Text on background',value:contrast(custom.text,custom.paper)},
  {label:'Text on surface',value:contrast(custom.text,custom.surface)},
  {label:'Muted text on surface',value:contrast(custom.textSecondary,custom.surface)},
  {label:'Links on background',value:contrast(custom.link,custom.paper)},
 ],[custom])
 const hasWarning=contrastChecks.some(row=>row.value<4.5)
 const previewStyle={
  '--preview-ink':custom.ink,'--preview-soft':custom.soft,'--preview-paper':custom.paper,'--preview-surface':custom.surface,'--preview-border':custom.border,'--preview-accent':custom.accent,'--preview-text':custom.text,'--preview-muted':custom.textSecondary,'--preview-link':custom.link,'--preview-gloss-color':custom.glossColor,'--preview-gloss-strength':`${custom.glossStrength}%`,
 } as CSSProperties

 return <main className="content-area settings-page appearance-settings-page theme-builder-v2">
  <ShellTopbar eyebrow="SETTINGS" title="Appearance & Accessibility" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
  <div className="settings-intro"><div><span className="eyebrow">PERSONAL INTERFACE</span><h1>Make Hanami yours.</h1><p>Standard members can use official Hanami palettes. Hanami+ members can build, save, and switch complete website color systems.</p></div><div className="settings-intro-identity"><span className="settings-scope-tag">ACCOUNT-WIDE</span><strong>{prefs?.custom_theme_enabled?'Custom Hanami+':selectedTheme.name}</strong><small>{characterName}</small></div></div>
  {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
  {loading||!prefs?<div className="settings-empty">Loading appearance settings…</div>:<div className="settings-stack">
   <section className="theme-builder-preview" data-preview-gloss={custom.glossMode} style={previewStyle}>
    <div className="theme-builder-preview-copy"><span className="eyebrow">LIVE WEBSITE PREVIEW</span><h2>Your whole Hanami interface.</h2><p>Preview navigation, surfaces, text, links, cards, selected states, and your gloss finish before applying the palette.</p><div className="theme-builder-preview-tags"><span>account-wide</span><span>{plusActive?'Hanami+ active':'Hanami+ required'}</span><span>{custom.glossMode==='none'?'matte finish':`${custom.glossMode} gloss · ${custom.glossStrength}%`}</span><span>{hasWarning?'contrast warning':'contrast looks good'}</span></div></div>
    <div className="theme-builder-mini"><aside><b>✿</b><span>home</span><span>profile</span><span>social</span><span className="selected">boutique</span><span>settings</span></aside><section><header><strong>Hanami High</strong><a>Search</a></header><div className="theme-builder-mini-hero"><small>WELCOME BACK</small><b>{characterName}</b><p>Your classes, friends, and collectibles are ready.</p><button>View profile</button></div><div className="theme-builder-mini-grid"><article><small>SHOP</small><strong>Spring Daydream</strong><a>Browse collection →</a></article><article><small>TODAY</small><strong>School network</strong><span>Connected · Tokyo</span></article></div></section></div>
   </section>

   <section className="settings-panel custom-theme-panel"><header><div><span className="eyebrow">HANAMI+ THEME BUILDER</span><h2>Custom website colors</h2></div><span className="settings-scope-tag">{plusActive?'HANAMI+ ACTIVE':'HANAMI+ REQUIRED'}</span></header><p className="custom-theme-explainer">Each color has one job, so custom palettes stay consistent across Home, Messages, Academics, Boutique, Settings, and the rest of the V2 shell.</p>
    <div className="theme-builder-color-grid">{colorFields.map(field=><label key={field.key}><div><strong>{field.label}</strong><small>{field.hint}</small></div><span className="theme-builder-color-control"><input type="color" value={custom[field.key]} disabled={!plusActive||working} onChange={e=>setCustom({...custom,[field.key]:e.target.value})}/><input type="text" value={custom[field.key]} disabled={!plusActive||working} maxLength={7} onChange={e=>setCustom({...custom,[field.key]:e.target.value})}/></span></label>)}</div>

    <section className="theme-gloss-editor"><header><div><span className="eyebrow">SURFACE FINISH</span><h3>Gloss & shine</h3><p>The old-web gloss no longer has to be white. Match it to your palette, soften it, make it glassy, or turn it off completely.</p></div><span>{custom.glossMode==='none'?'MATTE':`${custom.glossStrength}%`}</span></header><div className="theme-gloss-mode-grid">{glossModes.map(mode=><button type="button" key={mode.id} className={custom.glossMode===mode.id?'selected':''} disabled={!plusActive||working} onClick={()=>setCustom({...custom,glossMode:mode.id})}><strong>{mode.label}</strong><small>{mode.description}</small></button>)}</div><div className="theme-gloss-controls"><label><span><strong>Gloss tint</strong><small>Choose the highlight color. Dark palettes can use grey, pink, blue, or any matching tint instead of white.</small></span><span className="theme-builder-color-control"><input type="color" value={custom.glossColor} disabled={!plusActive||working||custom.glossMode==='none'} onChange={e=>setCustom({...custom,glossColor:e.target.value})}/><input type="text" value={custom.glossColor} maxLength={7} disabled={!plusActive||working||custom.glossMode==='none'} onChange={e=>setCustom({...custom,glossColor:e.target.value})}/></span></label><label><span><strong>Gloss strength</strong><small>{custom.glossStrength}% · controls how much the tint lifts panel and button surfaces.</small></span><input type="range" min="0" max="100" step="5" value={custom.glossStrength} disabled={!plusActive||working||custom.glossMode==='none'} onChange={e=>setCustom({...custom,glossStrength:Number(e.target.value)})}/></label></div></section>

    <div className="theme-builder-contrast"><header><strong>Readability check</strong><span>{hasWarning?'Some combinations need attention':'All primary checks pass'}</span></header><div>{contrastChecks.map(row=><span className={row.value>=4.5?'pass':'warn'} key={row.label}><b>{row.value.toFixed(1)}:1</b>{row.label}</span>)}</div></div>
    <div className="custom-theme-actions"><button className="primary-action" type="button" disabled={!plusActive||working} onClick={()=>void applyCustom(custom,true)}>{working?'Saving…':'Apply custom theme'}</button>{prefs.custom_theme_enabled&&<button className="secondary-action" type="button" disabled={working} onClick={()=>void applyCustom(custom,false)}>Use preset instead</button>}<button className="secondary-action" type="button" disabled={!plusActive||working} onClick={()=>setCustom(defaultCustom)}>Reset builder</button></div>
   </section>

   <section className="settings-panel theme-preset-library"><header><div><span className="eyebrow">SAVED HANAMI+ PALETTES</span><h2>Your theme library</h2></div><span>{presets.length} saved</span></header><div className="theme-preset-save"><input value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Palette name, e.g. Rainy Study Night" maxLength={40} disabled={!plusActive||working}/><button className="primary-action" type="button" onClick={()=>void savePreset()} disabled={!plusActive||working||!presetName.trim()}>Save current colors + gloss</button></div>{presets.length===0?<div className="settings-empty">No custom palettes saved yet. Build a palette above and save it here.</div>:<div className="theme-preset-grid">{presets.map(row=><article key={row.id}><div className="theme-preset-swatches">{[row.ink,row.soft,row.paper,row.surface,row.accent].map((color,index)=><span key={`${row.id}-${index}`} style={{background:color}}/>)}</div><div><strong>{row.name}</strong><small>{row.gloss_mode==='none'?'Matte':`${row.gloss_mode} gloss · ${row.gloss_strength}%`} · Updated {new Date(row.updated_at).toLocaleDateString()}</small></div><div><button type="button" disabled={!plusActive||working} onClick={()=>void applyCustom(fromPreset(row),true)}>Apply</button><button type="button" disabled={working} onClick={()=>setCustom(fromPreset(row))}>Edit</button><button type="button" disabled={working} onClick={()=>void deletePreset(row.id)}>Delete</button></div></article>)}</div>}</section>

   <section className="settings-panel theme-settings-panel"><header><div><span className="eyebrow">OFFICIAL THEMES</span><h2>Quick palettes for everyone</h2></div><span>{prefs.custom_theme_enabled?'Custom theme active':selectedTheme.name}</span></header><div className="site-theme-grid">{themes.map(theme=><button type="button" key={theme.id} className={`site-theme-card ${!prefs.custom_theme_enabled&&prefs.site_theme===theme.id?'selected':''}`} disabled={working} onClick={()=>void save({site_theme:theme.id,custom_theme_enabled:false})}><div className="site-theme-swatches">{theme.swatches.map(color=><span key={color} style={{background:color}}/>)}</div><div className="site-theme-card-title"><strong>{theme.name}</strong><em>{theme.mood}</em></div>{!prefs.custom_theme_enabled&&prefs.site_theme===theme.id&&<b>SELECTED</b>}</button>)}</div></section>

   <section className="settings-panel"><header><div><span className="eyebrow">ACCESSIBILITY & DENSITY</span><h2>How Hanami behaves</h2></div><span>Applies immediately</span></header><div className="settings-form-list"><label><div><strong>Reduced motion</strong><span>Disable nonessential transitions and animated cosmetics.</span></div><input type="checkbox" disabled={working} checked={prefs.reduced_motion} onChange={event=>void save({reduced_motion:event.target.checked})}/></label><label><div><strong>Compact mode</strong><span>Tighten spacing when you want more information on screen.</span></div><input type="checkbox" disabled={working} checked={prefs.compact_mode} onChange={event=>void save({compact_mode:event.target.checked})}/></label><label><div><strong>High contrast</strong><span>Strengthen borders and interface contrast.</span></div><input type="checkbox" disabled={working} checked={prefs.high_contrast} onChange={event=>void save({high_contrast:event.target.checked})}/></label><label><div><strong>Interface text size</strong><span>{prefs.font_scale}% · account-wide</span></div><input aria-label="Interface text size" type="range" min="90" max="130" step="5" disabled={working} value={prefs.font_scale} onChange={event=>setPrefs({...prefs,font_scale:Number(event.target.value)})} onMouseUp={event=>void save({font_scale:Number((event.target as HTMLInputElement).value)})}/></label></div></section>
  </div>}
 </main>
}
