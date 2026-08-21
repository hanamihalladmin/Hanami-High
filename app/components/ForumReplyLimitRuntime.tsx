"use client";

import {useEffect} from "react";

const MAX_REPLY_LENGTH=10000;
const REPLY_SELECTOR='textarea[placeholder="Write a reply…"]';

function attachLimit(textarea:HTMLTextAreaElement){
 if(textarea.dataset.hanamiReplyLimit==="true")return;
 textarea.dataset.hanamiReplyLimit="true";
 textarea.maxLength=MAX_REPLY_LENGTH;
 textarea.setAttribute("aria-describedby",`${textarea.id||"hanami-forum-reply"}-counter`);
 if(!textarea.id)textarea.id="hanami-forum-reply";
 const counter=document.createElement("small");
 counter.id=`${textarea.id}-counter`;
 counter.dataset.hanamiReplyCounter="true";
 counter.style.display="block";
 counter.style.marginTop="4px";
 counter.style.textAlign="right";
 counter.style.fontSize="11px";
 counter.style.color="#637188";
 const update=()=>{
   if(textarea.value.length>MAX_REPLY_LENGTH)textarea.value=textarea.value.slice(0,MAX_REPLY_LENGTH);
   counter.textContent=`${textarea.value.length.toLocaleString()} / ${MAX_REPLY_LENGTH.toLocaleString()} characters`;
 };
 textarea.addEventListener("input",update);
 textarea.insertAdjacentElement("afterend",counter);
 update();
}

function scan(){document.querySelectorAll<HTMLTextAreaElement>(REPLY_SELECTOR).forEach(attachLimit);}

export default function ForumReplyLimitRuntime(){
 useEffect(()=>{
   scan();
   const observer=new MutationObserver(scan);
   observer.observe(document.body,{childList:true,subtree:true});
   return()=>observer.disconnect();
 },[]);
 return null;
}
