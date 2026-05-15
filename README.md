# Meme Capsule — Ultimate Minimalist Meme PWA

A high-performance, minimalist curated meme platform built with **Vite + React + TypeScript** and powered by **Cloudflare R2 + D1**.

**GitHub Repo:** [https://github.com/bbethical010-glitch/meme-capsule](https://github.com/bbethical010-glitch/meme-capsule)

## What Is Implemented

- Mobile-first Vite + React + TypeScript app.
- `Spawn a Random Meme` reveal flow with a playful pop animation.
- Share, save, favorite, and local LOL reactions.
- Daily Drop mode.
- Admin-only dashboard at `/admin` for local draft collection management.
- Save/download behavior preserves the original file extension where the browser can detect it.
- Public meme display and admin preview preserve the meme's natural aspect ratio.
- Local curated starter pack so the app works before the backend is configured.
- Cloudflare Pages Functions:
  - `GET /api/random-meme`
  - `GET /api/daily-meme`
- Cloudflare R2 + D1 backend (migrating from Supabase).
- PWA manifest and production service worker.

## Product Logic

The public app intentionally has one repeat action. The earlier UI showed two `Again` buttons after a meme appeared: the primary CTA changed to `Again`, and a second yellow `Again` button appeared beside it. That was redundant, so the app now uses one primary button:

- Before a meme: `Spawn a Random Meme`
- After a meme: `Spawn Another`

`Daily Drop` has a separate purpose: it reveals the same curated pick for the current day. It is not another random button. Its user value is a tiny return ritual without adding feeds, accounts, streak pressure, or clutter.

## Admin Dashboard

Open:

```text
http://127.0.0.1:5173/admin
```

The admin dashboard supports:

- `Add Meme to Collection`
- `View Meme Collection`
- `Edit Meme Details`
- `Delete Meme`
- Direct URL input
- Google Drive link input
- Local image/video upload for draft preview
- Exporting the local collection as JSON

Important: the current admin dashboard stores collection drafts in browser `localStorage`. Active local admin memes are used by the public app in the same browser for testing. This is intentionally a zero-cost Phase 1.5 workflow, not the final production storage layer.

For production, `/admin` connects to Cloudflare Pages Functions backed by R2 (file storage) and D1 (meme metadata database) as described in [DATABASE.md](./DATABASE.md).

Backend mode requires this server-side environment variable:

- `ADMIN_API_TOKEN`

D1 and R2 are accessed via native Cloudflare bindings defined in `wrangler.toml` — no additional URL or key variables needed.

Admin backend routes:

- `GET /api/admin/memes` - list all meme records
- `POST /api/admin/memes` - create meme metadata
- `PATCH /api/admin/memes` - update meme metadata, including safe ID edits
- `DELETE /api/admin/memes` - archive a meme by setting `status = archived` and `is_active = 0`
- `POST /api/admin/upload` - upload image/video files to R2

The admin token is not bundled into the frontend. Type it into the `/admin` backend panel when you want to manage R2/D1 content.

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Open the printed localhost URL.

To open the admin dashboard, go to `/admin` on the same local server.

To test with D1 + R2 bindings locally:

```bash
npx wrangler pages dev dist
```

## Build

```bash
npm.cmd run build
```

## Deploy To Cloudflare Pages

Build command:

```bash
npm.cmd run build
```

Build output directory:

```text
dist
```

Add the admin token in Cloudflare Pages environment settings:

- `ADMIN_API_TOKEN`

D1 database and R2 bucket bindings are configured in `wrangler.toml` and applied automatically during deployment.

## Current Storage Reality

Right now there are three storage layers:

1. Static starter memes in `src/data/fallbackMemes.ts`.
2. Admin draft memes in browser `localStorage`.
3. Production memes in Cloudflare R2 (files) + D1 (metadata).

The live app retrieval order is:

1. Active local admin memes, for local testing.
2. Cloudflare D1/R2 API, when deployed and configured.
3. Static fallback starter memes.
