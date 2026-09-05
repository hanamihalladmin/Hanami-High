# Hanami High Rebuild Blueprint

This document is the canonical architecture contract for the 2026 full-site rebuild.

## Product map

### Public website
Home, About, Academics, Students, Activities, News, Directory, Admissions, Rules, Search, Calendar, Status, Help, Webmaster, Portal Login.

### Student portal
Dashboard, Classes, Schedule, Inbox, School, Community, Profile, Customize, Settings. Hanami Exchange is a special utility destination rather than a primary school-work section.

### Faculty portal
Dashboard, Classes, Gradebook, Attendance, Schedule, Inbox, School, Faculty, Community, Profile, Customize, Settings.

### Admin portal
Dashboard, People, Academics, Communications, Campus, Events, Moderation, Website, Reports, Settings.

### Owner portal
Command Center, Users, Characters, Portals, School Data, Website, Moderation, Economy, Integrations, System, Settings.

## Five shells

1. PublicShell — classic 2006 school-network site.
2. PortalShell — Student and Faculty workspaces.
3. OperationsShell — Admin and Owner operations.
4. SocialShell — profiles, selected Community views, club microsites.
5. FocusShell — editors, grading, profile customization, Exchange preview, other focused workflows.

No feature should introduce a sixth geometry system without an explicit architecture decision.

## Shared ownership model

### Account level
Discord identity, Petal wallet, inventory, Bloom entitlement, account permissions, notification/accessibility settings.

### Character level
Profile, status, mood, friends, Top Friends, guestbook, journal, gallery, equipped cosmetics, club memberships, class enrollment, character achievements.

### School level
Courses, homerooms, schedules, assignments, submissions, grades, attendance, announcements, events, clubs, Yearbook, Chronicle, opportunities, services.

### Platform level
Role mappings, capabilities, feature flags, moderation, audit logs, integrations, economy configuration, Owner preview.

## Permission contract

Discord roles map to Hanami entitlements. Entitlements resolve to capabilities. Pages and mutations check capabilities plus scope, never raw Discord role IDs.

Examples: `grade_edit`, `attendance_submit`, `club_manage`, `chronicle_publish`, `exchange_manage`, `economy_adjust`, `portal_preview`, `system_manage`.

## Customization contract

Profiles combine Discord-style identity, Carrd-style controlled content blocks, MySpace-style personality, and Hanami collectibles. Raw CSS and geometry editing are not allowed.

Portal customization may change wallpaper, accents, panel treatment, fonts, seasonal decoration, and approved effects. It must never change rail width, card geometry, column count, page margins, or structural breakpoints.

## Rewards contract

- Hanami Bloom is a no-payment Discord-role entitlement that unlocks creator/customization features.
- Petals are account-level, non-purchasable participation currency.
- Exchange ownership is account-level; equipped cosmetics are character-level.
- Achievements and school roles can grant non-purchasable prestige cosmetics.

## Visual direction

2006 school/intranet foundation + cozy dashboard structure + modern responsive engineering. Profiles/social areas may be denser and more expressive. The strict text contrast rule remains: dark filled surfaces use white text; light surfaces use dark/black text.

## Migration rule

Preserve working data and backend systems where sound. Rebuild presentation, shell geometry, navigation, profile customization, permission plumbing, and duplicated visual layers deliberately. No phase may add another global geometry hotfix layer as a substitute for fixing the owning shell/component.
