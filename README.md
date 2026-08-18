# Hanami High

The official 2000s-inspired Hanami High school network, with modern accessibility and navigation.

## Architecture

- Next.js + TypeScript
- GitHub as the source of truth
- GitHub Actions and GitHub Pages for verified deployments
- Supabase (Tokyo) for authentication, PostgreSQL, authorization, and storage
- `Asia/Tokyo` as the canonical roleplay timezone

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Only browser-safe Supabase values may use the `NEXT_PUBLIC_` prefix. Secret keys must never be committed.
