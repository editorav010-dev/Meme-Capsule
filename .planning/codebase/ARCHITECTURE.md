# Architecture

The Meme Capsule utilizes a serverless full-stack architecture running entirely on Cloudflare's ecosystem.

## Client-Side Flow
- **Public Users:** Request random or daily memes. The frontend (`src/lib/memeApi.ts`) fetches data from the Cloudflare API endpoints. If offline or unreachable, it falls back to a bundled `fallbackMemes.ts`.
- **Admin Dashboard:** Accesses `/api/admin/*` endpoints to upload media, create meme metadata, and sync R2 contents to D1.

## Server-Side Flow
- **Cloudflare Pages Functions (`functions/api/`):** Handle all API logic.
    - `random-meme.ts`, `daily-meme.ts`: Query D1 for active memes.
    - `admin/memes.ts`: CRUD operations on D1 database.
    - `admin/upload.ts`: Write media files directly to R2.
    - `admin/sync-r2.ts`: Audit R2 bucket against D1 rows and synchronize.
- **Shared Utils (`functions/_shared/d1r2.ts`):** Provides common database helpers, Cloudflare environment types, and access to bindings.
