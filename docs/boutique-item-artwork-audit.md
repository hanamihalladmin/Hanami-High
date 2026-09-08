# Boutique item artwork audit

This repair pass makes published Boutique product art item-specific.

## Rule

A Boutique product's visible artwork must depict the named item itself. `preview_token` is now treated as a legacy/fallback visual hint, not the canonical product-image identity. This prevents distinct products from accidentally showing the same art when a token is reused.

Current published catalog checked against V2 Supabase: 35 items.

Future products receive an item-type-specific fallback preview rather than a misleading image copied from another named product.
