import type { CSSProperties } from 'react'

type Props={payload:Record<string,unknown>;animated?:boolean;wide?:boolean;label?:string}

function text(payload:Record<string,unknown>,key:string,fallback:string){const value=payload[key];return typeof value==='string'?value:fallback}

export function DecorationAssetArt({payload,animated=false,wide=false,label}:Props){
  const glyph=text(payload,'glyph','✦')
  const artKind=text(payload,'artKind','dream')
  const motion=animated?text(payload,'motion','shimmer'):'none'
  const style={
    '--asset-bg':text(payload,'background','#fff5f8'),
    '--asset-accent':text(payload,'accent','#dc89a8'),
    '--asset-accent-2':text(payload,'accent2','#cbb8ef'),
    '--asset-border':text(payload,'border','#c99aac'),
  } as CSSProperties
  return <div className={`decoration-asset-art kind-${artKind} motion-${motion} ${wide?'wide':''}`} style={style} role="img" aria-label={label||glyph}>
    <span className="asset-orbit orbit-a" aria-hidden="true">✦</span><span className="asset-orbit orbit-b" aria-hidden="true">·</span><span className="asset-orbit orbit-c" aria-hidden="true">♡</span>
    <span className="asset-glow" aria-hidden="true"/><strong>{glyph}</strong><span className="asset-shine" aria-hidden="true"/>
  </div>
}
