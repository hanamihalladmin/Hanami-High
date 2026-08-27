# Hanami High Retro Network Expansion

Design contract: 70–80% 2006 Web 2.0 / early MySpace / school-district website, 20–30% 2026 infrastructure and UX.

## Batch A — Network identity and utilities
- [x] Webmaster Page
- [x] RSS-style feeds
- [x] Maintenance / Network Status
- [x] Seasonal site skins: sakura, rainy season, culture festival, winter, exam week
- [x] Old-school What's New page

## Batch B — School information and publication
- [x] School Directory + Staff Pages
- [x] School Newspaper Archive
- [x] Photo Gallery
- [x] School Radio / Broadcast Page
- [x] FAQ / New Student Guide

## Batch C — Student identity and school life
- [x] Student Yearbook
- [x] Homeroom Pages
- [x] Club Microsites
- [x] Personal Profile Guestbooks
- [x] Status / Away Messages
- [x] Top Friends / Featured Friends
- [x] Achievements / Badges

## Batch D — Community participation
- [x] School Polls
- [x] Lost & Found Board
- [x] Classifieds / Bulletin Board
- [x] Event RSVP System
- [x] Anonymous Suggestion Box
- [x] Help Desk / Tech Support

## Final integration
- [x] Portal viewport geometry hardened for Student, Faculty, Administration, and Owner workspaces.
- [x] Homepage rebuilt around the approved 2006 school-network layout.
- [x] Supplied Hanami campus photograph designated as the homepage school banner (no AI replacement).
- [x] Supplied Hanami crest designated as the canonical public/portal logo.

## Implementation rules
- Keep public pages visibly 2006-first: thin borders, glossy/beveled headers, small shadows, classic typography, dense information layout, tiny icons, blue/navy links and small decorative details.
- Keep portal functionality modern underneath: responsive grids, accessibility, authentication, search, notifications, overflow handling, mobile layouts, and secure server-side permissions.
- Do not expose private Student/Faculty-only data on public pages.
- Preserve profile privacy defaults and character permissions.
- Prefer existing Supabase tables/RPCs before adding schema. Add migrations only when a feature cannot be implemented cleanly with existing data.
