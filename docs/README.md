# Meme Capsule — Ultimate Minimalist Meme PWA

A high-performance, minimalist curated meme platform built with **Vite + React + TypeScript** and powered by **Cloudflare R2 + D1**.

**GitHub Repo:** [https://github.com/editorav010-dev/Meme-Capsule](https://github.com/editorav010-dev/Meme-Capsule)

## Development Team & Engineering Division

Meme Capsule is a collaborative project developed by **Anmol Verma** and **Pratham Pandey**:
- **Anmol Verma** ([@editorav010-dev](https://github.com/editorav010-dev) — `anmolverma.env@gmail.com`): Lead Developer — Full backend engineering, backend architecture, core algorithms, application logic and workflows, and backend systems implementation.
- **Pratham Pandey** (`bbethical010@gmail.com`): Frontend landing pages, APK/application-side development, API call integrations, and related frontend setup.

## Ecosystem Overview: Public Product vs. Internal Systems

Meme Capsule operates across two distinct codebases:
1. **Public / Mass-Audience Product**: Maintained in a companion Android repository (`com.meme.capsule`). Features Capacitor 8 Android app, `HIT ME` single-item drops, 7-meme FIFO prefetch buffer, native Android Scoped MediaStore image saving, Mood Boards, Meme Vault, AdMob monetization, and Google Play billing. Public promotional web presence is at `https://memecapsule.wtf/`.
2. **Developer / Internal Backend (This Repository)**: Deployed on Cloudflare Pages (`https://meme-capsule-eww.pages.dev`). Serves the serverless API (`functions/api/`), Cloudflare D1/R2 storage, and the internal Neo-Brutalist workbenches (`/curate`, `/admin`, `/reports`, `/ai-judge`, `/categorise`). The discontinued legacy root landing UI has been completely removed.

## Core Documentation Index

- [`docs/MEME_CAPSULE_KNOWLEDGE.md`](./MEME_CAPSULE_KNOWLEDGE.md) — Master product & technical specification, core product FAQs, and system architecture.
- [`docs/PRIVACY_COOKIES_AND_DATA_FLOWS.md`](./PRIVACY_COOKIES_AND_DATA_FLOWS.md) — Exhaustive audit of website cookies, Formspree contact form, GA4 telemetry, AdMob integration, and Google Play Data Safety declarations.
- [`docs/DATABASE.md`](./DATABASE.md) — Cloudflare D1 SQLite database schemas, migrations, and R2 media bucket architecture.
- [`docs/PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) — Detailed directory mapping, route mappings, and component hierarchy.
- [`docs/README_ANALYTICS.md`](./README_ANALYTICS.md) — Analytics tracking SDK, ingestion API, and worker aggregation pipeline.
- [`docs/report.md`](./report.md) — Google Lighthouse audit analysis, Core Web Vitals, accessibility, and backend caching remediation report.
- [`docs/CHANGELOG.md`](./CHANGELOG.md) — Release history and migration milestones.
- [`docs/CLAUDE.md`](./CLAUDE.md) — Local development, Wrangler commands, and environment settings.

## What Is Implemented In This Repository

- **Curation & Categorization Engine (`/curate`, `/categorise`)**:
  - Multi-judge consensus system with token authentication (`cat_users`).
  - Layer 0 editorial keyboard shortcuts (`K` keep, `E` exclude, `D` duplicate, `L` review later).
  - Multi-topic taxonomy tagging, tone labeling, and humour mechanism tagging.
  - Superadmin resolution dashboard for arbitrating conflicting judge votes.
- **AI Pre-Judge Assisted Loop (`/ai-judge`)**:
  - LLM-assisted batch evaluation of unreviewed memes.
  - Automatic confidence-scored recommendation generation for human approval.
- **Admin Dashboard (`/admin`)**:
  - Cloudflare D1 database management and R2 storage sync.
  - Raw SQL query runner with safe execution guards.
  - Event telemetry recalculation engine and CSV/Excel exports.
- **Moderation Dashboard (`/reports`)**:
  - Token-protected review interface for user-reported content.
  - One-click meme archiving and addition to `content_blacklist`.
- **Edge Serverless API (`functions/api/`)**:
  - `GET /api/random-meme` & `GET /api/daily-meme` (dual-source delivery with fallback).
  - `POST /api/events` (telemetry queue flusher).
  - `POST /api/report` (user safety reporting).
  - Admin analytics endpoints (`/api/admin/analytics/*`).

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
