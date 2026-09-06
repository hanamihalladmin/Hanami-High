import type {ReactNode} from "react";
import HanamiCrest from "../components/HanamiCrest";
import styles from "./PortalWorkspaceShell.module.css";

type NavItem={id:string;label:string;icon?:string;href?:string;badge?:string|number};
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
  contextTitle?:string;
  contextItems?:NavItem[];
  activeContextId?:string;
  onContextNavigate?:(id:string)=>void;
  rightRailTitle?:string;
  rightRail?:ReactNode;
  userActions?:ReactNode;
  children:ReactNode;
};

function Item({item,active,onClick}:{item:NavItem;active:boolean;onClick?:()=>void}){
  const content=<><span className={styles.icon}>{item.icon??"•"}</span><span className={styles.itemLabel}>{item.label}</span>{item.badge!==undefined?<span className={styles.badge}>{item.badge}</span>:null}</>;
  return item.href?<a className={active?styles.active:""} href={item.href}>{content}</a>:<button type="button" className={active?styles.active:""} onClick={onClick}>{content}</button>;
}

export default function PortalWorkspaceShell({roleLabel,pageTitle,pageDescription,userName,userMeta,userImage,items,activeId,onNavigate,contextTitle="HANAMI HIGH",contextItems=[],activeContextId,onContextNavigate,rightRailTitle="Details",rightRail,userActions,children}:Props){
  return <section className={`${styles.shell} hh-rebuild-scope`} aria-label={`${roleLabel} portal`}>
    <aside className={styles.serverRail} aria-label={`${roleLabel} school navigation`}>
      <a className={styles.schoolHome} href="../../" aria-label="Hanami High home"><HanamiCrest className={styles.crest}/></a>
      <nav className={styles.serverNav}>{items.map(item=><Item key={item.id} item={item} active={activeId===item.id} onClick={()=>onNavigate?.(item.id)}/>)}</nav>
    </aside>

    <aside className={styles.channelRail} aria-label={`${pageTitle} sections`}>
      <div className={styles.channelHeader}><strong>{contextTitle}</strong><span>{roleLabel} workspace</span></div>
      <nav className={styles.channelNav}>{contextItems.map(item=><Item key={item.id} item={item} active={activeContextId===item.id} onClick={()=>onContextNavigate?.(item.id)}/>)}</nav>
      <div className={styles.userCard}>
        <span className={styles.avatar}>{userImage?<img src={userImage} alt=""/>:userName.slice(0,1).toUpperCase()}</span>
        <span className={styles.userText}><strong>{userName}</strong><span>{userMeta??roleLabel}</span></span>
        <div className={styles.userActions}>{userActions}</div>
      </div>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.titleBlock}><span>#</span><h1>{pageTitle}</h1></div>
        <div className={styles.topMeta}><span>{roleLabel} Portal</span></div>
      </header>
      <main className={styles.content}>
        <div className={styles.contentInner}>
          {pageDescription?<div className={styles.pageIntro}><h2>{pageTitle}</h2><p>{pageDescription}</p></div>:null}
          {children}
        </div>
      </main>
    </div>

    <aside className={styles.infoRail} aria-label={`${pageTitle} information`}>
      <div className={styles.infoHeader}>{rightRailTitle}</div>
      <div className={styles.infoContent}>{rightRail??<div className={styles.infoPlaceholder}><strong>Hanami context</strong><span>Classmates, teachers, deadlines, members, or page details will appear here for the active workspace.</span></div>}</div>
    </aside>
  </section>;
}
