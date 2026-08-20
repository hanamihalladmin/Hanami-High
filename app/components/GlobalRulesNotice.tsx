import Link from "next/link";

export default function GlobalRulesNotice(){
 return <aside aria-label="Hanami rules and safety" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap",padding:"7px 14px",borderBottom:"1px solid #c9aebb",background:"#fff5f8",color:"#5e4050",fontSize:10,lineHeight:1.4,textAlign:"center"}}>
  <strong style={{color:"#8f365b",letterSpacing:".08em",fontSize:9}}>RULES &amp; SAFETY</strong>
  <span>Website, community, and roleplay rules apply across Hanami High.</span>
  <Link href="/rules/" style={{fontWeight:700,color:"#17375f",textDecoration:"underline",textUnderlineOffset:2}}>Read the rules</Link>
  <span aria-hidden="true">•</span>
  <Link href="/portal/roadmap/" style={{fontWeight:700,color:"#17375f",textDecoration:"underline",textUnderlineOffset:2}}>Roadmap Hub</Link>
 </aside>;
}