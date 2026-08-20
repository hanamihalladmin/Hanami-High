"use client";

import {FormEvent,useState} from "react";
import ProfileReportPanel from "./ProfileReportPanel";
import styles from "./ProfileLookupPanel.module.css";

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL??"https://mperfphbhqpjlqmaysmg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??"sb_publishable_G-Pg-XwLz6rpRdlIWXcIgg_kxyd4gb0";

type VisibleProfile={character_id:string;display_name:string;handle:string;role:"student"|"faculty";visibility:"public"|"friends_only"|"private";headline:string;bio:string;status_message:string};
type Canvas={canvas_width:number;canvas_height:number;background:string;background_image_url:string|null;background_storage_path:string|null};
type WidgetType="text"|"image"|"card"|"link"|"divider"|"sticker"|"quote"|"playlist"|"photo_strip"|"badge"|"marquee"|"guestbook";
type Widget={id:string;widget_type:WidgetType;x:number;y:number;width:number;height:number;z_index:number;rotation:number;opacity:number;content:Record<string,string>;style:Record<string,string|number>};
type Design={canvas:Canvas;widgets:Widget[]};
type TopFriend={character_id:string;display_name:string;handle:string;role:"student"|"faculty";position:number};
type SocialBadge={id:string;label:string;badge_type:string;icon_text:string;description:string};
type SocialProfile={character_id:string;show_status:boolean;status_kind:string|null;status_message:string|null;show_visit_counter:boolean;total_visits:number|null;top_friends:TopFriend[];badges:SocialBadge[]};
type Props={accessToken:string;viewerCharacterId:string};

function headers(accessToken:string,extra:Record<string,string>={}){return {apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,...extra};}
function photoPaths(widget:Widget){let paths:string[]=[];try{const parsed=JSON.parse(widget.content.photo_paths??"[]");if(Array.isArray(parsed))paths=parsed.filter((value):value is string=>typeof value==="string"&&Boolean(value));}catch{}if(widget.widget_type==="photo_strip"&&widget.content.storage_path&&!paths.includes(widget.content.storage_path))paths.unshift(widget.content.storage_path);return paths.slice(0,8);}

function widgetView(widget:Widget,mediaUrls:Record<string,string>){
  const s=widget.style;
  const borderWidth=Number(s.borderWidth??0);
  const borderColor=String(s.borderColor??"#17375f");
  const borderStyle=String(s.borderStyle??"solid");
  const borderRadius=Number(s.borderRadius??0);
  const boxShadow=String(s.boxShadow??"none");
  const objectFit=(String(s.objectFit??"cover") as "cover"|"contain"|"fill"|"none"|"scale-down");
  const objectPosition=String(s.objectPosition??"50% 50%");
  const flipX=Number(s.flipX??1);
  const flipY=Number(s.flipY??1);
  const base={width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:s.textAlign==="center"?"center":s.textAlign==="right"?"flex-end":"flex-start",padding:widget.widget_type==="divider"?0:10,boxSizing:"border-box" as const,overflow:"hidden",background:String(s.background??"transparent"),color:String(s.color??"#17375f"),fontFamily:String(s.fontFamily??"Arial, sans-serif"),fontSize:Number(s.fontSize??16),textAlign:(s.textAlign??"left") as "left"|"center"|"right",borderRadius,border:borderWidth?`${borderWidth}px ${borderStyle} ${borderColor}`:"none",boxShadow,whiteSpace:"pre-wrap" as const};
  const mediaPath=widget.content.storage_path;
  const mediaSrc=(mediaPath&&mediaUrls[mediaPath])||widget.content.url;
  if(widget.widget_type==="image")return mediaSrc?<img src={mediaSrc} alt={widget.content.alt||"Profile image"} style={{width:"100%",height:"100%",objectFit,objectPosition,borderRadius,border:borderWidth?`${borderWidth}px ${borderStyle} ${borderColor}`:"none",boxShadow,transform:`scale(${flipX},${flipY})`}}/>:<div style={base}>IMAGE</div>;
  if(widget.widget_type==="photo_strip"){
    const paths=photoPaths(widget);const sources=paths.map(path=>mediaUrls[path]).filter(Boolean);
    if(!sources.length&&mediaSrc)sources.push(mediaSrc);
    return <div style={{...base,gap:8,padding:8,display:"grid",gridTemplateColumns:`repeat(${Math.max(1,Math.min(4,sources.length||4))},minmax(0,1fr))`}}>{sources.length?sources.map((src,index)=><img key={`${src}-${index}`} src={src} alt={`${widget.content.alt||"Profile photo strip"} ${index+1}`} style={{width:"100%",height:"100%",minHeight:0,objectFit,objectPosition,borderRadius,transform:`scale(${flipX},${flipY})`}}/>):<><span>▧</span><span>▧</span><span>▧</span><span>▧</span></>}</div>;
  }
  if(widget.widget_type==="divider")return <div style={base}/>;
  if(widget.widget_type==="marquee")return <div style={{...base,overflow:"hidden"}}><span className={styles.marqueeText}>{widget.content.text||"★ welcome ★"}</span></div>;
  if(widget.widget_type==="quote")return <div style={{...base,display:"block",padding:16}}><div>{widget.content.text||"Quote"}</div>{widget.content.credit&&<small style={{display:"block",marginTop:8,opacity:.7}}>{widget.content.credit}</small>}</div>;
  if(widget.widget_type==="link")return <div style={base}>↗ {widget.content.text||"LINK"}</div>;
  if(widget.widget_type==="guestbook")return <div style={{...base,display:"block"}}><strong>GUESTBOOK</strong><small style={{display:"block",marginTop:5}}>Leave a moderated profile comment from Hanami.</small></div>;
  return <div style={base}>{widget.content.text||widget.widget_type.replace("_"," ").toUpperCase()}</div>;
}

function statusLabel(value:string|null){if(!value)return "Offline";return value.replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase());}

export default function ProfileLookupPanel({accessToken,viewerCharacterId}:Props){
  const [handle,setHandle]=useState("");
  const [profile,setProfile]=useState<VisibleProfile|null>(null);
  const [design,setDesign]=useState<Design|null>(null);
  const [social,setSocial]=useState<SocialProfile|null>(null);
  const [mediaUrls,setMediaUrls]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("Search an exact Hanami handle to view an available character profile.");
  const [loading,setLoading]=useState(false);

  async function signDesignMedia(targetCharacterId:string,nextDesign:Design|null){
    const paths=[...new Set([...(nextDesign?.widgets??[]).flatMap(widget=>[widget.content.storage_path,...photoPaths(widget)]).filter(Boolean),nextDesign?.canvas.background_storage_path].filter(Boolean))] as string[];
    if(!paths.length){setMediaUrls({});return;}
    const response=await fetch(`${SUPABASE_URL}/functions/v1/profile-media-sign`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({viewer_character_id:viewerCharacterId,target_character_id:targetCharacterId,paths})});
    if(!response.ok){setMediaUrls({});return;}
    const payload=await response.json() as {files?:Array<{path?:string;signedUrl?:string;signedURL?:string;signed_url?:string;error?:string}>};
    const next:Record<string,string>={};
    for(const file of payload.files??[]){const url=file.signedUrl??file.signedURL??file.signed_url;if(file.path&&url&&!file.error)next[file.path]=url;}
    setMediaUrls(next);
  }

  async function search(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const clean=handle.trim().replace(/^@/,"").toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(clean)){setProfile(null);setDesign(null);setSocial(null);setMediaUrls({});setMessage("Enter a valid Hanami handle using lowercase letters, numbers, or underscores.");return;}
    setLoading(true);setProfile(null);setDesign(null);setSocial(null);setMediaUrls({});setMessage(`Checking profile visibility for @${clean}…`);
    try{
      const payload=JSON.stringify({viewer_character_id:viewerCharacterId,target_handle:clean});
      const [profileResponse,designResponse,socialResponse]=await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/rpc/lookup_visible_character_profile`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:payload}),
        fetch(`${SUPABASE_URL}/rest/v1/rpc/lookup_visible_profile_design`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:payload}),
        fetch(`${SUPABASE_URL}/rest/v1/rpc/lookup_visible_profile_social`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:payload})
      ]);
      if(!profileResponse.ok||!designResponse.ok||!socialResponse.ok)throw new Error("The Hanami profile lookup could not be completed.");
      const profileRows=await profileResponse.json() as VisibleProfile[];
      const designRows=await designResponse.json() as Design[];
      const result=profileRows[0]??null;
      const nextDesign=designRows[0]??null;
      const nextSocial=await socialResponse.json() as SocialProfile|null;
      setProfile(result);setDesign(nextDesign);setSocial(nextSocial);
      if(result){
        await signDesignMedia(result.character_id,nextDesign);
        const visitResponse=await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_profile_visit`,{method:"POST",headers:headers(accessToken,{"Content-Type":"application/json"}),body:JSON.stringify({target_character_id:result.character_id,viewer_character_id:viewerCharacterId})});
        if(visitResponse.ok&&nextSocial?.show_visit_counter){const total=Number(await visitResponse.json());setSocial({...nextSocial,total_visits:total});}
      }
      setMessage(result?`@${clean} is visible to your active character.`:`@${clean} is private, friends-only, unavailable, or does not exist.`);
    }catch(error){setMessage(error instanceof Error?error.message:"The Hanami profile lookup could not be completed.");}
    finally{setLoading(false);}
  }

  const previewWidth=960;
  const scale=design?Math.min(1,previewWidth/design.canvas.canvas_width):1;
  const uploadedBackground=design?.canvas.background_storage_path?mediaUrls[design.canvas.background_storage_path]:"";
  const visibleBackground=uploadedBackground||design?.canvas.background_image_url||undefined;
  return <section className={styles.panel} aria-labelledby="profile-search-title">
    <div className={styles.heading}><div><p className="eyebrow">HANAMI PROFILES</p><h4 id="profile-search-title">Character lookup</h4></div><span>PRIVACY-AWARE</span></div>
    <form className={styles.search} onSubmit={search}><label><span>Exact Hanami handle</span><div><b>@</b><input value={handle} onChange={event=>setHandle(event.target.value)} maxLength={24} placeholder="character_handle" autoComplete="off"/><button type="submit" disabled={loading}>{loading?"Checking…":"View profile"}</button></div></label></form>
    <div className={styles.status} aria-live="polite">{message}</div>
    {profile&&<>
      <article className={styles.card}><div className={styles.avatar}>花</div><div className={styles.identity}><p className="eyebrow">{profile.role.toUpperCase()} • {profile.visibility.replace("_"," ").toUpperCase()}</p><h5>{profile.display_name}</h5><span>@{profile.handle}</span>{social?.show_status&&<blockquote>{statusLabel(social.status_kind)}{social.status_message?` • ${social.status_message}`:""}</blockquote>}{!social?.show_status&&profile.status_message&&<blockquote>{profile.status_message}</blockquote>}</div><div className={styles.copy}><strong>{profile.headline||"Hanami character profile"}</strong><p>{profile.bio||"This character has not added a biography yet."}</p>{social?.show_visit_counter&&<small>PROFILE VIEWS • {social.total_visits??0}</small>}</div></article>
      {social&&((social.top_friends?.length??0)>0||(social.badges?.length??0)>0)&&<section style={{margin:"12px 0",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}} aria-label="Profile social details">
        <article style={{border:"1px solid #c6b6c1",background:"#fff7fb",padding:12}}><p className="eyebrow">TOP FRIENDS</p><h5 style={{margin:"4px 0 10px",font:"400 20px Georgia,serif"}}>Top Friends • platonic only</h5>{social.top_friends?.length?<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>{social.top_friends.map(friend=><div key={`${friend.position}-${friend.character_id}`} style={{border:"1px solid #e1d5dc",background:"#fff",padding:8,minHeight:58}}><small>#{friend.position}</small><strong style={{display:"block"}}>{friend.display_name}</strong><span style={{fontSize:9}}>@{friend.handle} • {friend.role}</span></div>)}</div>:<p>No Top Friends selected yet.</p>}</article>
        <article style={{border:"1px solid #c6b6c1",background:"#fff7fb",padding:12}}><p className="eyebrow">PROFILE BADGES</p><h5 style={{margin:"4px 0 10px",font:"400 20px Georgia,serif"}}>Hanami badges</h5>{social.badges?.length?social.badges.map(badge=><div key={badge.id} style={{borderBottom:"1px solid #e1d5dc",padding:"6px 0"}}><strong>{badge.icon_text} {badge.label}</strong><small style={{display:"block"}}>{badge.badge_type.replaceAll("_"," ")}{badge.description?` • ${badge.description}`:""}</small></div>):<p>No visible badges yet.</p>}</article>
      </section>}
      {design&&<div className={styles.designWrap}><div className={styles.designLabel}><strong>CUSTOM PROFILE DESIGN</strong><span>{design.canvas.canvas_width}×{design.canvas.canvas_height} • {design.widgets.length} WIDGET{design.widgets.length===1?"":"S"}</span></div><div className={styles.previewScroller}><div className={styles.preview} style={{width:design.canvas.canvas_width*scale,height:design.canvas.canvas_height*scale,background:design.canvas.background,backgroundImage:visibleBackground?`url(${visibleBackground})`:undefined,backgroundSize:"cover",backgroundPosition:"center"}}>{design.widgets.map(widget=><div key={widget.id} className={styles.previewWidget} style={{left:widget.x*scale,top:widget.y*scale,width:widget.width*scale,height:widget.height*scale,zIndex:widget.z_index,opacity:widget.opacity,transform:`rotate(${widget.rotation}deg)`}}>{widgetView(widget,mediaUrls)}</div>)}</div></div></div>}
      <ProfileReportPanel accessToken={accessToken} viewerCharacterId={viewerCharacterId} targetCharacterId={profile.character_id} targetHandle={profile.handle}/>
    </>}
    <div className={styles.privacy}><strong>VISIBILITY RULE</strong><span>Public profiles can be viewed by signed-in Hanami members. Friends-only profiles can be viewed by accepted character friends. Private profiles remain owner-only. Top Friends, visible badges, status, and visit counts are shown only after the same profile visibility check succeeds. Private Hanami uploads and uploaded backgrounds use short-lived signed media links after that check.</span></div>
  </section>;
}
