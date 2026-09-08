# V2 shell, schedule, handle, and font repair

This repair batch addresses four user-visible problems in the V2 rebuild.

## One connected page scroll

Desktop rails no longer behave like independent 100vh application panes. Main navigation, section navigation, content, and the context rail grow with the same document and use the browser's page scroll. Messages and academic communication rooms keep their specialized layout but no longer create a separate fixed-height scrolling viewport. Mobile keeps its bottom navigation behavior.

## V1 school + homeroom schedules

The approved V1 2006 school day is now represented in V2 `school_schedule_blocks`, including arrival, shoe change, morning homeroom, lunch, cleaning, afternoon homeroom, and after-school clubs.

The exact V1 weekly schedules for Homerooms A, B, and C were transferred, using the original six period times:

- P1 08:50–09:40
- P2 09:50–10:40
- P3 10:50–11:40
- P4 11:50–12:40
- P5 13:25–14:15
- P6 14:25–15:15

Schedule-managed `HR-*` academic sections and meetings materialize these rows into the existing V2 academic system. Homeroom membership automatically enrolls a student into their matching schedule sections, so the existing My Schedule and My Homeroom pages receive the transferred timetable without a parallel fake schedule system.

## Published @handle repair

The published-profile handle trigger referenced an `updated_at` column that does not exist on `published_character_profiles`. The trigger now updates only the published `handle`, and existing published profiles are backfilled from the canonical `characters.handle`. Future handle changes remain synchronized automatically.

## Hanami+ custom fonts

The font runtime now updates the original V2 `--font-ui` and `--font-display` design tokens in addition to the newer Hanami font variables, fixing the issue where a saved site-wide font choice did not actually win the CSS cascade. A final runtime stylesheet keeps normal website pages on the chosen typography while security, PIN, owner-operation, and official administration surfaces remain on a stable system font.

Hanami+ members can now upload account-scoped custom fonts in Font Studio:

- accepted: `.woff2`, `.woff`, `.ttf`, `.otf`
- maximum size: 4 MB per file
- private `custom-fonts` storage bucket
- upload requires active Hanami+
- reading/deleting an existing personal upload remains account-owner-only
- optional source-page field, including dafont source pages
- required rights confirmation before upload
- personal uploads are not republished as a global Hanami font catalog

For a dafont download, the member downloads the font from dafont, extracts the ZIP on their device, and uploads the actual font file to Hanami. Hanami does not scrape or redistribute dafont downloads.
