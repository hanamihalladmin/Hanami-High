import GuestEnrollmentForm from "./GuestEnrollmentForm";
import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const DISCORD_INVITE=process.env.NEXT_PUBLIC_HANAMI_DISCORD_INVITE_URL?.trim()||"https://discord.gg/n5GFYst5Uv";
const sideItems=[
 {id:"start",label:"Start Application",href:"/apply/#start"},
 {id:"flow",label:"How It Works",href:"/apply/#flow"},
 {id:"rules",label:"Before Applying",href:"/rules/"},
 {id:"portal",label:"Portal Login",href:"/portal/"},
];

export default function ApplyPage(){
 return <PublicSchoolShell active="admissions" sectionTitle="ADMISSIONS" breadcrumb="Apply to Hanami" sideItems={sideItems} sideActive="start" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>HANAMI HIGH · ENROLLMENT OFFICE</small><h1>Apply to join the school.</h1><p>Guests can begin enrollment directly on the website, then continue to Discord for community onboarding, application follow-up, role assignment, and out-of-character coordination.</p></div>

  <section className={styles.section} id="start"><div className={styles.sectionHead}><h2>Guest Enrollment</h2><span>PRIVATE INTAKE</span></div><div className={styles.sectionBody}><div className={styles.note}>Before applying, review the Hanami website, roleplay, Discord, Roblox, and applicable Rintama rules. Website access is unlocked after Discord onboarding and role assignment.</div><br/><GuestEnrollmentForm discordInvite={DISCORD_INVITE}/></div></section>

  <section className={styles.section} id="flow"><div className={styles.sectionHead}><h2>How Enrollment Works</h2><span>FOUR STEPS</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>01 · Read the Rules</h3><p>Review website and roleplay rules before submitting an application.</p></article><article className={styles.card}><h3>02 · Submit Guest Sign-Up</h3><p>Choose Student or Faculty, enter your Discord username, and send a short introduction from this page.</p></article><article className={styles.card}><h3>03 · Continue to Discord</h3><p>Use the Discord handoff after submitting to complete community onboarding and application follow-up.</p></article><article className={styles.card}><h3>04 · Enter Hanami</h3><p>After approval and role assignment, sign in with Discord, create your character, and open your school dashboard.</p></article></div></div></section>

  <div className={styles.threeCol}>
   <section className={styles.box}><div className={styles.boxHead}><h3>Guest Access</h3><span>PUBLIC</span></div><div className={styles.boxBody}><p>Guests can browse the public school website and rules without a portal account.</p></div></section>
   <section className={styles.box}><div className={styles.boxHead}><h3>Private Intake</h3><span>PROTECTED</span></div><div className={styles.boxBody}><p>Applicants may submit enrollment information but cannot browse or read other guest applications.</p></div></section>
   <section className={styles.box}><div className={styles.boxHead}><h3>One Community</h3><span>DISCORD + WEB</span></div><div className={styles.boxBody}><p>The website starts enrollment and runs in-character school systems; Discord handles onboarding and OOC coordination.</p></div></section>
  </div>
 </PublicSchoolShell>;
}
