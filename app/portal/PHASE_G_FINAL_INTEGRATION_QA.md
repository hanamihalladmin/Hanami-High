# Phase G — Final Integration + QA

This phase is the website-wide stabilization pass after the public, Student, Faculty, Admin/Owner, and Profile rebuilds.

## Included
- Hardened Student schedule duplicate suppression so generic `class period` mirrors do not appear beside enrolled course meetings at the same time.
- Added a final late-loaded integration stylesheet for portal box sizing, width containment, media containment, form control overflow, and table overflow.
- Standardized tab and switcher heights and made narrow-screen tab rows horizontally scroll instead of wrapping into uneven rows.
- Normalized remaining profile/social/student-life surfaces toward the Hanami navy, sage, ivory, and paper palette.
- Explicitly preserves Student and Faculty per-character radius, accent, text, background, wallpaper, and font customization.
- Keeps Admin and Owner sharp-corner workspace behavior supplied by their existing role theme.

## Regression boundaries
- No Supabase schema changes.
- No RLS or authentication changes.
- No profile/widget/storage data contract changes.
- No changes to owner preview/onboarding state behavior.
- No changes to the public About/Home establishment-year content.

## QA gates
- Lint
- Typecheck
- Legacy specification audit
- Static export build
- Exported-route verification
- GitHub Pages deployment
