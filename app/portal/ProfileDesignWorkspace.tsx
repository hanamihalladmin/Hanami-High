"use client";

import {useEffect,useState} from "react";
import ProfileTemplateGallery from "./ProfileTemplateGallery";
import ProfileStudioPanel from "./ProfileStudioPanel";

type Props={accessToken:string;characterId:string};

export default function ProfileDesignWorkspace({accessToken,characterId}:Props){
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    function refresh(event:Event){
      const detail=(event as CustomEvent<{characterId?:string}>).detail;
      if(detail?.characterId===characterId)setRevision(value=>value+1);
    }
    window.addEventListener("hanami-profile-template-applied",refresh);
    return()=>window.removeEventListener("hanami-profile-template-applied",refresh);
  },[characterId]);
  return <>
    <ProfileTemplateGallery accessToken={accessToken} characterId={characterId}/>
    <ProfileStudioPanel key={`${characterId}-${revision}`} accessToken={accessToken} characterId={characterId}/>
  </>;
}
