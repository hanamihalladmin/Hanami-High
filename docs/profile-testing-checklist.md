# Hanami High — Profile Testing Checklist

**Milestone:** Profile system / Profile Studio

Use this checklist for both Student and Faculty characters. Test with real Discord-authenticated Hanami accounts only. Do not use external email for any Hanami communication flow.

## 1. Profile identity and privacy

- Open **Profile & Privacy** from a Student character.
- Save a headline, status message, and biography.
- Confirm the values survive refresh and logout/login.
- Repeat with a Faculty character.
- Test **Public**, **Friends only**, and **Private** visibility.
- Confirm Public profiles are visible to another signed-in Hanami character.
- Confirm Friends-only profiles are hidden before friendship acceptance and visible after acceptance.
- Confirm Private profiles remain owner-only.

## 2. Profile templates

Apply each starting template and confirm Profile Studio refreshes without a full portal reload:

- Scrapbook
- Student ID Board
- Magazine Profile
- Minimal Desktop

For every template, confirm all created elements remain editable and removable.

## 3. Profile Studio canvas

- Change page size between Standard, Tall, Square, and Showcase.
- Change canvas background color.
- Toggle Grid and Snap.
- Add, move, resize, rotate, restyle, lock, duplicate, and delete widgets.
- Refresh the page and confirm saved layout persists.
- Log out, log back in, and confirm the layout persists for the same character.

## 4. Multi-select and editing tools

- Shift-click two or more widgets.
- Drag the selection as a group.
- Test Align left, Center, Align right, Align top, Middle, and Align bottom.
- Test To front and To back.
- Test Undo and Redo after movement/style changes.
- Confirm locked widgets cannot be dragged or resized.

## 5. Widget library

Create and customize each widget type:

- Text
- Image
- Card
- Link
- Divider
- Sticker
- Quote
- Playlist
- Photo Strip
- Badge
- Marquee
- Guestbook / Link Board

Check font, size, colors, alignment, opacity, rotation, corner radius, position, dimensions, and layer behavior where applicable.

## 6. Private image uploads

For Image and Photo Strip widgets:

- Upload a JPEG, PNG, GIF, and WebP under 5 MB.
- Confirm unsupported types are rejected.
- Confirm files over 5 MB are rejected.
- Confirm the owner sees the uploaded image immediately.
- Replace an uploaded image and confirm the replacement displays correctly.
- Confirm the widget stores a private Hanami upload rather than exposing a permanent public storage URL.

## 7. Viewer rendering

Using another authorized Hanami character:

- Search the exact character handle in **Hanami Profiles**.
- Confirm the saved custom canvas appears.
- Confirm positions, sizes, rotation, opacity, fonts, colors, and layers visually match the owner view.
- Confirm Quote, Playlist, Photo Strip, Badge, Marquee, and Guestbook widgets render correctly.
- Confirm Marquee respects reduced-motion browser preferences.
- Confirm private uploaded images display only when profile visibility allows the viewer.

## 8. Character isolation

- Create or use two characters on the same Discord account.
- Give each character a different profile design.
- Switch between characters and confirm each design remains separate.
- Confirm friendships are character-specific rather than account-wide.
- Confirm deleting one character does not change the surviving character's profile.

## 9. Permanent deletion

- Open Delete character.
- Confirm the permanent-deletion warning is visible.
- Confirm deletion cannot proceed until `DELETE` is typed exactly.
- Delete a disposable test character.
- Confirm its character profile, canvas, widgets, friendships, memberships, and personal character data no longer load.
- Confirm shared historical school/message records do not break for other users and deleted identities are anonymized where applicable.

## 10. Responsive/browser testing

Test at minimum:

- Desktop wide layout
- Narrow desktop/tablet width
- Mobile width
- Mouse interaction
- Touch/pointer interaction if available
- Browser refresh during an active character session
- Logout/login session restoration

## Bug report format

For each bug, record:

1. Student or Faculty character
2. Browser/device
3. Exact steps to reproduce
4. Expected result
5. Actual result
6. Screenshot or screen recording if useful
7. Whether the bug persists after refresh
8. Whether it affects Public, Friends-only, Private, or all profile visibility modes

Do not include Discord tokens, Supabase tokens, private keys, or other credentials in bug reports.
