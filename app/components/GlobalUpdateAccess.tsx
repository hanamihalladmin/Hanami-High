"use client";

import {usePathname} from "next/navigation";

export default function GlobalUpdateAccess(){
 const pathname=usePathname();
 if(pathname?.includes("/changelog")||pathname?.includes("/features")||pathname?.includes("/ideas"))return null;
 const inPortal=pathname?.includes("/portal");
 if(inPortal)return null;
 return <nav aria-label="Hanami development links" style={{position:"fixed",right:12,bottom:12,zIndex:1000,display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:440}}>
  <a href="/Hanami-High/changelog/" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 10px",border:"1px solid #6d7280",borderRadius:0,background:"rgba(255,255,255,.96)",color:"#26364d",textDecoration:"none",font:"600 11px Arial,Helvetica,sans-serif",boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>↻ Website Updates</a>
  <a href="/Hanami-High/features/" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 10px",border:"1px solid #6d7280",borderRadius:0,background:"rgba(255,255,255,.96)",color:"#26364d",textDecoration:"none",font:"600 11px Arial,Helvetica,sans-serif",boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}>✦ Feature Center</a>
 </nav>;
}
