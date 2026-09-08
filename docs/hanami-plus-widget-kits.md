# Hanami+ Widget Kits & Component Library

The Component Library extends Profile Studio and the Creator Marketplace with modular, reusable widget groups. It does not create another profile editor.

## What a widget kit is

A widget kit is a versioned snapshot of 1–12 Profile Studio widgets. Kits are intended for reusable pieces such as:

- decorative headers
- link boards
- music panels
- photo grids
- journal blocks
- social/friends modules
- club cards
- sticker/decorative clusters
- small utility layouts

Creators select widgets from their active character's existing Profile Studio page. Publishing a kit snapshots those widgets without removing or changing the creator's originals.

## Additive installation

Installing a kit never replaces the member's current Profile Studio theme or widgets.

`install_creator_widget_kit` finds the bottom of the active character's existing widget layout and inserts the selected kit below it. The kit's internal relative vertical spacing, x positions, widget sizes, z-index, content/config, and visibility are preserved within normal V2 widget constraints.

The member can then move, resize, edit, hide, or delete the inserted widgets normally in Profile Studio.

## Attribution

Every widget created by a kit install gets a server-created row in `profile_widget_attribution` containing:

- inserted profile widget ID
- source kit ID
- exact source kit version ID
- source creator account ID
- display attribution text

Client code cannot write attribution rows. Deleting an inserted widget cascades its attribution record, while editing the widget does not silently rewrite the recorded source.

## Versioning

Widget kits have immutable version snapshots in `creator_widget_kit_versions`. Publishing a new version snapshots the creator's currently selected Profile Studio widgets while older versions remain identifiable for attribution.

The current published version is what new installs receive.

## Hanami+ boundary

Browsing public/unlisted component kits and seeing creator/favorite/install information remain available to Hanami members. Active Hanami+ is required to:

- create a widget kit draft
- publish or update a widget kit
- insert a community kit into Profile Studio

This keeps core Profile Studio usable without Hanami+ while reserving the advanced modular creator workflow for Hanami+.
