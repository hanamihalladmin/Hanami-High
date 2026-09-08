# Hanami Account Lock Screen & Owner Member Tracker

## Account lock screen

Discord remains the authentication provider. After Discord authentication, Hanami may present an account-level device-style lock screen before character selection or Owner/Admin access.

- Lock screen state is account-wide, not character-specific.
- Students may change or remove their own wallpaper.
- Only an account with `accounts.manage` may generate, rotate, or disable a member PIN.
- PINs are six numeric digits.
- The readable PIN is returned to the Owner only at generation/rotation time.
- Hanami stores only a bcrypt hash after issuance.
- Five incorrect attempts temporarily lock PIN verification for ten minutes.
- Unlock state is browser-session scoped; signing out clears it.

## Unique PIN guarantee

PIN generation is serialized with a PostgreSQL advisory transaction lock. Every candidate is compared against all currently issued bcrypt hashes before it can be assigned. This guarantees that two accounts cannot hold the same active PIN, including concurrent Owner generation actions.

The uniqueness check does not require storing readable PINs or deterministic PIN fingerprints.

## Website sign-in tracking

`private.account_signin_events` records authenticated Hanami website openings. The client records once per browser session, and the server suppresses rapid duplicate events caused by remounts/retries.

Owner reporting RPCs:

- `owner_account_tracking_summary()`
- `owner_signin_events(p_limit)`

These are restricted to accounts with `accounts.manage`.

## Owner spreadsheet

The Owner tracker is structured into:

- Dashboard
- Members
- Characters
- PIN Register
- Sign-In Log
- Moderation Log
- Reference

The PIN Register contains an optional Owner-only plaintext PIN field because readable PINs cannot be recovered from Hanami after issuance. If the Owner chooses to maintain this secondary record, access to the spreadsheet should be tightly restricted.

The authoritative source for account, character, moderation, lock-screen state, and sign-in events remains Supabase. The spreadsheet is an Owner operations/reporting layer, not the security source of truth.
