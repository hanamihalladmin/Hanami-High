# Creator Portfolios & Source Pages

Creator Portfolios provide a public destination for Hanami's creator attribution system.

## Visibility

Creator directory and portfolio data follows the existing Creator Marketplace visibility rules:
- only `public` and `unlisted` creator portfolios can be opened by other members
- only published public/unlisted themes appear on another member's portfolio
- only published public/unlisted widget kits appear
- only public/unlisted creator collections appear
- private drafts and private creator work remain private

The directory summary RPC exposes public creator identity plus aggregate counts only. It does not bypass RLS for private work.

## Routes

- `#/hanami-plus/creators` opens the public creator directory
- `#/hanami-plus/creators/<account-id>` opens a specific creator portfolio

Creator portfolios remain inside the Hanami+ creative section, but browsing and creator attribution are standard Hanami behaviors and do not require an active Hanami+ entitlement.

## Portfolio contents

A visible creator portfolio can show:
- creator display name, slug, avatar, banner, and bio
- follower count
- published themes
- remixed themes with source attribution
- published widget kits
- public creator collections
- a link to the creator's primary character profile when configured

## Following

Signed-in members can follow or unfollow visible creators through the existing `creator_follows` table. Following does not grant access to private creator work.

## Design Credits integration

The profile Design Credits RPC includes the source creator account ID. Theme and component credits on visible profiles link to the corresponding creator portfolio rather than only to a generic marketplace screen.
