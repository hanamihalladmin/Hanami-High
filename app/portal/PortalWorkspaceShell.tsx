import type {ReactNode} from "react";
import HanamiCrest from "../components/HanamiCrest";
import styles from "./PortalWorkspaceShell.module.css";

type NavItem={id:string;label:string;icon?:string;href?:string};
type Props={
  roleLabel:string;
  pageTitle:string;
  pageDescription?:string;
  userName:string;
  userMeta?:string;
  userImage?:string|null;
  items:NavItem[];
  activeId:string;
  onNavigate?:(id:string)=>void;
  children:ReactNode;
};

export default function PortalWorkspaceShell({roleLabel,pageTitle,pageDescription,userName,userMeta,userImage,items,activeId,onNavigate,children}:Props){
  return <section className={`${styles.shell} hh-rebuild-scope`} aria-label={`${roleLabel} portal`}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><HanamiCrest className={styles.crest}/><div><strong>HANAMI HIGH</strong><span>{roleLabel.toUpperCase()} PORTAL</span></div></div>
      <div className={styles.sectionLabel}>WORKSPACE</div>
      <nav className={styles.nav} aria-label={`${roleLabel} navigation`}>
        {items.map(item=>item.href?<a key={item.id} className={activeId===item.id?styles.active:""} href={item.href}><span className={styles.icon}>{item.icon??"•"}</span><span>{item.label}</span></a>:<button key={item.id} type="button" className={activeId===item.id?styles.active:""} onClick={()=>onNavigate?.(item.id)}><span className={styles.icon}>{item.icon??"•"}</span><span>{item.label}</span></button>)}
      </nav>
      <div className={styles.bottom}/>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.titleBlock}><span>{roleLabel} portal</span><h1>{pageTitle}</h1></div>
        <div className={styles.user}>
          <span className={styles.avatar}>{userImage?<img src={userImage} alt=""/>:userName.slice(0,1).toUpperCase()}</span>
          <span className={styles.userText}><strong>{userName}</strong><span>{userMeta??roleLabel}</span></span>
        </div>
      </header>
      <main className={styles.content}>
        <div className={styles.contentInner}>
          {pageDescription?<div className={styles.pageIntro}><h2>{pageTitle}</h2><p>{pageDescription}</p></div>:null}
          {children}
        </div>
      </main>
    </div>
  </section>;
}
