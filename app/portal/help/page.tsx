"use client";

import {useEffect} from "react";

function basePath(){return window.location.pathname.startsWith("/Hanami-High/")?"/Hanami-High":"";}

export default function PortalHelpPage(){
 useEffect(()=>{window.location.replace(`${basePath()}/guide/#accounts`);},[]);
 return <main className="site-page"><section style={{maxWidth:720,margin:"64px auto",padding:24,border:"1px solid #b7c5d1",background:"#fff"}}><p className="eyebrow">HANAMI SUPPORT</p><h1 style={{font:"400 28px Georgia,serif",color:"#243443"}}>Opening Website Guide…</h1><p>The complete Hanami High website guide covers portal login, characters, Student, Faculty, Administration, Owner tools, customization, school life, and troubleshooting.</p></section></main>;
}
