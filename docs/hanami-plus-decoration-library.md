# Hanami+ Decoration Library

The Decoration Library is the reusable collectible-asset layer for Hanami High V2.

## Asset families

The launch catalog adds 48 original Hanami decorations:

- 12 stickers
- 12 emojis
- 8 dividers
- 8 icons
- 8 decorative charms

The artwork direction is dreamy, old-web, kawaii, celestial, ribbon/pearl, school, garden, and soft-gothic. Assets are represented by approved metadata rather than arbitrary user HTML or scripts.

## Access

Assets use the shared `customization_assets` ownership model. Standard assets are usable by everyone. Hanami+ assets require active Hanami+. Future Boutique, event, loyalty, and creator assets can use the same library without adding a second inventory model.

## Library actions

Members can:

- search and filter by asset family or collection
- favorite assets
- copy the approved glyph for text surfaces such as blogs, guestbooks, messages, statuses, or tags
- add supported decorations directly to Profile Studio
- place supported decorations in the digital locker, desk, character phone, or character desktop

Profile insertion uses `add_my_customization_asset_to_profile(uuid)` and validates account access server-side.

Personal Space insertion uses `add_my_customization_asset_to_space(uuid,text)`, requires active Hanami+ because Personal Spaces editing is a Plus feature, validates asset ownership, and generates a self-contained approved SVG preview for the existing space renderer.

## Safety and accessibility

- No raw scripts or arbitrary HTML are accepted from asset payloads.
- Server-side insertion checks the active account, active character, asset state, asset type, and entitlement.
- Personal Space SVG generation validates palette colors and XML-escapes collectible glyph text.
- Motion is decorative only and is disabled by `prefers-reduced-motion`.
- Decorative assets never imply school permissions or staff roles.
