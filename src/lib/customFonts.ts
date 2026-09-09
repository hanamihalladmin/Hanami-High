import { supabase } from './supabase'
import type { AccountCustomFont } from '../types/database-customization-assets'

const STYLE_ID='hanami-custom-font-faces'

function quoted(value:string){return `"${value.replace(/["\\]/g,'')}"`}
function cssFormat(format:AccountCustomFont['font_format']){
  if(format==='woff2')return 'woff2'
  if(format==='woff')return 'woff'
  if(format==='ttf')return 'truetype'
  return 'opentype'
}

export function customFontFamily(font:AccountCustomFont|undefined|null,fallback='inherit'){
  return font?.font_family?quoted(font.font_family):fallback
}

export async function loadCustomFontFaces(fonts:AccountCustomFont[]){
  const client=supabase
  if(!client||typeof document==='undefined')return new Map<string,string>()
  const entries=await Promise.all(fonts.map(async font=>{
    const result=await client.storage.from('custom-fonts').createSignedUrl(font.storage_path,60*60)
    if(result.error||!result.data?.signedUrl)return null
    return {font,url:result.data.signedUrl}
  }))
  const usable=entries.filter((entry):entry is NonNullable<typeof entry>=>Boolean(entry))
  let style=document.getElementById(STYLE_ID) as HTMLStyleElement|null
  if(!style){style=document.createElement('style');style.id=STYLE_ID;document.head.appendChild(style)}
  style.textContent=usable.map(({font,url})=>`@font-face{font-family:${quoted(font.font_family)};src:url(${JSON.stringify(url)}) format('${cssFormat(font.font_format)}');font-display:swap;font-style:normal;font-weight:100 900;}`).join('\n')
  return new Map(usable.map(({font})=>[font.id,customFontFamily(font)]))
}

export function removeCustomFontFaces(){
  if(typeof document==='undefined')return
  document.getElementById(STYLE_ID)?.remove()
}
