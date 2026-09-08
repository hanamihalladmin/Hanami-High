# Hanami+ Theme Remixing & Creator Attribution

Theme Remix Lab extends the existing Creator Marketplace and Profile Studio. It does not create a separate profile builder or a second theme marketplace.

## Remix workflow

1. A member chooses a published public or unlisted marketplace theme.
2. `begin_creator_theme_remix` snapshots the active character's current Profile Studio theme and widgets into a private remix session.
3. The selected source version is imported into the active character's Profile Studio draft.
4. The member edits the imported design normally in Profile Studio.
5. `create_creator_remix_listing` creates a new draft marketplace listing and records immutable lineage to the source listing, source version, and source creator account.
6. The member publishes the derivative from the existing Creator Studio workflow when ready.

## Restore safety

Starting a remix never silently destroys the member's previous Profile Studio work. The pre-remix theme and widgets are stored in the character's current remix session. `restore_creator_theme_remix_backup` restores that snapshot and marks the session restored.

A new remix replaces the previous session backup for that character, so the UI should make it clear that members should finish or restore the current remix before starting another source theme.

## Attribution

Every derivative listing created by Remix Lab stores:

- source marketplace listing ID
- exact source version ID
- source creator account ID
- remix generation depth
- a display attribution string

Lineage cannot be edited through client table writes. It is created server-side with the derivative listing so a remixer cannot publish through Remix Lab while stripping the original source chain.

Remixing an existing remix increments the generation depth while preserving the immediate source listing/version and creator. This allows Hanami to render a visible remix chain later without changing the current marketplace model.

## Hanami+ boundary

Browsing community themes and viewing attribution remain standard Hanami behavior. An active Hanami+ entitlement is required to import a marketplace theme into Profile Studio or create a derivative remix listing.

The original creator's theme remains independent. A remix copies the selected published version into the remixer's character draft and never edits the source listing or source version.

## Widget visibility compatibility

V2 profile widgets use `is_visible` as the single writable visibility state. Migration `0063` adds `visible` only as a generated read alias for compatibility with the original marketplace snapshot query. There is no second writable visibility value to drift out of sync.
