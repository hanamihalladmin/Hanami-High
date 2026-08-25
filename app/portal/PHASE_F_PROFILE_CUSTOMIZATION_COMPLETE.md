# Phase F — Profiles + Customization

Status: complete for the primary profile identity, appearance, canvas, template, and saved-design surfaces.

## Rebuilt in this phase

- Profile Designer now behaves like a compact creative workspace with five aligned sections: Canvas, Templates, Decorations, Saved Designs, and Studio Tools.
- Profile Designer tabs remain equal-height on desktop and become a horizontal-scroll strip on narrow screens.
- Canvas controls, background upload controls, canvas framing, and studio action buttons use the Hanami navy/sage/ivory system while still inheriting each character's chosen accent, text, surface, and radius.
- Character Profile identity/privacy editor was refreshed without changing profile visibility, headline, bio, status, or social behavior.
- Portal Appearance controls were rebuilt as an appearance control center with clearer color fields, avatar controls, class-banner controls, opacity controls, and preset cards.
- Profile Studio canvas, toolbar, inspector, selected-widget state, media fields, notices, and delete controls now share the same visual language.
- Template Gallery and Saved Designs now match the Profile Studio workspace and remain responsive.
- The Phase 5 global sharp-corner QA rule is now safely overridden by a Phase F compatibility layer using `--user-radius`. Student/Faculty character radius customization can display again; roles that do not set a character radius continue to fall back to sharp corners.
- Existing widget persistence, private profile-media uploads, saved designs, templates, background storage, reset behavior, social settings, and Supabase access behavior are unchanged.

## Phase F QA targets

- User-selected profile radius is visible rather than globally forced to zero.
- User-selected accent/text/surface colors continue to flow through the studio.
- Profile tabs align consistently and scroll horizontally on mobile.
- Canvas and inspector remain usable at tablet/mobile widths.
- Background upload/clear/reset controls retain their existing data behavior.
- Admin/Owner privileged workspaces remain intentionally sharp unless a role-specific style says otherwise.
