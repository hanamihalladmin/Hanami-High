# Hanami High v2

Hanami High v2 is a clean rebuild of the Hanami High roleplay network: Discord-inspired navigation and messaging, SpaceHey-inspired social identity, a school/academic layer, customizable character profiles, campus communities, Petals, the Hanami Boutique, achievements, moderation, and account-level Owner operations.

## Release status

**v2-rebuild is the release candidate branch.** It no longer inherits the old v1 component/CSS architecture. The `main` branch remains the v1 archive/reference until v2 is intentionally promoted.

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
- Account-wide Petals, Boutique inventory, Hanami+, settings, and platform roles
- Character-specific profiles, friends, messages, social posts, classes, grades, attendance, clubs, and achievements
- Capability-based permissions instead of a simple role hierarchy
- Owner-only audited RPCs for cross-account operations and read-only View Portal snapshots
- Tokyo-based roleplay school calendar in the fictional 2006 school year
- Responsive Hanami application shell with reduced-motion, density, contrast, and text-size preferences

## Major v2 surfaces

The application shell includes:

- Hanami Home — dashboard, announcements, calendar, online presence, schedule, classes, clubs
- Messages — friends, message requests, DMs, groups
- Social — feed, friends, Top Friends, bulletins, blogs, guestbook activity
- Academics — overview, timetable, classes, assignments, grades, attendance, Teacher tools
- Campus — events, clubs, organizations, opportunities, Student Council
- My Profile — published profile, Profile Studio, blog, guestbook, saved themes
- Discover — students, Teachers, clubs, posts, events
- Petals — balance, ledger, rewards, ways to earn
- Boutique — featured/new/seasonal cosmetics, frames, effects, nameplates, Hanami+ passes, inventory
- Achievements — milestones, collections, character history
- Settings — account, character, privacy/safety, notifications, accessibility, connections
- Owner Console — admissions, New Student promotion, accounts, characters, View Portal, permissions, economy, Hanami+, moderation, system configuration, audit history

## Database and security

Supabase migrations in `supabase/migrations/` are the source-controlled database history. Current v2 history runs through migration `0040`.

Important security rules include:

- RLS on member-facing data.
- Owner cross-account operations use narrowly scoped, capability-checked RPCs rather than weakening normal table policies.
- Privileged reward/Owner implementations live in the non-exposed `private` schema with `SECURITY INVOKER` public wrappers where appropriate.
- Safety reports are readable by their reporter and authorized moderation roles only.
- Presence visibility is enforced by database policy, not only hidden by frontend UI.

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

The repository includes a Pages deployment workflow for the v2 build. Vite uses a relative asset base so the build works as a project site under the current repository path as well as under a future account/custom domain.

For the current repository owner/name, the normal GitHub Pages project-site form is:

`https://hanamihalladmin.github.io/Hanami-High/`

The originally desired `https://hanamihigh.github.io/` would require the GitHub account or organization that owns the Pages site to be named `HanamiHigh`; that account/organization has not been created by this rebuild.

## Branch strategy

- `v2-rebuild` — completed v2 release candidate and Pages deployment source
- `main` — v1 archive/reference until an explicit promotion/merge decision

Do not rewrite already-applied migrations to change history. Add corrective migrations instead.
