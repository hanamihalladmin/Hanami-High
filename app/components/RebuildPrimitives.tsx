import type {ReactNode} from "react";
import styles from "./RebuildPrimitives.module.css";

export function Panel({title,meta,children}:{title:string;meta?:string;children:ReactNode}){
  return <section className={styles.panel}><header className={styles.panelHeader}><h3>{title}</h3>{meta?<span>{meta}</span>:null}</header><div className={styles.panelBody}>{children}</div></section>;
}

export function MetricGrid({children}:{children:ReactNode}){return <div className={styles.metricGrid}>{children}</div>}
export function Metric({label,value,note}:{label:string;value:ReactNode;note?:string}){return <div className={styles.metric}><small>{label}</small><strong>{value}</strong>{note?<span>{note}</span>:null}</div>}
export function Button({children,href,primary=false,onClick}:{children:ReactNode;href?:string;primary?:boolean;onClick?:()=>void}){
  const className=`${styles.button} ${primary?styles.primary:""}`;
  return href?<a className={className} href={href}>{children}</a>:<button className={className} type="button" onClick={onClick}>{children}</button>;
}
export function TableWrap({children}:{children:ReactNode}){return <div className={styles.tableWrap}><table className={styles.table}>{children}</table></div>}
export function EmptyState({children}:{children:ReactNode}){return <div className={styles.empty}>{children}</div>}
