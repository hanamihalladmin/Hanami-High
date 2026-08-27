import type {ReactNode} from "react";
import PublicNetworkStatus from "./PublicNetworkStatus";
import styles from "./PublicSchoolShell.module.css";

type NavItem={label:string;href:string;id:string};
type SideItem={label:string;href:string;id:string};
type Props={active?:string;sectionTitle?:string;breadcrumb?:string;sideItems?:SideItem[];sideActive?:string;stickyUtility?:boolean;lastUpdated?:string;children:ReactNode};

const NAV:NavItem[]=[
 {id:"home",label:"Home",href:"/"},{id:"about",label:"About",href:"/about/"},{id:"academics",label:"Academics",href:"/academics/"},{id:"student-life",label:"Students",href:"/campus-life/"},{id:"calendar",label:"Calendar",href:"/calendar/"},{id:"admissions",label:"Admissions",href:"/apply/"},{id:"news",label:"News",href:"/newspaper/"},{id:"directory",label:"Directory",href:"/directory/"},{id:"rules",label:"Rules",href:"/rules/"},{id:"search",label:"Search",href:"/#search"},{id:"portals",label:"Portals",href:"/portal/"}
];
function siteHref(path:string){const base=process.env.GITHUB_ACTIONS?"/Hanami-High":"";if(path==="/")return `${base}/`;return `${base}${path}`;}

export default function PublicSchoolShell({active,sectionTitle="HANAMI HIGH",breadcrumb,sideItems,sideActive,stickyUtility=false,lastUpdated="08.27.2026",children}:Props){
 const home=active==="home";
 return <div className={`${styles.shell} hh-rebuild-scope`}>
  <div className={`${styles.utility} ${stickyUtility?styles.utilitySticky:""}`}>
   <nav aria-label="Utility links"><a href={siteHref("/")}>Home</a><a href={siteHref("/calendar/")}>Calendar</a><a href={siteHref("/directory/")}>Directory</a><a href={siteHref("/webmaster/")}>Webmaster</a><a href={siteHref("/new-student/")}>Help</a></nav>
   <span>HANAMI HIGH SCHOOL NETWORK · 2006 EDITION</span>
   <nav aria-label="Network links"><a href={siteHref("/feeds/")}>RSS</a><a href={siteHref("/status/")}>Status</a><a href={siteHref("/portal/")}>Portal Login</a></nav>
  </div>
  <header className={`${styles.masthead} ${home?styles.homeMasthead:""}`}>
   <div className={styles.identity}>
    <img className={styles.crest} src={siteHref("/hanami-high-portal-icon.png")} alt="Hanami High School logo"/>
    <div className={styles.identityText}><p className={styles.kicker}>花見高等学校 · HANAMI HIGH SCHOOL</p><h1>Hanami High School</h1><span className={styles.motto}>Tradition · Learning · Community</span><span className={styles.established}>FOUNDED 1836 · SCHOOL NETWORK EST. 2006</span></div>
   </div>
   {home?<figure className={styles.campusBanner}><img src={siteHref("/hanami-school-banner.jpg")} alt="Hanami High School campus framed by cherry blossoms"/></figure>:<div className={styles.meta}><strong data-hanami-roleplay-clock>APRIL 7, 2006</strong><span>HANAMI CITY · JAPAN STANDARD TIME</span><span>FOUNDED 1836 · NETWORK EDITION 2006</span></div>}
  </header>
  <div className={styles.networkStrip}><span data-hanami-roleplay-clock>APRIL 7, 2006</span><b>ONE SCHOOL, MANY PATHS, SHARED FUTURE.</b><span><PublicNetworkStatus/></span></div>
  <div className={styles.navWrap}><nav className={styles.nav} aria-label="Main school navigation">{NAV.map(item=><a key={item.id} className={active===item.id?styles.active:""} href={siteHref(item.href)}>{item.label}</a>)}</nav></div>
  <main className={styles.frame}><div className={styles.crumbRow}><div className={styles.crumbs}>Hanami High / <b>{breadcrumb??sectionTitle}</b></div><div className={styles.updated}>Page last updated: {lastUpdated}</div></div>{sideItems?.length?<div className={styles.contentGrid}><aside className={styles.pageMenu} aria-label={`${sectionTitle} page menu`}><h2>{sectionTitle}</h2><nav>{sideItems.map(item=><a key={item.id} className={sideActive===item.id?styles.active:""} href={siteHref(item.href)}>» {item.label}</a>)}</nav></aside><div className={styles.main}>{children}</div></div>:<div className={styles.mainSolo}>{children}</div>}</main>
  <footer className={styles.footer}><div className={styles.footerInner}><div className={styles.footerBrand}><img src={siteHref("/hanami-high-portal-icon.png")} alt=""/><div><b>HANAMI HIGH SCHOOL</b><small>Office of Admissions · Hanami City, Japan</small><small>© 2006–2026 Hanami High School Network</small></div></div><nav><a href={siteHref("/webmaster/")}>Webmaster</a><a href={siteHref("/whats-new/")}>What&apos;s New</a><a href={siteHref("/new-student/")}>FAQ / New Student Guide</a><a href={siteHref("/support/")}>Report a Problem</a><a href={siteHref("/feeds/")}>RSS</a><a href={siteHref("/status/")}>Network Status</a></nav><div className={styles.retroNote}>Best viewed at 1024×768 or better.<br/><small>Modern browser recommended; IE7 joke retained for historical accuracy.</small></div></div></footer>
 </div>;
}
