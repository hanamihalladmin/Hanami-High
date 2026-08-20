"use client";

import {useEffect,useState} from "react";

type Mode="original"|"simplified";
type PortalRole="student"|"faculty"|"admin"|"owner";

function detectPortalRole(path:string):PortalRole|null{
 const match=path.match(/\/portal\/(student|faculty|admin|owner)(?:\/|$)/);
 return (match?.[1] as PortalRole|undefined)??null;
}
function storageKey(role:PortalRole){return `hanami.portal.view-mode.v1.${role}`;}
function applyMode(role:PortalRole,mode:Mode){document.documentElement.dataset.portalMode=mode;document.documentElement.dataset.portalRole=role;}

export default function PortalViewModeToggle(){
 const [role,setRole]=useState<PortalRole|null>(null);const [mode,setMode]=useState<Mode>("original");
 useEffect(()=>{const detected=detectPortalRole(window.location.pathname);if(!detected){delete document.documentElement.dataset.portalMode;delete document.documentElement.dataset.portalRole;return;}setRole(detected);const stored=localStorage.getItem(storageKey(detected));const initial:Mode=stored==="simplified"?"simplified":"original";setMode(initial);applyMode(detected,initial);return()=>{delete document.documentElement.dataset.portalMode;delete document.documentElement.dataset.portalRole;};},[]);
 function choose(next:Mode){if(!role)return;setMode(next);localStorage.setItem(storageKey(role),next);applyMode(role,next);window.dispatchEvent(new CustomEvent("hanami-portal-view-mode",{detail:{role,mode:next}}));}
 if(!role)return null;
 return <div className="portal-view-mode-bar" role="group" aria-label={`${role} portal display mode`}><div><strong>{role.toUpperCase()} PORTAL VIEW</strong><span>{mode==="simplified"?"Simplified layout":"Original Hanami layout"}</span></div><div className="portal-view-mode-actions"><button type="button" aria-pressed={mode==="original"} onClick={()=>choose("original")}>Original</button><button type="button" aria-pressed={mode==="simplified"} onClick={()=>choose("simplified")}>Simplified</button></div></div>;
}
