# Public Design Credits & Provenance

Design Credits make community-source attribution visible on the character profile itself. The feature is standard Hanami transparency and is not gated by Hanami+.

## What visitors can see

When a visible published profile currently uses recorded community design sources, the profile exposes a compact Design Credits card containing:

- the current marketplace theme source, when the character entered Profile Studio through Remix Lab
- source theme creator
- exact source theme version
- installed creator widget-kit groups that still have widgets on the page
- source component creator
- exact component-kit version
- widget count for each installed component group
- recorded attribution text

The credit RPC uses Hanami's existing published-profile visibility helper. A viewer who cannot view the character's interactive profile cannot use the credit RPC as a separate path to inspect its design sources.

## Theme provenance

`character_profile_theme_source` stores the community marketplace version currently acting as the character's recorded design source.

Remix Lab integration is maintained through database triggers on `creator_theme_remix_sessions`:

- starting a new remix backs up the previous profile source alongside the existing theme/widget backup
- starting/importing a remix applies the new source listing/version/creator to the character
- converting the remix into a derivative listing keeps the applied source credit
- restoring the pre-remix design restores the previous source credit, or clears provenance when the previous design had no community source

This keeps profile provenance synchronized with Remix Lab backup/restore behavior without relying on client code.

## Component provenance

Component credits come from `profile_widget_attribution`. Only component widgets that still exist on the character's page are returned. Removing one widget removes its own attribution automatically; removing an installed component group removes the associated group credits with the widgets.

Repeated installations are kept as separate install groups and therefore may appear as separate credits when appropriate.

## Privacy and access

`profile_design_credits(p_character_id)` is a security-definer RPC that first calls `private.can_view_character_interactive_profile` for the requested character. It returns no separate private creator data beyond the display attribution already intended for visible profile credits.

The underlying provenance tables remain protected by RLS. The public profile UI reads through the RPC rather than weakening those table policies.

## Hanami+ boundary

Hanami+ is required for advanced creator actions such as Remix Lab and installing creator component kits. Once those sources become part of a visible profile, attribution itself remains visible to permitted profile viewers regardless of whether the profile owner currently has Hanami+.
