# Hanami High v2

Hanami High v2 is a clean rebuild of the Hanami High roleplay network: Discord-style portal navigation and profiles, a school/academic layer, customizable character identities, campus communities, Petals, a visual Hanami Boutique, achievements, moderation, and account-level Owner operations.

## Release status

**v2-rebuild is the completed v2 release-candidate branch.** It no longer inherits the old v1 component/CSS architecture. The `main` branch remains the v1 archive/reference until v2 is intentionally promoted.

Current role model:

- Students and New Students use character-specific school identities.
- **Teachers are the only current Faculty-class characters.** Internal legacy database values `character_kind = faculty` / `school_role = faculty` map to the visible **Teacher** role.
- Non-teaching **Staff** is reserved for a future separate login/portal and is disabled in site configuration.
- Owner authority is account-level and never requires an OC.
- Every real account has a hard maximum of **two character slots**. Hanami+ never increases that limit.

## Product architecture

- React 19 + TypeScript + Vite
- Supabase Auth / Postgres / RLS / Realtime
- Discord OAuth as the primary account authentication identity
- Account-wide Petals, Boutique inventory, Wishlist, Hanami+, settings, and platform roles
- Character-specific Discord-style profiles, cosmetic loadouts, friends, messages, social posts, classes, grades, attendance, clubs, and achievements
- Capability-based permissions instead of a simple role hierarchy
- Owner-only audited RPCs for cross-account operations and read-only View Portal snapshots
- Tokyo-based roleplay school calendar in the fictional 2006 school year
- Responsive Discord-style Hanami application shell with personal color themes and accessibility preferences

## Major v2 surfaces

The application shell includes:

- Hanami Home — dashboard, announcements, calendar, online presence, schedule, classes, clubs
- Messages — friends, message requests, DMs, groups
- Social — feed, friends, Top Friends, bulletins, blogs, guestbook activity
- Academics — overview, timetable, classes, assignments, grades, attendance, Teacher tools
- Campus — events, clubs, organizations, opportunities, Student Council
- My Profile — Discord-style published identity card, Profile Studio, display-name styling, Board, Activity, Wishlist, blog, guestbook, saved themes
- Discover — students, Teachers, clubs, posts, events
- Petals — balance, ledger, rewards, ways to earn
- Boutique — image-first collectible storefront with avatar decorations, frames, effects, nameplates, profile cards, background packs, stickers, Hanami+ passes, Wishlist, and inventory
- Achievements — milestones, collections, character history
- Settings — account, character, privacy/safety, notifications, appearance/accessibility, connections
- Owner Console — admissions, New Student promotion, accounts, characters, View Portal, permissions, economy, Hanami+, moderation, system configuration, audit history

## Discord-style identity and presence

Profiles use a consistent Discord-style identity hierarchy: banner, overlapping circular avatar and presence, display name, handle/pronouns, badges, custom status, actions, bio, roles, member-since information, connections, notes, and Board / Activity / Guestbook tabs.

Profile Studio includes safe display-name font/effect/color controls, visual cosmetic slots, live preview, widgets, Activity, Wishlist, and account-owned cosmetic equipment. Cosmetic ownership is account-wide while equipment is character-specific. Published profiles snapshot the equipped cosmetic slugs so public rendering never trusts arbitrary CSS or JavaScript.

Presence supports Online, Idle, Do Not Disturb, and Invisible. Invisible characters are omitted from other members' online rail.

## Database and security

Supabase migrations in `supabase/migrations/` are the source-controlled database history. Current v2 history runs through migration `0043`.

Important security rules include:

- RLS on member-facing data.
- Student member mode does not expose account-level Owner/Admin school-management capabilities.
- Owner cross-account operations use narrowly scoped, capability-checked RPCs rather than weakening normal table policies.
- Privileged reward/Owner implementations live in the non-exposed `private` schema with `SECURITY INVOKER` public wrappers where appropriate.
- Safety reports are readable by their reporter and authorized moderation roles only.
- Presence visibility is enforced by database policy, not only hidden by frontend UI.
- Boutique Wishlist rows are account-private; cosmetic loadouts validate ownership and item type in the database.
- Teacher authority is revalidated at access time; removing Teacher status clears Teacher-only class/advisor assignments and immediately revokes stale academic, advisor, and roleplay management authority.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these frontend-safe variables in `.env.local`:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Never place a Supabase secret/service-role key in frontend environment variables.

Validation commands:

```bash
npm run typecheck
npm run build
```

## GitHub Pages

GitHub Pages is configured to deploy the `v2-rebuild` branch through GitHub Actions. The workflow builds with the frontend-safe Supabase URL/publishable key and automatically publishes the newest v2 push after the repository's `github-pages` environment allows `v2-rebuild`.

Current project-site URL:

`https://hanamihalladmin.github.io/Hanami-High/`

The originally desired `https://hanamihigh.github.io/` would require the GitHub account or organization that owns the Pages site to be named `HanamiHigh`; that account/organization has not been created by this rebuild.

## Branch strategy

- `v2-rebuild` — completed v2 release candidate and Pages source
- `main` — v1 archive/reference until an explicit promotion/merge decision

Do not rewrite already-applied migrations to change history. Add corrective migrations instead.
