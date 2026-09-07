# Hanami High v2

A clean rebuild of Hanami High: Discord-inspired structure, SpaceHey-inspired social identity, and Hanami's own school, profile, rewards, and roleplay systems.

## Foundation

- React + TypeScript + Vite
- Supabase Auth / Postgres / RLS / Realtime
- Account-wide identity with a hard limit of two character slots
- Character-specific school/social identity
- Capability-based permissions rather than a simple role ladder
- Accessible, responsive Hanami application shell

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Never put a Supabase secret/service-role key in frontend environment variables.

## Branch strategy

The `v2-rebuild` branch is intentionally a clean tree. The old `main` branch remains the v1 archive/reference until v2 is ready to replace it.
