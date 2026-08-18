# Supabase workflow

The production project is `Hanami High` (`mperfphbhqpjlqmaysmg`) in Tokyo.

- Every schema change must be written as a timestamped SQL migration in `supabase/migrations/`.
- Enable Row Level Security on every user-facing table.
- Add explicit API grants; new tables are not assumed to be exposed automatically.
- Never commit secret keys, database passwords, Discord secrets, or user data.
- Run Supabase security and performance advisors after applying migrations.

The first migration will be added with the authentication and character-account checkpoint.
