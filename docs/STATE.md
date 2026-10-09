---
project: Meme Capsule — Serverless Edge Backend & Curation Engine
status: production
current_phase: Production Operations, Multi-Judge Consensus & Scaling
architecture: Cloudflare Pages + Functions + D1 (SQLite) + R2 Media CDN
deployed_url: https://meme-capsule-eww.pages.dev
mobile_companion_app: com.meme.capsule (v3.3 / versionCode 24) on Google Play
web_companion_platform: https://memecapsule.wtf
updated: 2026-09-28
---

# Project State: Meme Capsule (Serverless Edge Backend & Curation Engine)

## 1. Executive Snapshot

This repository serves as the **Serverless Edge Backend, Multi-Judge Curation Engine, Moderation Hub, and Administration Portal** for the Meme Capsule ecosystem. It is deployed on Cloudflare Pages at `https://meme-capsule-eww.pages.dev`.

The legacy prototype landing UI (`src/App.tsx`, `src/styles.css`) has been permanently discontinued and removed. The default root `/` and hash routes serve the internal Neo-Brutalist tool suites (`/curate`, `/admin`, `/reports`, `/ai-judge`, `/categorise`). The public consumer mobile application is maintained in a companion Android repository (`com.meme.capsule`), and the promotional web platform is at `https://memecapsule.wtf`.

### Engineering Leadership & Division
- **Anmol Verma** (`editorav010-dev`): **Lead Backend Developer** — Full backend engineering, serverless Cloudflare architecture, core algorithms, database migrations, security, curation systems, and all internal backend workbenches.
- **Pratham Pandey** (`bbethical010-glitch`): **Lead Frontend Developer & Original Ideator** — Founding concept, frontend landing pages, Android APK development (`com.meme.capsule`), app theme, typography, UI/UX, Java Android bridge, and client integrations.
- **Faraz Ahmed**: **Social Media & Marketing Lead** — Social media handles management, content planning, niche analysis, scripting, and marketing campaigns.

**Official App Contact:** `support@memecapsule.wtf` (with legacy fallback `memecapsule.app@gmail.com`)  
**Official Social Media:**  
- Instagram: https://www.instagram.com/capsule.meme/  
- X: https://x.com/memecapsule_  
- Threads: https://www.threads.com/@capsule.meme

---

## 2. Implemented Architecture & Current Features

### A. Edge Serverless API (`functions/api/`)
- **Public Meme Delivery**:
  - `GET /api/random-meme`: Dual-source meme delivery with fallback (`fallbackMemes.ts`).
  - `GET /api/daily-meme`: Scheduled 24-hour deterministic daily drop.
  - `POST /api/like`: Edge real-time global like counters synchronized with Cloudflare D1.
  - `GET /api/likes`: Batch likes retrieval for pre-liked client state caching.
  - `POST /api/report`: User safety reporting endpoint.
  - `POST /api/contact`: Public and advertiser inquiry endpoint with Cloudflare Pages Functions.
  - `POST /api/events`: Batched client telemetry event ingestion.
- **Admin Collection & Database APIs (`functions/api/admin/`)**:
  - `/api/admin/memes`: Prepared-statement D1 CRUD for meme metadata.
  - `/api/admin/upload`: Multi-part media upload streaming directly to Cloudflare R2 bucket.
  - `/api/admin/sync-r2`: Two-way reconciliation scanning R2 bucket objects into D1 rows.
  - `/api/admin/sql`: Token-protected raw SQL console execution engine with safety guards.
  - `/api/admin/memes/hard-delete`: Destructive cleanup endpoint for removing invalid records.
  - `/api/admin/analytics/*`: Ranking recalculation, trend analysis, overview metrics, and algorithm reset challenges.
- **Curation & Consensus APIs (`functions/api/curate/`)**:
  - `/api/curate/list`, `/api/curate/next`, `/api/curate/save`, `/api/curate/stats`: Multi-judge voting operations.
  - `/api/curate/approve`: Atomic single-judge adoption and authoritative finalization (writes to `meme_curation_final` and `memes`).
  - `/api/curate/force-remove`: Destructive cleanup endpoint permanently purging non-memes from R2 and D1.
  - `/api/curate/account`: Self-service judge credential management.
  - `/api/curate/ai-presets`: Judge-isolated vision model configurations.
  - `/api/curate/super/*`: SuperAdmin conflict resolution, bulk resolution, and summary stats.
- **Categorization & Force Removal APIs (`functions/api/cat/`)**:
  - `/api/cat/decide`, `/api/cat/next`, `/api/cat/login`, `/api/cat/logout`, `/api/cat/me`: Taxonomy tagging operations.
  - `/api/cat/force-remove`: Irreversible purge deactivating D1, logging `meme_force_removals` audit row, and physically deleting media from R2 bucket. See [FORCE_REMOVE_FEATURE.md](file:///Users/prathampandey/Desktop/ai-categoriser/Meme-Capsule/docs/FORCE_REMOVE_FEATURE.md).
- **AI Pre-Curator APIs (`functions/api/ai-judge/`)**:
  - `/api/ai-judge/classify`, `/api/ai-judge/run/start`, `/api/ai-judge/run/stop`, `/api/ai-judge/run/progress`: Autonomous multimodal evaluation loop.

### B. Cloudflare D1 Database & Migrations (`d1/migrations/`)
The database `meme-capsule-db` (SQLite at the edge) operates under 13 sequential migrations:
1. `000_complete_setup.sql`: Core schema initialization.
2. `002_analytics.sql`: Event tracking, interactions, and ranking tables.
3. `003_categorisation.sql`: Multi-judge accounts and editorial taxonomy.
4. `004_ai_judge.sql`: AI judge operator tables and evaluation logs.
5. `004_curation.sql`: Multi-judge consensus tracking tables.
6. `005_curation_final.sql`: SuperAdmin authoritative resolution tables.
7. `006_judge_ai_presets.sql`: Private AI vision presets per judge.
8. `007_add_judge4_judge5.sql`: Expansion of judge accounts for majority consensus.
9. `008_optimize_curation_indexes.sql`: High-performance composite indexes.
10. `009_add_api_password_to_users.sql`: SHA-256 hashed API passwords for judge sessions.
11. `010_enforce_superadmin_active_and_cleanup_judges.sql`: Session cleanup and active role enforcement.
12. `011_reconcile_active_and_curation_sync.sql`: Synchronization of active counts between Admin and Curation portals.
13. `012_add_curation_status_to_memes.sql`: 3-tier partitioning architecture introducing `curation_status` (`active`, `excluded`, `backlog`).

### C. Cloudflare R2 Media Storage
- Bucket `memes` configured with public access enabled.
- Zero egress fees for high-volume WebP image and MP4/GIF delivery.
- Media synchronization engine in `/admin` ensuring D1 metadata matches physical R2 storage objects.

- **`/curate`**: Multi-judge consensus curation dashboard with keyboard shortcuts (`K`, `X`, `D`, `R`), fast-approval of AI Consensus (`Space`/`Enter`), instant single-AI adoption, authoritative single-judge finality (`POST /api/curate/approve`), destructive Force Remove (`Shift+Delete` / `POST /api/curate/force-remove`), Superadmin dashboard view with force removal audit, judge account management, judge-isolated AI presets, and CSV/JSON export. Deeply integrates the **AI-Judgement Review Workflow** with AI Judges 4 and 5.
- **`/admin`**: Administration console with D1 SQL console, R2 media sync, 5-metric status bar, CSV/Excel export, analytics algorithm tuning, and dark mode.
- **`/categorise`**: Multi-topic taxonomy tagging, tone labeling, and humor mechanism tagging.
- **`/ai-judge`**: Multimodal AI pre-curator loop powered by NVIDIA NIM Llama 3.2 Vision and universal vision models.
- **`/reports`**: Token-gated content safety moderation desk.

---

## 3. Active Cross-Codebase Synchronization

The single source of truth across all 3 codebases lives in `docs/MEME_CAPSULE_KNOWLEDGE.md`, synchronized through `editorav010-dev/meme-capsule-sync`.
- **Fetch Script**: `powershell -File fetch-knowledge.ps1` (or `./fetch-knowledge.sh` on macOS/Linux).
- **Update Script**: `powershell -File update-knowledge.ps1` (or `./update-knowledge.sh` on macOS/Linux).
- Local sync metadata is tracked in `.knowledge/.knowledge_meta.json`.

---

## 4. Current Verification & Build Status

- **Build Command**: `npm run build` (`tsc && vite build`).
- **Build Output**: Passes with 0 errors (all 1632 modules bundled into `dist/`).
- **Production Hosting**: Cloudflare Pages (`https://meme-capsule-eww.pages.dev`).
