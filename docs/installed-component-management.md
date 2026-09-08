# Installed Components & Credits

Installed Components closes the management loop for Creator Widget Kits. A kit install is tracked as one component group on the active character so members can understand where imported widgets came from and remove the full group later without affecting unrelated Profile Studio work.

## Install groups

Each call to `install_creator_widget_kit` generates one `install_group_id`. Every widget inserted by that install receives the same group ID in `profile_widget_attribution`, alongside the exact kit ID, version ID, source creator account, and attribution text.

Installing the same kit twice creates two independent install groups. This lets members remove one copy without deleting another.

## Installed Components manager

The Component Library now shows the active character's installed groups with:

- kit title
- creator display name
- widget count
- exact source version ID
- attribution text
- installation order/date from the backend
- Find Source action
- Remove Group action

Find Source filters the Component Library back to the source kit without changing Profile Studio.

## Safe group removal

`remove_installed_widget_kit_group` resolves the signed-in account's active character first. It only deletes profile widgets that both:

1. belong to that active character, and
2. carry the requested install group attribution.

Unrelated Profile Studio widgets are never selected by the removal operation. Deleting the widgets cascades their attribution rows normally.

## Hanami+ boundary

Installing new creator kits still requires active Hanami+. Managing already-installed components does not. Members can review credits, find the source, and remove a previously installed group after Hanami+ expires.

That follows Hanami's broader rule that Hanami+ unlocks advanced creation tools without trapping existing member content behind an active entitlement.
