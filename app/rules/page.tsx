import PublicSchoolShell from "../components/PublicSchoolShell";
import styles from "../PublicRebuild.module.css";

const websiteRules=[
 ["Respectful Behaviour","Be respectful to other members and do not intentionally start or prolong drama. Body shaming, gaslighting, victim blaming, incitement to violence, sexual objectification, dehumanising terms, slurs, and unwanted sexualisation are prohibited."],
 ["No Harassment","Harassment based on ethnicity, sexual orientation, gender, occupation, age, religious belief, or location of residency is prohibited. This includes private messages and private chats."],
 ["No NSFW or Romantic Content","Do not post sexual, graphic, self-harm, or otherwise NSFW content in profiles, messages, forums, uploads, forms, or any other website area. Romantic roleplay and sexual content are not allowed."],
 ["Respect Boundaries & Controversial Topics","If another member says a topic is controversial or uncomfortable for them, stop discussing it with them. Do not pressure people to continue conversations they have asked to leave."],
 ["No Spamming","Do not flood messages, forums, guestbooks, forms, or profiles with repeated posts, walls of text, single-word spam, counting, or other disruptive content outside spaces specifically intended for it."],
 ["No Alt-Account Abuse or Impersonation","Do not use alternate accounts to evade punishment, impersonate another person, misrepresent your identity, or circumvent a ban."],
 ["No Unauthorised Links or Advertising","Advertising requires Faculty or Administration permission. Suspicious or unauthorised links may be removed automatically or by staff."],
 ["No Exploits, Loopholes, or System Abuse","Do not exploit bugs, bypass permissions, manipulate school systems, abuse moderation tools, or use loopholes to violate the intent of the rules. Report bugs instead of exploiting them."],
 ["Use Common Sense","Ragebaiting, passive-aggressive behaviour, targeted disruption, and conduct clearly intended to provoke or upset others are prohibited even when the exact behaviour is not listed word-for-word."],
 ["Age Requirement","Members must be at least 16 years old to participate in Hanami High roleplay and community interaction."],
] as const;

const roleplayRules=[
 ["No Romance","No crushes, insinuations of crushes, romantic relationships, romantic actions, or sexual behaviour. Platonic admiration, role models, and wanting to become friends are allowed."],
 ["Respect the Area","You may observe roleplay in progress when you are not disruptive. If players ask you to leave a low-traffic roleplay area, respect the request. High-traffic spaces cannot be claimed as private areas."],
 ["Respect Faculty and Each Other","Students are expected to follow reasonable Faculty instructions. Faculty may assign detention at their discretion, but may not personally suspend or expel students."],
 ["No Exploiting","Game exploits, cheats, unauthorised scripts, or abuse of game systems may result in an automatic ban and report."],
 ["Uniforms and Clothes","Uniforms must be worn on school grounds during school hours. Variants are permitted when they remain recognisably school uniforms. Casual clothing and cosplay are permitted after school hours."],
 ["Foreigners","Foreigner Student and Teacher slots are limited. Certain Teacher roles may be foreigners, while Student foreigner characters require screening."],
 ["Graduation","Students can graduate after multiple in-world years. Graduates may become townies; some may later become teachers, while teachers may retire."],
 ["Time and Sessions","Roleplay timing is based on majority availability. One session represents roughly one school year, while individual roleplays function more like chapters within that year."],
] as const;

const sideItems=[
 {id:"priority",label:"Rule Priority",href:"/rules/#priority"},
 {id:"website",label:"Website Rules",href:"/rules/#website"},
 {id:"roleplay",label:"Roleplay Rules",href:"/rules/#roleplay"},
 {id:"help",label:"Questions",href:"/rules/#questions"},
];

export default function RulesPage(){
 return <PublicSchoolShell active="rules" sectionTitle="RULES & CONDUCT" breadcrumb="Community Standards" sideItems={sideItems} sideActive="priority" stickyUtility lastUpdated="08.25.2006">
  <div className={styles.pageTitle}><small>HANAMI HIGH · COMMUNITY STANDARDS</small><h1>Website Rules & Roleplay Rules</h1><p>These standards work together with the Hanami Discord server rules and relevant platform policies. The stricter applicable rule takes priority when requirements differ.</p></div>

  <section className={styles.section} id="priority"><div className={styles.sectionHead}><h2>Rule Priority</h2><span>READ BEFORE PARTICIPATING</span></div><div className={styles.sectionBody}><div className={styles.note}>If Discord, Roblox, or Official Rintama rules are stricter than a Hanami rule, the stricter platform or community rule applies.</div><p>Platform policies are maintained externally and may change independently from Hanami High.</p></div></section>

  <section className={styles.section} id="website"><div className={styles.sectionHead}><h2>Website Rules</h2><span>COMMUNITY + WEBSITE</span></div><div className={styles.sectionBody}><div className={styles.timeline}>{websiteRules.map(([title,body],index)=><article key={title}><time>RULE {String(index+1).padStart(2,"0")}</time><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></div></section>

  <section className={styles.section} id="roleplay"><div className={styles.sectionHead}><h2>Roleplay Rules</h2><span>IN-CHARACTER + GAMEPLAY</span></div><div className={styles.sectionBody}><div className={styles.timeline}>{roleplayRules.map(([title,body],index)=><article key={title}><time>RP {String(index+1).padStart(2,"0")}</time><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></div></section>

  <section className={styles.section} id="questions"><div className={styles.sectionHead}><h2>Questions & Moderation</h2><span>ASK BEFORE ACTING</span></div><div className={styles.sectionBody}><div className={styles.cardGrid}><article className={styles.card}><h3>Acknowledgement</h3><p>Rules are also published in the School Handbook for enrolled members.</p></article><article className={styles.card}><h3>Intent Matters</h3><p>Attempts to exploit loopholes or evade the spirit of the rules may still result in moderation.</p></article><article className={styles.card}><h3>Ask First</h3><p>If you are uncertain whether something is appropriate, contact staff before posting or roleplaying it.</p></article></div></div></section>
 </PublicSchoolShell>;
}
