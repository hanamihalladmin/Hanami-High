import type {ReactNode} from "react";
import HanamiCrest from "./HanamiCrest";
import PublicNetworkStatus from "./PublicNetworkStatus";
import styles from "./PublicSchoolShell.module.css";

type NavItem={label:string;href:string;id:string};
type SideItem={label:string;href:string;id:string};
type Props={
  active?:string;
  sectionTitle?:string;
  breadcrumb?:string;
  sideItems?:SideItem[];
  sideActive?:string;
  stickyUtility?:boolean;
  lastUpdated?:string;
  children:ReactNode;
};

const NAV:NavItem[]=[
  {id:"home",label:"Home",href:"/"},
  {id:"about",label:"About",href:"/about/"},
  {id:"academics",label:"Academics",href:"/academics/"},
  {id:"student-life",label:"Student Life",href:"/campus-life/"},
  {id:"calendar",label:"Calendar",href:"/calendar/"},
  {id:"admissions",label:"Admissions",href:"/apply/"},
  {id:"news",label:"News",href:"/newspaper/"},
  {id:"directory",label:"Directory",href:"/directory/"},
  {id:"rules",label:"Rules",href:"/rules/"},
  {id:"search",label:"Search",href:"/#search"},
  {id:"portals",label:"Portals",href:"/portal/"},
];

function siteHref(path:string){
  const base=process.env.GITHUB_ACTIONS?"/Hanami-High":"";
  if(path==="/")return `${base}/`;
  return `${base}${path}`;
}

export default function PublicSchoolShell({active,sectionTitle="HANAMI HIGH",breadcrumb,sideItems,sideActive,stickyUtility=false,lastUpdated="08.26.2026",children}:Props){
  return <div className={`${styles.shell} hh-rebuild-scope`}>
    <div className={`${styles.utility} ${stickyUtility?styles.utilitySticky:""}`}>
      <span>HANAMI HIGH SCHOOL · FOUNDED 1836 · SCHOOL NETWORK ERA 2006</span>
      <nav aria-label="Utility links">
        <a href={siteHref("/#search")}>Search</a>
        <a href={siteHref("/calendar/")}>Calendar</a>
        <a href={siteHref("/feeds/")}>RSS</a>
        <a href={siteHref("/status/")}>Status</a>
        <a href={siteHref("/portal/")}>Portal Login</a>
      </nav>
    </div>
    <header className={styles.masthead}>
      <div className={styles.identity}>
        <HanamiCrest className={styles.crest}/>
        <div className={styles.identityText}>
          <p className={styles.kicker}>PUBLIC SCHOOL NETWORK · ACADEMIC YEAR 2006</p>
          <h1>Hanami High School</h1>
          <span className={styles.japanese}>花見高等学校</span>
          <span className={styles.motto}>Learn, bloom, and walk forward together.</span>
        </div>
      </div>
      <div className={styles.meta}>
        <strong data-hanami-roleplay-clock>APRIL 7, 2006</strong>
        <span>HANAMI CITY · JAPAN STANDARD TIME</span>
        <span>FOUNDED 1836 · NETWORK EDITION 2006</span>
      </div>
    </header>
    <div className={styles.navWrap}>
      <nav className={styles.nav} aria-label="Main school navigation">
        {NAV.map(item=><a key={item.id} className={active===item.id?styles.active:""} href={siteHref(item.href)}>{item.label}</a>)}
      </nav>
    </div>
    <main className={styles.frame}>
      <div className={styles.crumbRow}><div className={styles.crumbs}>Hanami High / <b>{breadcrumb??sectionTitle}</b></div><div className={styles.updated}>Page last updated: {lastUpdated}</div></div>
      {sideItems?.length?<div className={styles.contentGrid}>
        <aside className={styles.pageMenu} aria-label={`${sectionTitle} page menu`}>
          <h2>{sectionTitle}</h2>
          <nav>{sideItems.map(item=><a key={item.id} className={sideActive===item.id?styles.active:""} href={siteHref(item.href)}>» {item.label}</a>)}</nav>
        </aside>
        <div className={styles.main}>{children}</div>
      </div>:<div className={styles.mainSolo}>{children}</div>}
    </main>
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div><b>HANAMI HIGH SCHOOL NETWORK</b><small>School founded 1836 · Digital network edition 2006 · Hanami City, Japan</small><small><PublicNetworkStatus/></small></div>
        <nav><a href={siteHref("/guide/")}>Guide</a><a href={siteHref("/new-student/")}>New Student FAQ</a><a href={siteHref("/directory/")}>Directory</a><a href={siteHref("/newspaper/archive/")}>Chronicle Archive</a><a href={siteHref("/gallery/")}>Gallery</a><a href={siteHref("/radio/")}>Radio</a><a href={siteHref("/whats-new/")}>What&apos;s New</a><a href={siteHref("/feeds/")}>RSS</a><a href={siteHref("/status/")}>Status</a><a href={siteHref("/webmaster/")}>Webmaster</a><a href={siteHref("/support/")}>Support</a></nav>
        <div className={styles.retroNote}>Site rebuild · v1.0<br/><small>Best viewed with curiosity at 1024×768 or better.</small></div>
      </div>
    </footer>
  </div>;
}
