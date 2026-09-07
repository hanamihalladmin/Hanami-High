# Hanami High v2

Hanami High v2 is a clean rebuild of the Hanami High roleplay network: a school/social network with expressive character profiles, Discord-like communication rooms where they are useful, academics, campus communities, Petals, a visual collectible Boutique, achievements, moderation, and account-level Owner operations.

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
- Regular Hanami school/social-network shell for Home, Social, Profile, Campus, Boutique, Petals, Settings, and other non-chat surfaces
- **Discord-like room UI is intentionally scoped to Messages, Homerooms, and individual Class rooms**
- Account-wide Petals, Boutique inventory, Wishlist, Hanami+, settings, and platform roles
- Character-specific profiles, cosmetic loadouts, friends, messages, social posts, classes, grades, attendance, clubs, and achievements
- Capability-based permissions instead of a simple role hierarchy
- Owner-only audited RPCs for cross-account operations and read-only View Portal snapshots
- Tokyo-based roleplay school calendar in the fictional 2006 school year
- Personal color themes and accessibility preferences

## Major v2 surfaces

The application includes:

- Hanami Home — dashboard, announcements, calendar, online presence, schedule, homeroom, classes, clubs
- Messages — Discord-like friends, message requests, DMs, and group conversations
- Social — feed, friends, Top Friends, bulletins, blogs, guestbook activity
- Academics — overview, timetable, Homeroom, classes, assignments, grades, attendance, Teacher tools
- Class rooms — Discord-like `#general`, Teacher-only `#announcements`, `#questions`, schoolwork links, classmates, and Teachers
- Homeroom rooms — Discord-like `#general`, Teacher-only `#announcements`, `#lounge`, schedule/classes links, classmates, and Teachers
- Campus — events, clubs, organizations, opportunities, Student Council
- My Profile — Hanami profile page, Canva-like Profile Studio, display-name typography/effects, widgets, activity, guestbook, saved themes, and cosmetic equipment
- Discover — students, Teachers, clubs, posts, events
- Petals — balance, ledger, rewards, ways to earn
- Boutique — image-first collectible storefront with avatar decorations, animated frames, animated profile effects, profile cards, backgrounds, stickers, Hanami+ passes, Wishlist, and inventory
- Achievements — milestones, collections, character history
- Settings — account, character, privacy/safety, notifications, appearance/accessibility, connections
- Owner Console — admissions, New Student promotion, accounts, characters, View Portal, permissions, economy, Hanami+, moderation, system configuration, audit history

## Profiles and customization

Profiles are Hanami-owned social spaces rather than Discord clones. The public profile keeps Hanami's school/social-network visual language while supporting:

- avatar + banner
- handle, pronouns, status, bio, school identity, and private notes
- movable/resizable profile widgets
- display-name fonts and effects
- Solid / Gradient / Neon / Toon / Pop / Gummy / Prism / Glow treatments
- primary + secondary display-name colors
- account-owned, character-equipped profile cosmetics
- animated avatar frames/decorations and animated profile effects
- reduced-motion handling for animated cosmetics

Profile Studio now exposes **Name Style** and **Cosmetics** tools. Cosmetic ownership is account-wide while equipment is character-specific. Published profiles snapshot the equipped cosmetic slugs so public rendering never trusts arbitrary CSS or JavaScript.

## Boutique collections

The Boutique uses original Hanami collectible concepts rather than copied Discord artwork. Current animated collections include items such as:

- Crystal Bloom Frame
- Aurora Wing Frame
- Gilded Moon Frame
- Pixel Arcade Frame
- Cherry Ribbon Frame
- Sakura Drift Halo
- Moonlit Koi Orbit
- Cloud Puff Friend
- Starlight Sprites
- Rosegarden Orbit
- Petal Shower
- Starlight Trail
- Firefly Drift
- Bubble Pop
- Aurora Mist
- Tea House Card
- Midnight Card
- Night Garden

The shop uses visual previews, featured drops, rarity, collections, Petal prices, Wishlist state, ownership state, inventory, and live cosmetic equipment. Animation is disabled when the user's reduced-motion preference requests it.

## Database and security

Supabase migrations in `supabase/migrations/` are the source-controlled database history. Current v2 history runs through migration `0045_boutique_animated_collections`.

Important security rules include:

- RLS on member-facing data.
- Student member mode does not expose account-level Owner/Admin school-management capabilities.
- Students cannot create official classes, grades, attendance records, or school announcements through student mode.
- Academic room membership is derived from active class enrollment / authorized Teacher management.
- Students can post ordinary class/homeroom conversation, but **`#announcements` is database-enforced Teacher/authorized-management posting only**.
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
