# Hanami Boutique — Ornate + Halloween Collections

This V2 batch expands the Boutique with matching three-piece cosmetic sets inspired by the supplied high-polish frame and Discord Shop placement references, while keeping all artwork original to Hanami.

## Permanent matching sets

Each set contains one profile/avatar frame, one horizontal nameplate, and one matching profile effect:

- Azure Dragon Court
- Gilded Dragon Court
- Ink Dragon Garden
- Celestial Crown
- Frost Feather
- Roseglass Heart
- Prism Feather
- Crystal Wing
- Moonlit Lace
- Sakura Seraph

The visual preview renderer places frames over a sample avatar/profile card, nameplates across the identity strip, and effects behind/around the profile preview. This gives the Boutique the same evaluate-before-buy behavior as the supplied shop-placement reference without copying Discord artwork.

## Halloween 2006 collections

Five fall collections are included for the upcoming Halloween season:

- Witching Hour
- Ghostlight Garden
- Pumpkin Moon
- Velvet Bat
- Crimson Familiar

Each Halloween collection also contains a frame, matching nameplate, and matching animated profile effect. Most Halloween frames animate as well.

## Animation

Animation metadata now lives on `boutique_items.is_animated` instead of relying only on a hard-coded frontend list. The ornate renderer supports subtle frame glow/breathing, effect rotation/drift, sparkle pulses, ghost floating, lantern bobbing, and bat movement. `prefers-reduced-motion` disables those animations.

## Pricing safety

No prices were invented for these releases. `boutique_items.pricing_state` supports `priced` and `tbd`. All new ornate/Halloween items are published for browsing with `pricing_state='tbd'` and a zero internal placeholder price. The Boutique displays `Price TBD`, disables purchasing, and the server purchase function also rejects a TBD item. The owner must explicitly assign Petal prices before they can be purchased.

## Future placement tuning

The current preview placements establish the initial frame/nameplate/effect semantics. The member-facing equipped placement can be tuned further from the upcoming Discord placement videos and screenshots without changing ownership or item identity.
