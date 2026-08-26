# Hanami High Retro Network Expansion

Design contract: 70–80% 2006 Web 2.0 / early MySpace / school-district website, 20–30% 2026 infrastructure and UX.

## Batch A — Network identity and utilities
- [x] Webmaster Page
- [x] RSS-style feeds
- [x] Maintenance / Network Status
- [x] Seasonal site skins: sakura, rainy season, culture festival, winter, exam week
- [x] Old-school What's New page

## Batch B — School information and publication
- [ ] School Directory + Staff Pages
- [ ] School Newspaper Archive
- [ ] Photo Gallery
- [ ] School Radio / Broadcast Page
- [ ] FAQ / New Student Guide

## Batch C — Student identity and school life
- [ ] Student Yearbook
- [ ] Homeroom Pages
- [ ] Club Microsites
- [ ] Personal Profile Guestbooks
- [ ] Status / Away Messages
- [ ] Top Friends / Featured Friends
- [ ] Achievements / Badges

## Batch D — Community participation
- [ ] School Polls
- [ ] Lost & Found Board
- [ ] Classifieds / Bulletin Board
- [ ] Event RSVP System
- [ ] Anonymous Suggestion Box
- [ ] Help Desk / Tech Support

## Implementation rules
- Keep public pages visibly 2006-first: thin borders, glossy/beveled headers, small shadows, classic typography, dense information layout, tiny icons, blue/navy links and small decorative details.
- Keep portal functionality modern underneath: responsive grids, accessibility, authentication, search, notifications, overflow handling, mobile layouts, and secure server-side permissions.
- Do not expose private Student/Faculty-only data on public pages.
- Preserve profile privacy defaults and character permissions.
- Prefer existing Supabase tables/RPCs before adding schema. Add migrations only when a feature cannot be implemented cleanly with existing data.
