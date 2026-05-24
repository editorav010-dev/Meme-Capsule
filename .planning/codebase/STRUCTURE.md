# Project Structure

## Frontend (`src/`)
- `App.tsx` & `main.tsx`: Entry points for the application.
- `admin/`: Admin UI components and styles.
- `lib/`: API clients (`adminApi.ts`, `memeApi.ts`), local state management, and native share handlers.
- `data/`: Bundled static fallback data.

## Serverless API (`functions/`)
- `api/`: Cloudflare Functions handlers for public routes (`daily-meme.ts`, `random-meme.ts`, `like.ts`).
- `api/admin/`: Admin-specific API handlers (`memes.ts`, `upload.ts`, `sync-r2.ts`).
- `_shared/`: Shared business logic and Cloudflare Pages types.

## Infrastructure
- `d1/`: D1 schema definitions (`schema.sql`, `seed.sql`).
- `docs/`: Comprehensive project documentation.
- `public/`: Static assets (Manifest, Service worker).
- `wrangler.toml`: Cloudflare bindings and setup.
