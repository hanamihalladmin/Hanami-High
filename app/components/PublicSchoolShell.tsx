import type { ReactNode } from "react";
import PublicNetworkStatus from "./PublicNetworkStatus";
import styles from "./PublicSchoolShell.module.css";

type NavItem = { label: string; href: string; id: string };
type SideItem = { label: string; href: string; id: string };
type Props = {
  active?: string;
  sectionTitle?: string;
  breadcrumb?: string;
  sideItems?: SideItem[];
  sideActive?: string;
  stickyUtility?: boolean;
  lastUpdated?: string;
  children: ReactNode;
};

const NAV: NavItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "about", label: "About", href: "/about/" },
  { id: "academics", label: "Academics", href: "/academics/" },
  { id: "student-life", label: "Students", href: "/campus-life/" },
  { id: "activities", label: "Activities", href: "/club-sites/" },
  { id: "news", label: "News", href: "/newspaper/" },
  { id: "directory", label: "Directory", href: "/directory/" },
  { id: "admissions", label: "Admissions", href: "/apply/" },
  { id: "rules", label: "Rules", href: "/rules/" },
];

function siteHref(path: string) {
  const base = process.env.GITHUB_ACTIONS ? "/Hanami-High" : "";
  if (path === "/") return `${base}/`;
  return `${base}${path}`;
}

export default function PublicSchoolShell({
  active,
  sectionTitle = "HANAMI HIGH",
  breadcrumb,
  sideItems,
  sideActive,
  stickyUtility = false,
  lastUpdated = "09.05.2026",
  children,
}: Props) {
  const home = active === "home";

  return (
    <div className={`${styles.shell} hh-rebuild-scope`}>
      <div className={`${styles.utility} ${stickyUtility ? styles.utilitySticky : ""}`}>
        <span className={styles.networkName}>HANAMI HIGH SCHOOL NETWORK</span>
        <nav aria-label="Utility links">
          <a href={siteHref("/#network-search")}>Search</a>
          <a href={siteHref("/calendar/")}>Calendar</a>
          <a href={siteHref("/feeds/")}>RSS</a>
          <a href={siteHref("/status/")}>Status</a>
          <a href={siteHref("/new-student/")}>Help</a>
          <a className={styles.utilityLogin} href={siteHref("/portal/")}>Portal Login</a>
        </nav>
      </div>

      <header className={`${styles.masthead} ${home ? styles.homeMasthead : ""}`}>
        <div className={styles.identity}>
          <div className={styles.wordmark} aria-hidden="true"><span>花</span><small>見</small></div>
          <div className={styles.identityText}>
            <p className={styles.kicker}>花見高等学校 · HANAMI HIGH SCHOOL</p>
            <h1>Hanami High School</h1>
            <span className={styles.motto}>Tradition · Learning · Community</span>
            <span className={styles.established}>FOUNDED 1836 · SCHOOL NETWORK EST. 2006</span>
          </div>
        </div>

        {home ? (
          <figure className={styles.campusBanner}>
            <img src="./hanami-school-banner.jpg" alt="Hanami High School campus framed by cherry blossoms" />
            <figcaption>Welcome to Hanami High School</figcaption>
          </figure>
        ) : (
          <div className={styles.meta}>
            <strong data-hanami-roleplay-clock>APRIL 7, 2006</strong>
            <span>HANAMI CITY · JAPAN STANDARD TIME</span>
            <span><PublicNetworkStatus /></span>
          </div>
        )}
      </header>

      <div className={styles.networkStrip}>
        <span data-hanami-roleplay-clock>APRIL 7, 2006</span>
        <b>ONE SCHOOL, MANY PATHS, SHARED FUTURE.</b>
        <span><PublicNetworkStatus /></span>
      </div>

      <div className={styles.navWrap}>
        <div className={styles.navInner}>
          <nav className={styles.nav} aria-label="Main school navigation">
            {NAV.map((item) => (
              <a key={item.id} className={active === item.id ? styles.active : ""} href={siteHref(item.href)}>{item.label}</a>
            ))}
          </nav>
          <a className={styles.portalButton} href={siteHref("/portal/")}>PORTAL LOGIN</a>
        </div>
      </div>

      <main className={styles.frame}>
        <div className={styles.crumbRow}>
          <div className={styles.crumbs}>Hanami High / <b>{breadcrumb ?? sectionTitle}</b></div>
          <div className={styles.updated}>Page last updated: {lastUpdated}</div>
        </div>

        {sideItems?.length ? (
          <div className={styles.contentGrid}>
            <aside className={styles.pageMenu} aria-label={`${sectionTitle} page menu`}>
              <h2>{sectionTitle}</h2>
              <nav>
                {sideItems.map((item) => (
                  <a key={item.id} className={sideActive === item.id ? styles.active : ""} href={siteHref(item.href)}>» {item.label}</a>
                ))}
              </nav>
            </aside>
            <div className={styles.main}>{children}</div>
          </div>
        ) : <div className={styles.mainSolo}>{children}</div>}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <section><h2>HANAMI HIGH SCHOOL</h2><a href={siteHref("/about/")}>About</a><a href={siteHref("/academics/")}>Academics</a><a href={siteHref("/apply/")}>Admissions</a><a href={siteHref("/rules/")}>Rules</a></section>
          <section><h2>STUDENT RESOURCES</h2><a href={siteHref("/new-student/")}>New Student Guide</a><a href={siteHref("/club-sites/")}>Clubs</a><a href={siteHref("/yearbook/")}>Yearbook</a><a href={siteHref("/campus-life/")}>Student Life</a></section>
          <section><h2>SCHOOL NETWORK</h2><a href={siteHref("/portal/")}>Portal Login</a><a href={siteHref("/status/")}>Status</a><a href={siteHref("/feeds/")}>RSS</a><a href={siteHref("/whats-new/")}>What&apos;s New</a></section>
          <section><h2>SITE INFORMATION</h2><a href={siteHref("/webmaster/")}>Webmaster</a><a href={siteHref("/support/")}>Report a Problem</a><a href={siteHref("/directory/")}>Directory</a><small>Hanami High School Network · EST. 2006</small></section>
        </div>
        <div className={styles.footerBottom}>© 2006–2026 Hanami High School Network · Best viewed at 1024×768 or better — fully responsive anyway.</div>
      </footer>
    </div>
  );
}