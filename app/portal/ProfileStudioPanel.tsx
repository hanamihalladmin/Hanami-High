"use client";

import {PointerEvent,useCallback,useEffect,useMemo,useRef,useState} from "react";
import styles from "./ProfileStudioPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type WidgetType="text"|"image"|"card"|"link"|"divider"|"sticker"|"quote"|"playlist"|"photo_strip"|"badge"|"marquee"|"guestbook";
type Canvas={character_id:string;canvas_width:number;canvas_height:number;background:string;background_image_url:string|null;grid_enabled:boolean;snap_enabled:boolean};
type Widget={id:string;character_id:string;widget_type:WidgetType;x:number;y:number;width:number;height:number;z_index:number;rotation:number;opacity:number;content:Record<string,string>;style:Record<string,string|number>;locked:boolean};
type Props={accessToken:string;characterId:string};
type Snapshot=Widget[];
type DragState={startX:number;startY:number;scale:number;bases:{id:string;x:number;y:number}[]};
type ResizeState={id:string;startX:number;startY:number;scale:number;width:number;height:number};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function cloneWidgets(items:Widget[]):Widget[]{return items.map(widget=>({...widget,content:{...widget.content},style:{...widget.style}}));}

const defaults:Record<WidgetType,{w:number;h:number;content:Record<string,string>;style:Record<string,string|number>}>=
{
 text:{w:360,h:90,content:{text:"Double-click your idea here"},style:{fontSize:32,fontFamily:"Georgia, serif",color:"#17375f",textAlign:"left",background:"transparent",borderRadius:0}},
 image:{w:320,h:220,content:{url:"",alt:"Profile image"},style:{background:"#eef3f8",borderRadius:12}},
 card:{w:360,h:180,content:{text:"Add a note, bio block, favorites list, or anything else."},style:{fontSize:18,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:14}},
 link:{w:280,h:58,content:{text:"My link",url:"https://"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#17375f",borderRadius:10,textAlign:"center"}},
 divider:{w:420,h:12,content:{},style:{background:"#d7a7bb",borderRadius:99}},
 sticker:{w:120,h:120,content:{text:"花"},style:{fontSize:64,fontFamily:"Georgia, serif",color:"#9b315b",background:"#f7dce7",borderRadius:22,textAlign:"center"}},
 quote:{w:430,h:150,content:{text:"“Put a character quote, lyric-free motto, or favorite saying here.”",credit:"— Character note"},style:{fontSize:24,fontFamily:"Georgia, serif",color:"#17375f",background:"#fff7fb",borderRadius:18,textAlign:"left"}},
 playlist:{w:430,h:260,content:{text:"NOW PLAYING\n01. Track title — Artist\n02. Track title — Artist\n03. Track title — Artist\n04. Track title — Artist"},style:{fontSize:17,fontFamily:"Courier New, monospace",color:"#17375f",background:"#eef3f8",borderRadius:12,textAlign:"left"}},
 photo_strip:{w:520,h:180,content:{text:"PHOTO STRIP",url:"",alt:"Profile photo strip"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:8,textAlign:"center"}},
 badge:{w:180,h:70,content:{text:"HANAMI CLUB"},style:{fontSize:16,fontFamily:"Arial, sans-serif",color:"#ffffff",background:"#8f365b",borderRadius:99,textAlign:"center"}},
 marquee:{w:560,h:58,content:{text:"★ welcome to my hanami page ★"},style:{fontSize:18,fontFamily:"Courier New, monospace",color:"#8f365b",background:"#fff4f7",borderRadius:4,textAlign:"center"}},
 guestbook:{w:460,h:240,content:{text:"GUESTBOOK / LINK BOARD\nLeave this as a decorative block for now, or use it for character links, shout-outs, and profile navigation."},style:{fontSize:17,fontFamily:"Arial, sans-serif",color:"#17375f",background:"#ffffff",borderRadius:12,textAlign:"left"}}
};

const basicTypes:WidgetType[]=["text","image","card","link","divider","sticker"];
const socialTypes:WidgetType[]=["quote","playlist","photo_strip","badge","marquee","guestbook"];

export default function ProfileStudioPanel({accessToken,characterId}:Props){
 const [canvas,setCanvas]=useState<Canvas|null>(null);
 const [widgets,setWidgets]=useState<Widget[]>([]);
 const [selectedIds,setSelectedIds]=useState<string[]>([]);
 const [status,setStatus]=useState("Opening Profile Studio…");
 const [saving,setSaving]=useState(false);
 const [past,setPast]=useState<Snapshot[]>([]);
 const [future,setFuture]=useState<Snapshot[]>([]);
 const drag=useRef<DragState|null>(null);
 const resize=useRef<ResizeState|null>(null);

 const selectedWidgets=useMemo(()=>widgets.filter(widget=>selectedIds.includes(widget.id)),[widgets,selectedIds]);
 const selected=selectedWidgets[selectedWidgets.length-1]??null;

 const load=useCallback(async()=>{
  const [canvasResponse,widgetsResponse]=await Promise.all([
   fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?select=character_id,canvas_width,canvas_height,background,background_image_url,grid_enabled,snap_enabled&character_id=eq.${encodeURIComponent(characterId)}&limit=1`,{headers:headers(accessToken)}),
   fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?select=id,character_id,widget_type,x,y,width,height,z_index,rotation,opacity,content,style,locked&character_id=eq.${encodeURIComponent(characterId)}&order=z_index.asc`,{headers:headers(accessToken)})
  ]);
  if(!canvasResponse.ok||!widgetsResponse.ok)throw new Error("Profile Studio could not be loaded.");
  const canvasRows=await canvasResponse.json() as Canvas[];
  const widgetRows=await widgetsResponse.json() as Widget[];
  let active=canvasRows[0]??null;
  if(!active){
   const create=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"return=representation"}),body:JSON.stringify({character_id:characterId})});
   if(!create.ok)throw new Error("Your profile canvas could not be created.");
   active=(await create.json() as Canvas[])[0]??null;
  }
  setCanvas(active);setWidgets(widgetRows);setSelectedIds([]);setPast([]);setFuture([]);
  setStatus(widgetRows.length?`${widgetRows.length} profile widget${widgetRows.length===1?"":"s"} loaded.`:"Blank canvas ready. Add your first widget from the toolbar.");
 },[accessToken,characterId]);
 useEffect(()=>{load().catch(error=>setStatus(error instanceof Error?error.message:"Profile Studio could not be loaded."));},[load]);

 function checkpoint(){setPast(current=>[...current.slice(-24),cloneWidgets(widgets)]);setFuture([]);}
 async function persistWidget(widget:Widget){
  return fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?id=eq.${encodeURIComponent(widget.id)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({x:widget.x,y:widget.y,width:widget.width,height:widget.height,z_index:widget.z_index,rotation:widget.rotation,opacity:widget.opacity,content:widget.content,style:widget.style,locked:widget.locked,updated_at:new Date().toISOString()})});
 }
 async function persistSnapshot(snapshot:Snapshot){
  const existing=new Map(widgets.map(widget=>[widget.id,widget]));
  const changed=snapshot.filter(widget=>existing.has(widget.id));
  const responses=await Promise.all(changed.map(persistWidget));
  if(responses.some(response=>!response.ok))setStatus("One or more history changes could not be saved.");
 }
 async function undo(){
  const previous=past[past.length-1];if(!previous)return;
  const current=cloneWidgets(widgets);setPast(items=>items.slice(0,-1));setFuture(items=>[current,...items].slice(0,25));setWidgets(previous);await persistSnapshot(previous);setStatus("Undid the last layout/style change.");
 }
 async function redo(){
  const next=future[0];if(!next)return;
  const current=cloneWidgets(widgets);setFuture(items=>items.slice(1));setPast(items=>[...items,current].slice(-25));setWidgets(next);await persistSnapshot(next);setStatus("Redid the layout/style change.");
 }

 async function createWidget(payload:Omit<Widget,"id"|"character_id">){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json",Prefer:"return=representation"}),body:JSON.stringify({character_id:characterId,...payload})});
  if(!response.ok)throw new Error("Widget could not be added.");
  return (await response.json() as Widget[])[0]??null;
 }
 async function addWidget(type:WidgetType){
  if(!canvas||saving)return;const d=defaults[type];const z=Math.max(0,...widgets.map(widget=>widget.z_index))+1;setSaving(true);
  try{const row=await createWidget({widget_type:type,x:50+((widgets.length*24)%220),y:60+((widgets.length*30)%300),width:d.w,height:d.h,z_index:z,rotation:0,opacity:1,content:d.content,style:d.style,locked:false});if(row){setWidgets(current=>[...current,row]);setSelectedIds([row.id]);}setStatus(`${type.replace("_"," ")} widget added.`);}catch(error){setStatus(error instanceof Error?error.message:"Widget could not be added.");}finally{setSaving(false);}
 }
 async function duplicateWidget(){
  if(!selected||saving)return;setSaving(true);
  try{const row=await createWidget({widget_type:selected.widget_type,x:selected.x+20,y:selected.y+20,width:selected.width,height:selected.height,z_index:Math.max(0,...widgets.map(widget=>widget.z_index))+1,rotation:selected.rotation,opacity:selected.opacity,content:{...selected.content},style:{...selected.style},locked:false});if(row){setWidgets(current=>[...current,row]);setSelectedIds([row.id]);}setStatus("Widget duplicated.");}catch(error){setStatus(error instanceof Error?error.message:"Widget could not be duplicated.");}finally{setSaving(false);}
 }
 async function patchWidget(id:string,patch:Partial<Widget>,track=true){
  if(track)checkpoint();
  setWidgets(current=>current.map(widget=>widget.id===id?{...widget,...patch}:widget));
  const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
  if(!response.ok)setStatus("A widget change could not be saved.");
 }
 async function patchMany(patches:Map<string,Partial<Widget>>,track=true){
  if(track)checkpoint();
  const next=widgets.map(widget=>patches.has(widget.id)?{...widget,...patches.get(widget.id)!}:widget);
  setWidgets(next);
  const responses=await Promise.all([...patches.entries()].map(([id,patch])=>fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({...patch,updated_at:new Date().toISOString()})})));
  if(responses.some(response=>!response.ok))setStatus("One or more widget changes could not be saved.");
 }
 async function removeSelected(){
  if(!selectedIds.length||saving)return;
  if(!window.confirm(`Delete ${selectedIds.length} selected widget${selectedIds.length===1?"":"s"}?`))return;
  setSaving(true);
  try{const responses=await Promise.all(selectedIds.map(id=>fetch(`${SUPABASE_URL}/rest/v1/character_profile_widgets?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:headers(accessToken)})));if(responses.some(response=>!response.ok))throw new Error("One or more widgets could not be deleted.");setWidgets(current=>current.filter(widget=>!selectedIds.includes(widget.id)));setSelectedIds([]);setStatus("Selected widget(s) deleted from this profile.");}catch(error){setStatus(error instanceof Error?error.message:"Widgets could not be deleted.");}finally{setSaving(false);}
 }
 async function patchCanvas(patch:Partial<Canvas>){
  if(!canvas)return;setCanvas({...canvas,...patch});const response=await fetch(`${SUPABASE_URL}/rest/v1/character_profile_canvases?character_id=eq.${encodeURIComponent(characterId)}`,{method:"PATCH",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});if(!response.ok)setStatus("Canvas setting could not be saved.");
 }

 function selectWidget(event:PointerEvent<HTMLDivElement>,widget:Widget){
  if(event.shiftKey){setSelectedIds(current=>current.includes(widget.id)?current.filter(id=>id!==widget.id):[...current,widget.id]);return;}
  if(!selectedIds.includes(widget.id))setSelectedIds([widget.id]);
 }
 function startDrag(event:PointerEvent<HTMLDivElement>,widget:Widget){
  if(widget.locked)return;selectWidget(event,widget);event.currentTarget.setPointerCapture(event.pointerId);checkpoint();
  const ids=event.shiftKey?(selectedIds.includes(widget.id)?selectedIds.filter(id=>id!==widget.id):[...selectedIds,widget.id]):(selectedIds.includes(widget.id)?selectedIds:[widget.id]);
  const bases=widgets.filter(item=>ids.includes(item.id)&&!item.locked).map(item=>({id:item.id,x:item.x,y:item.y}));
  const viewScale=canvas?Math.min(1,(event.currentTarget.parentElement?.clientWidth??canvas.canvas_width)/canvas.canvas_width):1;
  drag.current={startX:event.clientX,startY:event.clientY,scale:viewScale,bases};
 }
 function moveDrag(event:PointerEvent<HTMLDivElement>){
  if(!drag.current||!canvas)return;const state=drag.current;const dx=(event.clientX-state.startX)/state.scale;const dy=(event.clientY-state.startY)/state.scale;
  setWidgets(current=>current.map(widget=>{const base=state.bases.find(item=>item.id===widget.id);if(!base)return widget;const rawX=Math.round(base.x+dx);const rawY=Math.round(base.y+dy);return {...widget,x:canvas.snap_enabled?Math.round(rawX/10)*10:rawX,y:canvas.snap_enabled?Math.round(rawY/10)*10:rawY};}));
 }
 async function endDrag(){
  const state=drag.current;if(!state)return;drag.current=null;
  const patches=new Map<string,Partial<Widget>>();for(const base of state.bases){const widget=widgets.find(item=>item.id===base.id);if(widget)patches.set(widget.id,{x:widget.x,y:widget.y});}
  await patchMany(patches,false);setStatus(state.bases.length>1?"Moved selected widgets.":"Widget moved.");
 }
 function startResize(event:PointerEvent<HTMLButtonElement>,widget:Widget){
  event.stopPropagation();if(widget.locked||!canvas)return;event.currentTarget.setPointerCapture(event.pointerId);checkpoint();const viewScale=Math.min(1,(event.currentTarget.closest(`.${styles.canvas}`)?.clientWidth??canvas.canvas_width)/canvas.canvas_width);resize.current={id:widget.id,startX:event.clientX,startY:event.clientY,scale:viewScale,width:widget.width,height:widget.height};
 }
 function moveResize(event:PointerEvent<HTMLButtonElement>){
  event.stopPropagation();if(!resize.current)return;const state=resize.current;const width=Math.max(40,Math.round(state.width+(event.clientX-state.startX)/state.scale));const height=Math.max(24,Math.round(state.height+(event.clientY-state.startY)/state.scale));setWidgets(current=>current.map(widget=>widget.id===state.id?{...widget,width,height}:widget));
 }
 async function endResize(event:PointerEvent<HTMLButtonElement>){
  event.stopPropagation();const state=resize.current;if(!state)return;resize.current=null;const widget=widgets.find(item=>item.id===state.id);if(widget)await patchWidget(widget.id,{width:widget.width,height:widget.height},false);setStatus("Widget resized.");
 }

 async function align(mode:"left"|"center"|"right"|"top"|"middle"|"bottom"){
  if(selectedWidgets.length<2)return;
  const left=Math.min(...selectedWidgets.map(widget=>widget.x));const right=Math.max(...selectedWidgets.map(widget=>widget.x+widget.width));const top=Math.min(...selectedWidgets.map(widget=>widget.y));const bottom=Math.max(...selectedWidgets.map(widget=>widget.y+widget.height));
  const patches=new Map<string,Partial<Widget>>();
  for(const widget of selectedWidgets){
   if(mode==="left")patches.set(widget.id,{x:left});
   if(mode==="center")patches.set(widget.id,{x:Math.round((left+right-widget.width)/2)});
   if(mode==="right")patches.set(widget.id,{x:right-widget.width});
   if(mode==="top")patches.set(widget.id,{y:top});
   if(mode==="middle")patches.set(widget.id,{y:Math.round((top+bottom-widget.height)/2)});
   if(mode==="bottom")patches.set(widget.id,{y:bottom-widget.height});
  }
  await patchMany(patches);setStatus(`Aligned ${selectedWidgets.length} widgets ${mode}.`);
 }
 function updateContent(key:string,value:string){if(!selected)return;patchWidget(selected.id,{content:{...selected.content,[key]:value}});}
 function updateStyle(key:string,value:string|number){if(!selected)return;patchWidget(selected.id,{style:{...selected.style,[key]:value}});}

 function renderWidget(widget:Widget){
  const style=widget.style;
  const common={width:"100%",height:"100%",background:String(style.background??"transparent"),color:String(style.color??"#17375f"),borderRadius:Number(style.borderRadius??0),fontSize:Number(style.fontSize??18),fontFamily:String(style.fontFamily??"Arial, sans-serif"),textAlign:(style.textAlign??"left") as "left"|"center"|"right",display:"flex",alignItems:"center",justifyContent:style.textAlign==="center"?"center":style.textAlign==="right"?"flex-end":"flex-start",padding:widget.widget_type==="divider"?0:12,overflow:"hidden",whiteSpace:"pre-wrap" as const} as const;
  if(widget.widget_type==="image")return widget.content.url?<img src={widget.content.url} alt={widget.content.alt||"Profile image"} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:Number(style.borderRadius??0)}}/>:<div style={common}>IMAGE</div>;
  if(widget.widget_type==="photo_strip")return <div style={{...common,gap:8,padding:8}}>{widget.content.url?<img src={widget.content.url} alt={widget.content.alt||"Profile photo strip"} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:Number(style.borderRadius??0)}}/>:<><span>▧</span><span>▧</span><span>▧</span><span>▧</span></>}</div>;
  if(widget.widget_type==="divider")return <div style={common}/>;
  if(widget.widget_type==="marquee")return <div style={{...common,overflow:"hidden"}}><span className={styles.marqueeText}>{widget.content.text||"★ welcome ★"}</span></div>;
  if(widget.widget_type==="quote")return <div style={{...common,display:"block",padding:18}}><div>{widget.content.text||"Quote"}</div>{widget.content.credit&&<small style={{display:"block",marginTop:10,opacity:.7}}>{widget.content.credit}</small>}</div>;
  return <div style={common}>{widget.content.text||widget.widget_type.replace("_"," ").toUpperCase()}</div>;
 }

 if(!canvas)return <section className={styles.loading}><p className="eyebrow">PROFILE STUDIO</p><h4>Opening your design canvas…</h4><p>{status}</p></section>;
 const scale=Math.min(1,760/canvas.canvas_width);
 return <section className={styles.studio} aria-labelledby="profile-studio-title">
  <div className={styles.heading}><div><p className="eyebrow">PROFILE STUDIO</p><h4 id="profile-studio-title">Design your character page</h4></div><span>CANVA-INSPIRED WIDGET CANVAS</span></div>
  <div className={styles.status}>{status}</div>
  <div className={styles.paletteLabel}><strong>BASIC BLOCKS</strong><span>Layout, media, and text</span></div>
  <div className={styles.toolbar}>{basicTypes.map(type=><button key={type} type="button" onClick={()=>addWidget(type)} disabled={saving}>+ {type}</button>)}</div>
  <div className={styles.paletteLabel}><strong>PROFILE WIDGETS</strong><span>Old-web personality blocks with Canva-style editing</span></div>
  <div className={styles.toolbar}>{socialTypes.map(type=><button key={type} type="button" onClick={()=>addWidget(type)} disabled={saving}>+ {type.replace("_"," ")}</button>)}</div>
  <div className={styles.toolbar}>
   <button type="button" onClick={undo} disabled={!past.length}>Undo</button><button type="button" onClick={redo} disabled={!future.length}>Redo</button>
   {selected&&<><button type="button" onClick={duplicateWidget} disabled={saving}>Duplicate</button><button type="button" onClick={()=>patchWidget(selected.id,{z_index:Math.max(0,...widgets.map(widget=>widget.z_index))+1})}>To front</button><button type="button" onClick={()=>patchWidget(selected.id,{z_index:0})}>To back</button></>}
   {selectedWidgets.length>1&&<><button type="button" onClick={()=>align("left")}>Align left</button><button type="button" onClick={()=>align("center")}>Center</button><button type="button" onClick={()=>align("right")}>Align right</button><button type="button" onClick={()=>align("top")}>Align top</button><button type="button" onClick={()=>align("middle")}>Middle</button><button type="button" onClick={()=>align("bottom")}>Align bottom</button></>}
  </div>
  <div className={styles.selectionHint}>Click a widget to select it. <b>Shift-click</b> adds or removes widgets from a multi-selection. Drag any selected widget to move the group.</div>
  <div className={styles.workspace}>
   <div className={styles.canvasArea}><div className={`${styles.canvas} ${canvas.grid_enabled?styles.grid:""}`} onPointerDown={event=>{if(event.target===event.currentTarget)setSelectedIds([]);}} style={{width:canvas.canvas_width*scale,height:canvas.canvas_height*scale,background:canvas.background,backgroundImage:canvas.background_image_url?`url(${canvas.background_image_url})`:undefined,backgroundSize:"cover"}}>
    {widgets.map(widget=>{const isSelected=selectedIds.includes(widget.id);return <div key={widget.id} className={`${styles.widget} ${isSelected?styles.selected:""}`} onPointerDown={event=>startDrag(event,widget)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} style={{left:widget.x*scale,top:widget.y*scale,width:widget.width*scale,height:widget.height*scale,zIndex:widget.z_index,opacity:widget.opacity,transform:`rotate(${widget.rotation}deg)`}}>{renderWidget(widget)}{widget.locked&&<span className={styles.lock}>LOCKED</span>}{isSelected&&!widget.locked&&<button type="button" className={styles.resizeHandle} aria-label="Resize widget" onPointerDown={event=>startResize(event,widget)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}/>}</div>;})}
   </div></div>
   <aside className={styles.inspector}>
    <h5>Canvas</h5>
    <label><span>Page size</span><select value={`${canvas.canvas_width}x${canvas.canvas_height}`} onChange={event=>{const [width,height]=event.target.value.split("x").map(Number);patchCanvas({canvas_width:width,canvas_height:height});}}><option value="960x1200">Standard profile</option><option value="960x1600">Tall profile</option><option value="1200x1200">Square profile</option><option value="1200x1800">Showcase profile</option></select></label>
    <label><span>Background</span><input type="color" value={canvas.background.startsWith("#")?canvas.background:"#fffafc"} onChange={event=>patchCanvas({background:event.target.value})}/></label>
    <label><span>Background image URL</span><input value={canvas.background_image_url??""} onChange={event=>patchCanvas({background_image_url:event.target.value||null})}/></label>
    <div className={styles.toggles}><label><input type="checkbox" checked={canvas.grid_enabled} onChange={event=>patchCanvas({grid_enabled:event.target.checked})}/> Grid</label><label><input type="checkbox" checked={canvas.snap_enabled} onChange={event=>patchCanvas({snap_enabled:event.target.checked})}/> Snap</label></div>
    {selectedWidgets.length>1&&<div className={styles.multiNotice}><strong>{selectedWidgets.length} WIDGETS SELECTED</strong><span>Use the toolbar to align or drag the whole selection. Inspector edits apply to the most recently selected widget.</span></div>}
    {selected&&<>
     <h5>Selected {selected.widget_type.replace("_"," ")}</h5>
     {selected.widget_type!=="divider"&&selected.widget_type!=="image"&&selected.widget_type!=="photo_strip"&&<label><span>Text</span><textarea value={selected.content.text??""} onChange={event=>updateContent("text",event.target.value)}/></label>}
     {(selected.widget_type==="image"||selected.widget_type==="photo_strip")&&<><label><span>Image URL</span><input value={selected.content.url??""} onChange={event=>updateContent("url",event.target.value)}/></label><label><span>Alt text</span><input value={selected.content.alt??""} onChange={event=>updateContent("alt",event.target.value)}/></label></>}
     {selected.widget_type==="quote"&&<label><span>Quote credit</span><input value={selected.content.credit??""} onChange={event=>updateContent("credit",event.target.value)}/></label>}
     {selected.widget_type==="link"&&<label><span>Link URL</span><input value={selected.content.url??""} onChange={event=>updateContent("url",event.target.value)}/></label>}
     <div className={styles.numbers}><label><span>X</span><input type="number" value={selected.x} onChange={event=>patchWidget(selected.id,{x:Number(event.target.value)})}/></label><label><span>Y</span><input type="number" value={selected.y} onChange={event=>patchWidget(selected.id,{y:Number(event.target.value)})}/></label><label><span>Width</span><input type="number" min="40" value={selected.width} onChange={event=>patchWidget(selected.id,{width:Number(event.target.value)})}/></label><label><span>Height</span><input type="number" min="24" value={selected.height} onChange={event=>patchWidget(selected.id,{height:Number(event.target.value)})}/></label></div>
     <label><span>Rotation</span><input type="range" min="-180" max="180" value={selected.rotation} onChange={event=>patchWidget(selected.id,{rotation:Number(event.target.value)})}/></label>
     <label><span>Opacity</span><input type="range" min="0.1" max="1" step="0.05" value={selected.opacity} onChange={event=>patchWidget(selected.id,{opacity:Number(event.target.value)})}/></label>
     <label><span>Layer</span><input type="number" min="0" max="999" value={selected.z_index} onChange={event=>patchWidget(selected.id,{z_index:Number(event.target.value)})}/></label>
     {selected.widget_type!=="image"&&selected.widget_type!=="photo_strip"&&<><label><span>Background</span><input type="color" value={String(selected.style.background??"#ffffff").startsWith("#")?String(selected.style.background):"#ffffff"} onChange={event=>updateStyle("background",event.target.value)}/></label><label><span>Text color</span><input type="color" value={String(selected.style.color??"#17375f")} onChange={event=>updateStyle("color",event.target.value)}/></label><label><span>Font</span><select value={String(selected.style.fontFamily??"Arial, sans-serif")} onChange={event=>updateStyle("fontFamily",event.target.value)}><option value="Arial, sans-serif">Sans serif</option><option value="Georgia, serif">Serif</option><option value="Courier New, monospace">Monospace</option></select></label><label><span>Font size</span><input type="number" min="8" max="96" value={Number(selected.style.fontSize??18)} onChange={event=>updateStyle("fontSize",Number(event.target.value))}/></label><label><span>Alignment</span><select value={String(selected.style.textAlign??"left")} onChange={event=>updateStyle("textAlign",event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></>}
     <label><span>Corner radius</span><input type="number" min="0" max="100" value={Number(selected.style.borderRadius??0)} onChange={event=>updateStyle("borderRadius",Number(event.target.value))}/></label>
     <label className={styles.lockToggle}><input type="checkbox" checked={selected.locked} onChange={event=>patchWidget(selected.id,{locked:event.target.checked})}/> Lock position</label>
     <button type="button" className={styles.delete} onClick={removeSelected}>Delete selected</button>
    </>}
   </aside>
  </div>
  <div className={styles.note}><strong>DESIGN FREEDOM</strong><span>Profiles are built from independent widgets instead of fixed templates. Multi-select, resize handles, alignment tools, undo/redo, templates, richer personal-site widgets, layering, locking, and freeform styling are now part of the editor foundation.</span></div>
 </section>;
}
