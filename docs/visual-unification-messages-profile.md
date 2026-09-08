# Messages + Profile Visual Unification

This batch keeps Hanami High's Discord-inspired communication structure while bringing its visual language back into the same website as the rest of V2.

## Messages

The information architecture remains familiar: Friends, Message Requests, Direct Messages, Groups, conversation list, stacked sender groups, role/custom tags, and the reply composer are unchanged.

The Discord-dark presentation is removed. Messages now uses the Hanami early-web system:

- ivory/paper surfaces
- sage structure and borders
- dusty-pink selected states and actions
- Georgia/serif display headings
- double/dotted early-web framing
- the same Main Rail, section-navigation styling, user panel, inputs, and module grammar as the rest of V2
- site-theme tokens instead of a fixed Discord palette

The special communication layout remains space-efficient for chat, but its chrome is reset to Hanami styling and the page fills its available column instead of leaving a large blank region.

## Public profile direction

The supplied pink/charcoal profile reference is used as composition inspiration rather than copied literally. Public Hanami profiles now emphasize:

- a taller banner
- overlapping avatar and online indicator
- larger identity block
- handle/pronoun line
- pill-style custom status
- rounded profile actions
- soft stacked/profile cards
- prominent profile tabs and widget modules
- stronger music/divider/sticker presentation

All colors still derive from the member's profile variables (`--profile-bg`, `--profile-panel`, `--profile-accent`, `--profile-ink`), so a dark pink/grey profile can resemble the reference while light, diary, webring, and other custom themes keep their own identity.

Existing profile layouts, widgets, public blog, guestbook, visibility, and Profile Studio remain the source of truth. No parallel profile data model was introduced.

## Appearance permissions repair

`account_site_theme_presets` already had correct RLS rules, but the authenticated role was missing basic table privileges. Migration `0082_appearance_theme_preset_permissions.sql` restores SELECT/INSERT/UPDATE/DELETE to `authenticated`; RLS continues to enforce account ownership and Hanami+ write requirements.
