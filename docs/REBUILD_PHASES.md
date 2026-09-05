# Hanami High Rebuild Phases

Percentages are tracked per phase. A phase is complete only when its acceptance criteria pass and the phase PR is merged/deployed.

## Phase 0 — Foundation
Scope: canonical blueprint, phased acceptance criteria, structural design tokens. No legacy geometry is removed yet.
Acceptance: docs committed; new tokens compile; existing site behavior remains unchanged; CI passes.

## Phase 1 — Public Website
Scope: PublicShell, homepage, utility strip, school header, public navigation, footer, public page template, search placement, responsive public geometry.
Acceptance: desktop/tablet/mobile layouts pass; public routes remain reachable; no clipping/horizontal page overflow; campus imagery uses existing assets; CI and Pages deploy pass.

## Phase 2 — Authentication & Character Gateway
Scope: Discord login presentation, entitlement sync boundary, first-time acceptance, character selector, resume-last-character behavior, Admin/Owner account-level entry.
Acceptance: role/access states resolve correctly; max two characters; preview does not mutate onboarding; CI/deploy pass.

## Phase 3 — Shared Portal Shell
Scope: PortalShell, navigation, top utility bar, greeting, secondary tabs, dashboard/workspace/focus modes, responsive behavior, density support.
Acceptance: one shell geometry owner; no nested left-nav trees; tablet/mobile do not clip; Student and Faculty routes adopt the shell; CI/deploy pass.

## Phase 4 — Student Portal
Scope: Dashboard, Classes, individual class workspace, Schedule, Inbox, School.
Acceptance: task-first dashboard, class tabs, 20-seat classroom source preserved, internal messaging only, responsive QA, CI/deploy pass.

## Phase 5 — Faculty Portal
Scope: Dashboard, Classes, Gradebook, Attendance, Schedule, Inbox, School, Faculty tools.
Acceptance: faculty workflows are not student UI with extra buttons; scoped grade/attendance actions; responsive QA; CI/deploy pass.

## Phase 6 — Profiles & Community
Scope: SocialShell, Discord/Carrd/MySpace profile system, Friends, Top Friends, Status, Guestbooks, Feed, Forums, Profiles, Polls, Lost & Found, Classifieds.
Acceptance: character/account privacy separation, no raw CSS customization, role-scoped forums hidden when unauthorized, CI/deploy pass.

## Phase 7 — Rewards & Customization
Scope: Petals, Hanami Exchange, Wardrobe, Collections, cosmetic loadouts, Hanami Bloom, profile/portal cosmetics.
Acceptance: no real-money flow; Petals account-level; equipment character-level; locked items explain requirements; geometry cannot be customized; CI/deploy pass.

## Phase 8 — School Publishing
Scope: Clubs, Homerooms, Yearbook, Chronicle, shared media/publishing workflows.
Acceptance: public vs portal publishing separation; role-scoped editing; archive workflows; CI/deploy pass.

## Phase 9 — Admin Portal
Scope: People, Academics, Communications, Campus, Events, Moderation, Website, Reports.
Acceptance: Admin manages school operations, not platform internals; scoped permissions; CI/deploy pass.

## Phase 10 — Owner Portal
Scope: Command Center, Users, Characters, Portals, School Data, Website, Moderation, Economy, Integrations, System.
Acceptance: Owner preview is explicit/read-only by default and does not replace user sessions; platform-only controls stay Owner-only; CI/deploy pass.

## Phase 11 — Themes, Consolidation & Final QA
Scope: seasonal decorative themes, removal of superseded legacy visual layers, accessibility, responsive/device QA, permission regression testing, documentation.
Acceptance: seasonal themes do not alter geometry; obsolete global override layers removed; desktop/tablet/mobile and role matrix pass; production deploy verified.
