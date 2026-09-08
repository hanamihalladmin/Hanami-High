# Hanami+ customization asset foundation

This layer provides one ownership/access model for upcoming Hanami+ user tags, premium fonts, stickers, emoji, dividers, icons, font effects, and decorative accents.

## Asset access

`customization_assets` stores published metadata and safe rendering payloads. Access can come from standard availability, an active Hanami+ entitlement, ownership of a linked Boutique item, or an explicit account grant such as an event, loyalty, creator, achievement, promo, or Owner award.

`my_customization_asset_access()` is the client-facing catalog RPC. It returns the published catalog plus whether the signed-in account can currently use each asset and whether the asset is favorited.

## Account-wide ownership, character-specific presentation

Asset access belongs to the account. `character_custom_tags` and `character_font_preferences` store how one character presents those account-accessible assets. `account_font_preferences` stores the optional site-wide Hanami+ font choices.

Character tags support up to ten saved tags per character and one active tag at a time. Editing requires active Hanami+. Saved data remains readable and deletable after expiry; premium application can resume when Plus is active again.

## User tags

Tags are intentionally decorative and do not represent permissions, staff status, or official roles. The foundation supports label text, a tag-style asset, premium font, left/right decorative accents, solid/gradient/transparent fills, colors, border/glow/shadow controls, shapes, visibility, and reduced-motion-compatible animation keys.

Tag labels are limited to 24 characters and cannot contain line breaks. Frontend editors should additionally sanitize display text and preserve layout limits.

## Fonts

Per-character font slots are provided for display names, tags, profile headings, profile body text, and blogs. Account-level slots are provided for optional site-wide body, heading, and display fonts.

The first frontend font library should use approved/licensed safe families and fallbacks. Critical administration, moderation, security, and accessibility controls should remain in a protected readable system font even when site-wide personal fonts are enabled.

## Stickers and decorative assets

The shared asset catalog is deliberately reusable so the same owned sticker, emoji, divider, icon, or accent can later be exposed in profiles, blogs, guestbooks, personal spaces, character phone/desktop surfaces, and creator tools without creating parallel ownership systems.
