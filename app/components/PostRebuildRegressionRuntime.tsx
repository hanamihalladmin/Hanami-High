"use client";

import {useEffect} from "react";

const COURSE_BANNER_KEY_PREFIX="hanami:student-course-banner:";

type BannerPrefs={color:string;image:string;position:string};

function text(el:Element){return (el.textContent??"").replace(/\s+/g," ").trim();}
function isStudentView(){return location.pathname.includes("/portal/student")||document.body.textContent?.includes("STUDENT PORTAL")||document.body.textContent?.includes("HANAMI WORKSPACE")||false;}
function isFacultyView(){return location.pathname.includes("/portal/faculty")||document.body.textContent?.includes("FACULTY PORTAL")||false;}

function hideRoleInappropriateForums(){
  const student=isStudentView();
  const faculty=isFacultyView();
  if(!student&&!faculty)return;
  document.querySelectorAll("button,a,article,div").forEach(el=>{
    const t=text(el);
    if(student&&(t==="Faculty Room"||t.startsWith("Faculty Room Faculty-only"))) (el as HTMLElement).style.display="none";
    if(faculty&&(t==="Student Life"||t.startsWith("Student Life Student-only"))) (el as HTMLElement).style.display="none";
  });
  document.querySelectorAll("section,article,div").forEach(el=>{
    const t=text(el);
    if(student&&t.includes("READ ONLY • FACULTY FORUM")) (el as HTMLElement).style.display="none";
    if(faculty&&t.includes("STUDENT-ONLY")&&t.includes("FORUM")) (el as HTMLElement).style.display="none";
  });
}

function removeCafeteria(){
  if(!isStudentView())return;
  document.querySelectorAll("button,a").forEach(el=>{if(text(el)==="Cafeteria")(el as HTMLElement).style.display="none";});
  document.querySelectorAll("section,article,div").forEach(el=>{
    const t=text(el);
    if((t.startsWith("Lunch preferences")||t.startsWith("Recent menus"))&&t.length<1600)(el as HTMLElement).style.display="none";
  });
}

function enforceTwentySeatCharts(){
  document.querySelectorAll("div").forEach(grid=>{
    const children=Array.from(grid.children);
    if(children.length!==30)return;
    const labels=children.map(child=>text(child).split(" ")[0]);
    if(!labels.includes("A1")||!labels.includes("E6"))return;
    (grid as HTMLElement).style.gridTemplateColumns="repeat(4,minmax(78px,1fr))";
    children.forEach(child=>{
      const label=text(child).split(" ")[0];
      if(/[A-E][56]$/.test(label))(child as HTMLElement).style.display="none";
    });
  });
}

function findCourseBannerTarget(){
  const courseHome=Array.from(document.querySelectorAll("p,small,span")).find(el=>text(el)==="COURSE HOME");
  if(!courseHome)return null;
  return courseHome.closest("main,section,article,div") as HTMLElement|null;
}

function loadBannerPrefs(key:string):BannerPrefs{
  try{return {...{color:"#9caa92",image:"",position:"center"},...JSON.parse(localStorage.getItem(key)??"{}")};}catch{return {color:"#9caa92",image:"",position:"center"};}
}

function applyBanner(target:HTMLElement,prefs:BannerPrefs){
  target.dataset.hanamiCourseBanner="true";
  target.style.setProperty("--student-course-banner-color",prefs.color);
  target.style.setProperty("--student-course-banner-image",prefs.image?`url(\"${prefs.image.replaceAll('"','%22')}\")`:"none");
  target.style.setProperty("--student-course-banner-position",prefs.position);
}

function installCourseBannerCustomizer(){
  if(!isStudentView())return;
  const target=findCourseBannerTarget();
  if(!target||target.querySelector("[data-hanami-banner-editor]"))return;
  const path=location.pathname.replace(/\/$/,"");
  const key=COURSE_BANNER_KEY_PREFIX+path;
  let prefs=loadBannerPrefs(key);
  applyBanner(target,prefs);

  const editor=document.createElement("details");
  editor.dataset.hanamiBannerEditor="true";
  editor.className="hanami-course-banner-editor";
  editor.innerHTML=`<summary>Customize classroom banner</summary><div class="hanami-course-banner-controls"><label>Banner color <input data-banner-color type="color" value="${prefs.color}"></label><label>Banner image URL <input data-banner-image type="url" placeholder="https://…" value="${prefs.image.replaceAll('"','&quot;')}"></label><label>Image position <select data-banner-position><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option></select></label><div><button type="button" data-banner-save>Save banner</button><button type="button" data-banner-reset>Reset</button></div><small>Saved for this classroom on this device.</small></div>`;
  target.prepend(editor);
  const color=editor.querySelector("[data-banner-color]") as HTMLInputElement;
  const image=editor.querySelector("[data-banner-image]") as HTMLInputElement;
  const position=editor.querySelector("[data-banner-position]") as HTMLSelectElement;
  position.value=prefs.position;
  const preview=()=>{prefs={color:color.value,image:image.value.trim(),position:position.value};applyBanner(target,prefs)};
  color.addEventListener("input",preview);image.addEventListener("input",preview);position.addEventListener("change",preview);
  editor.querySelector("[data-banner-save]")?.addEventListener("click",()=>{preview();localStorage.setItem(key,JSON.stringify(prefs));});
  editor.querySelector("[data-banner-reset]")?.addEventListener("click",()=>{prefs={color:"#9caa92",image:"",position:"center"};localStorage.removeItem(key);color.value=prefs.color;image.value="";position.value="center";applyBanner(target,prefs);});
}

function run(){hideRoleInappropriateForums();removeCafeteria();enforceTwentySeatCharts();installCourseBannerCustomizer();}

export default function PostRebuildRegressionRuntime(){
  useEffect(()=>{
    let raf=0;
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(run)};
    run();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true});
    window.addEventListener("popstate",schedule);
    return()=>{observer.disconnect();window.removeEventListener("popstate",schedule);cancelAnimationFrame(raf)};
  },[]);
  return null;
}
