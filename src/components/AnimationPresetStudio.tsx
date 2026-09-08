import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json } from '../types/database'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CharacterAnimationPreset,CharacterAnimationSettings } from '../types/database-animation-presets'
import { ShellTopbar } from './ShellTopbar'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type Editable=Omit<CharacterAnimationSettings,'character_id'|'created_at'|'updated_at'>

const builtins:{key:string;name:string;note:string;settings:Partial<Editable>}[]=[
  {key:'soft-petals',name:'Soft Petals',note:'Gentle Hanami motion with drifting petals and soft reveals.',settings:{page_entrance:'soft-fade',widget_reveal:'stagger-fade',scene_item_motion:'gentle-float',ambient_effect:'petals',route_transition:'crossfade',hover_motion:'soft-lift',click_motion:'press',intensity:2,duration_ms:480,stagger_ms:55,ambient_density:2}},
  {key:'notebook-day',name:'Notebook Day',note:'Paper turns, dealt cards, tiny wiggles, and soft dust.',settings:{page_entrance:'paper-open',widget_reveal:'card-deal',scene_item_motion:'paper-wiggle',ambient_effect:'dust',route_transition:'paper-turn',hover_motion:'tilt',click_motion:'stamp',intensity:1,duration_ms:620,stagger_ms:70,ambient_density:1}},
  {key:'pixel-night',name:'Pixel Night',note:'Sharper 2000s loading motion with pixel stars and tiny blinks.',settings:{page_entrance:'pixel-load',widget_reveal:'pixel-load',scene_item_motion:'pixel-blink',ambient_effect:'pixel-stars',route_transition:'pixel-wipe',hover_motion:'pop',click_motion:'bounce',intensity:2,duration_ms:360,stagger_ms:35,ambient_density:2}},
  {key:'sparkle-pop',name:'Sparkle Pop',note:'Bright profile reveals with sparkle pulses and energetic clicks.',settings:{page_entrance:'petal-reveal',widget_reveal:'pop',scene_item_motion:'sparkle-pulse',ambient_effect:'sparkles',route_transition:'soft-slide',hover_motion:'glow-pulse',click_motion:'spark',intensity:3,duration_ms:420,stagger_ms:40,ambient_density:3}},
  {key:'quiet-room',name:'Quiet Room',note:'Minimal motion with no ambient layer for calmer layouts.',settings:{page_entrance:'soft-fade',widget_reveal:'stagger-fade',scene_item_motion:'none',ambient_effect:'none',route_transition:'crossfade',hover_motion:'soft-lift',click_motion:'press',intensity:1,duration_ms:520,stagger_ms:45,ambient_density:1}},
]

function toJson(settings:Editable):Json{return settings as unknown as Json}
function fromJson(value:Json):Partial<Editable>{return value&&typeof value==='object'&&!Array.isArray(value)?value as unknown as Partial<Editable>: {}}

export function AnimationPresetStudio({onSearch,onNotifications,unreadCount}:Props){
  const {activeCharacter}=useIdentity()
  const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
  const [settings,setSettings]=useState<CharacterAnimationSettings|null>(null)
  const [presets,setPresets]=useState<CharacterAnimationPreset[]>([])
  const [presetName,setPresetName]=useState('')
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)

  const load=useCallback(async()=>{
    const client=supabase;if(!client||!activeCharacter)return
    setLoading(true);setError(null)
    const hub=await client.rpc('current_hanami_plus_hub')
    if(hub.error){setLoading(false);setError(hub.error.message);return}
    const next=hub.data?.[0]??null;setSnapshot(next)
    if(next?.active){const ensure=await client.rpc('ensure_my_animation_settings',{p_character_id:activeCharacter.id});if(ensure.error){setLoading(false);setError(ensure.error.message);return}}
    const [settingResult,presetResult]=await Promise.all([
      client.from('character_animation_settings').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
      client.from('character_animation_presets').select('*').eq('character_id',activeCharacter.id).order('sort_order').order('created_at'),
    ])
    const first=settingResult.error||presetResult.error
    if(first){setLoading(false);setError(first.message);return}
    setSettings(settingResult.data);setPresets(presetResult.data??[]);setLoading(false)
  },[activeCharacter])
  useEffect(()=>{void load()},[load])

  const active=Boolean(snapshot?.active)
  const editable=useMemo(()=>settings?({...settings,character_id:undefined,created_at:undefined,updated_at:undefined} as unknown as Editable):null,[settings])
  function local<K extends keyof Editable>(key:K,value:Editable[K]){setSettings(current=>current?{...current,[key]:value}:current)}

  async function save(patch:Partial<Editable>,label='Motion settings saved.'){
    const client=supabase;if(!client||!activeCharacter||!settings||!active)return
    setWorking('save');setError(null);setNotice(null)
    const result=await client.from('character_animation_settings').update(patch).eq('character_id',activeCharacter.id)
    setWorking(null);if(result.error)return setError(result.error.message);setSettings(current=>current?{...current,...patch}:current);setNotice(label)
  }

  async function applyBuiltin(key:string){const preset=builtins.find(row=>row.key===key);if(!preset)return;await save({...preset.settings,active_preset_key:key},`${preset.name} applied.`)}
  async function applySaved(preset:CharacterAnimationPreset){await save({...fromJson(preset.settings),active_preset_key:preset.preset_key},`${preset.preset_name} applied.`)}

  async function saveCurrentPreset(){
    const client=supabase;if(!client||!activeCharacter||!editable||!active)return
    const name=presetName.trim();if(!name)return
    const key=`custom-${Date.now().toString(36)}`
    setWorking('preset');setError(null)
    const result=await client.from('character_animation_presets').insert({character_id:activeCharacter.id,preset_name:name,preset_key:key,settings:toJson(editable),sort_order:presets.length})
    setWorking(null);if(result.error)return setError(result.error.message);setPresetName('');setNotice('Motion preset saved.');await load()
  }

  async function removePreset(id:string){const client=supabase;if(!client||!active)return;setWorking(id);const result=await client.from('character_animation_presets').delete().eq('id',id);setWorking(null);if(result.error)return setError(result.error.message);setNotice('Preset removed.');await load()}

  if(!activeCharacter)return null
  return <main className="animation-preset-studio-page">
    <ShellTopbar eyebrow="HANAMI+ · MOTION" title="Motion Studio" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <section className="motion-studio-hero"><div><span className="eyebrow">INTERACTIONS & ANIMATION PRESETS</span><h1>Give the profile a rhythm without making it harder to use.</h1><p>Motion Studio layers page, widget, scene, hover, click, and ambient presets over the existing Interactive Profile controls. A visitor's Reduced Motion setting always takes priority.</p></div><div className={active?'motion-plus-card active':'motion-plus-card'}><span>{active?'EDITING UNLOCKED':'SAVED MOTION'}</span><strong>{active?'Hanami+':'View only'}</strong><small>Saved motion stays attached to the character after Plus expires.</small></div></section>
    {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
    {loading?<section className="motion-loading">Opening Motion Studio…</section>:settings&&editable?<div className="motion-studio-layout">
      <section className="motion-preset-column"><header><span className="eyebrow">HANAMI PRESETS</span><h2>Starter motion sets</h2></header><div className="motion-preset-grid">{builtins.map(preset=><article className={settings.active_preset_key===preset.key?'active':''} key={preset.key}><div><strong>{preset.name}</strong><small>{preset.note}</small></div><button type="button" disabled={!active||working==='save'} onClick={()=>void applyBuiltin(preset.key)}>Apply</button></article>)}</div><header><span className="eyebrow">MY PRESETS</span><h2>Reusable combinations</h2></header><div className="motion-preset-save"><input maxLength={40} disabled={!active} value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Preset name"/><button type="button" disabled={!active||!presetName.trim()||working==='preset'} onClick={()=>void saveCurrentPreset()}>{working==='preset'?'Saving…':'Save current setup'}</button></div><div className="motion-saved-list">{presets.length===0?<span>No personal motion presets yet.</span>:presets.map(preset=><article key={preset.id}><button type="button" disabled={!active||working==='save'} onClick={()=>void applySaved(preset)}><strong>{preset.preset_name}</strong><small>{preset.preset_key}</small></button><button className="remove" type="button" disabled={!active||working===preset.id} onClick={()=>void removePreset(preset.id)}>×</button></article>)}</div></section>
      <section className="motion-controls"><header><span className="eyebrow">CUSTOM MOTION</span><h2>Fine tune the active character</h2></header><div className="motion-control-grid">
        <label>Page entrance<select disabled={!active} value={settings.page_entrance} onChange={e=>local('page_entrance',e.target.value as Editable['page_entrance'])}><option value="none">None</option><option value="soft-fade">Soft Fade</option><option value="rise">Rise</option><option value="slide">Slide</option><option value="paper-open">Paper Open</option><option value="pixel-load">Pixel Load</option><option value="petal-reveal">Petal Reveal</option></select></label>
        <label>Widget reveal<select disabled={!active} value={settings.widget_reveal} onChange={e=>local('widget_reveal',e.target.value as Editable['widget_reveal'])}><option value="none">None</option><option value="stagger-fade">Stagger Fade</option><option value="rise">Rise</option><option value="pop">Pop</option><option value="slide">Slide</option><option value="card-deal">Card Deal</option><option value="pixel-load">Pixel Load</option></select></label>
        <label>Scene item motion<select disabled={!active} value={settings.scene_item_motion} onChange={e=>local('scene_item_motion',e.target.value as Editable['scene_item_motion'])}><option value="none">None</option><option value="gentle-float">Gentle Float</option><option value="soft-bob">Soft Bob</option><option value="drift">Drift</option><option value="sparkle-pulse">Sparkle Pulse</option><option value="paper-wiggle">Paper Wiggle</option><option value="pixel-blink">Pixel Blink</option></select></label>
        <label>Ambient layer<select disabled={!active} value={settings.ambient_effect} onChange={e=>local('ambient_effect',e.target.value as Editable['ambient_effect'])}><option value="none">None</option><option value="petals">Petals</option><option value="sparkles">Sparkles</option><option value="stars">Stars</option><option value="dust">Dust</option><option value="bubbles">Bubbles</option><option value="pixel-stars">Pixel Stars</option></select></label>
        <label>Route transition<select disabled={!active} value={settings.route_transition} onChange={e=>local('route_transition',e.target.value as Editable['route_transition'])}><option value="none">None</option><option value="crossfade">Crossfade</option><option value="soft-slide">Soft Slide</option><option value="paper-turn">Paper Turn</option><option value="iris">Iris</option><option value="pixel-wipe">Pixel Wipe</option></select></label>
        <label>Hover motion<select disabled={!active} value={settings.hover_motion} onChange={e=>local('hover_motion',e.target.value as Editable['hover_motion'])}><option value="none">None</option><option value="soft-lift">Soft Lift</option><option value="tilt">Tilt</option><option value="pop">Pop</option><option value="glow-pulse">Glow Pulse</option><option value="wiggle">Wiggle</option></select></label>
        <label>Click motion<select disabled={!active} value={settings.click_motion} onChange={e=>local('click_motion',e.target.value as Editable['click_motion'])}><option value="none">None</option><option value="press">Press</option><option value="bounce">Bounce</option><option value="spark">Spark</option><option value="ripple">Ripple</option><option value="stamp">Stamp</option></select></label>
        <label>Intensity <b>{settings.intensity}</b><input type="range" min="1" max="3" disabled={!active} value={settings.intensity} onChange={e=>local('intensity',Number(e.target.value))}/></label>
        <label>Duration <b>{settings.duration_ms}ms</b><input type="range" min="120" max="1600" step="20" disabled={!active} value={settings.duration_ms} onChange={e=>local('duration_ms',Number(e.target.value))}/></label>
        <label>Reveal stagger <b>{settings.stagger_ms}ms</b><input type="range" min="0" max="250" step="5" disabled={!active} value={settings.stagger_ms} onChange={e=>local('stagger_ms',Number(e.target.value))}/></label>
        <label>Ambient density <b>{settings.ambient_density}</b><input type="range" min="1" max="3" disabled={!active} value={settings.ambient_density} onChange={e=>local('ambient_density',Number(e.target.value))}/></label>
      </div><div className="motion-surface-toggles"><label><input type="checkbox" disabled={!active} checked={settings.profile_enabled} onChange={e=>local('profile_enabled',e.target.checked)}/> Main profile</label><label><input type="checkbox" disabled={!active} checked={settings.scenes_enabled} onChange={e=>local('scenes_enabled',e.target.checked)}/> Living Profile Scenes</label><label><input type="checkbox" disabled checked={settings.respect_reduced_motion}/> Always respect viewer Reduced Motion</label></div><button className="motion-save" type="button" disabled={!active||working==='save'} onClick={()=>void save(editable)}>{working==='save'?'Saving…':'Save custom motion'}</button>
      </section>
    </div>:<section className="motion-loading">Activate Hanami+ once to initialize Motion Studio.</section>}
  </main>
}
