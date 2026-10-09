# Project Structure

## Overview

Meme Capsule is a minimalist curated meme PWA built with Vite + React + TypeScript and deployed on Cloudflare Pages. The backend uses Cloudflare R2 (file storage) and D1 (SQLite database) — all on one platform with zero external vendor dependencies.

**Source Code:** [https://github.com/editorav010-dev/Meme-Capsule](https://github.com/editorav010-dev/Meme-Capsule)

**Development Team:**
- **Anmol Verma** (Lead Backend Developer — GitHub: `editorav010-dev`): Backend architecture, core algorithms, AI tools, security & all internal backend workbenches.
- **Pratham Pandey** (Lead Frontend Developer & Original Ideator — GitHub: `bbethical010-glitch`): Founding concept, APK, web platform, UI/UX & client integrations.
- **Faraz Ahmed** (Social Media & Marketing Lead): Social handles, content planning & marketing campaigns.  
**Official App Email:** `support@memecapsule.wtf` | **Instagram:** https://www.instagram.com/capsule.meme/ | **X:** https://x.com/memecapsule_ | **Threads:** https://www.threads.com/@capsule.meme

## Directory Map

<!-- DIRECTORY_MAP_START -->
```
meme application/
├── .knowledge
│   └── .knowledge_meta.json
├── .nexus
├── .vscode
│   └── launch.json
├── d1                                                # Cloudflare D1 database (NEW — Phase 2)
│   ├── migrations
│   │   ├── 000_complete_setup.sql
│   │   ├── 002_analytics.sql
│   │   ├── 003_categorisation.sql
│   │   ├── 004_ai_judge.sql
│   │   ├── 004_curation.sql
│   │   ├── 005_curation_final.sql
│   │   ├── 006_judge_ai_presets.sql
│   │   ├── 007_add_judge4_judge5.sql
│   │   ├── 008_optimize_curation_indexes.sql
│   │   ├── 009_add_api_password_to_users.sql
│   │   ├── 010_enforce_superadmin_active_and_cleanup_judges.sql
│   │   ├── 011_reconcile_active_and_curation_sync.sql
│   │   └── 012_add_curation_status_to_memes.sql
│   ├── schema.sql                                    # SQLite schema for meme metadata
│   └── seed.sql
├── docs                                              # Dedicated project documentation folder
│   ├── planning                                      # Project planning and roadmap (in docs/)
│   │   ├── AI-SPEC.md
│   │   └── ROADMAP.md                                # Phase-by-phase development plan
│   ├── AGENT_RULES.md
│   ├── AGENTS.md
│   ├── AI_PREJUDGE_CURATE_ANALYSIS.md
│   ├── CHANGELOG.md                                  # Version history
│   ├── CLAUDE.md                                     # Development setup & commands guide
│   ├── CLOUDFLARE_D1_USAGE_AND_OPTIMIZATION_REPORT.md
│   ├── CLOUDFLARE_LIMITS_AND_SCALING_RESEARCH.md
│   ├── DATABASE.md                                   # Database and storage architecture docs
│   ├── GEMINI.md
│   ├── MEME_CAPSULE_KNOWLEDGE.md
│   ├── PRIVACY_COOKIES_AND_DATA_FLOWS.md
│   ├── PROJECT_STRUCTURE.md                          # This file
│   ├── README_ANALYTICS.md
│   ├── README.md                                     # Project overview and setup guide
│   ├── report.md
│   └── STATE.md                                      # Current project state and next actions (in docs/)
├── functions                                         # Cloudflare Pages Functions (serverless API)
│   ├── _shared                                       # Shared utilities for all API routes
│   │   ├── aiJudgeAuth.ts
│   │   ├── analyticsCache.ts
│   │   ├── analyticsFormulas.ts
│   │   ├── catAuth.ts
│   │   ├── catConsensus.ts
│   │   ├── crypto.ts
│   │   ├── curateDb.ts
│   │   ├── d1r2.ts                                   # D1 + R2 helper (NEW — replaces supabase.ts)
│   │   ├── fallbackMemes.ts                          # Static fallback memes for offline/empty DB
│   │   └── pages.ts                                  # Cloudflare Pages type definitions
│   ├── api                                           # API route handlers
│   │   ├── admin                                     # Admin dashboard
│   │   │   ├── ai
│   │   │   │   └── override.ts
│   │   │   ├── analytics
│   │   │   │   ├── meme
│   │   │   │   │   └── [memeId].ts
│   │   │   │   ├── insights.ts
│   │   │   │   ├── overview.ts
│   │   │   │   ├── rankings.ts
│   │   │   │   ├── recalculate.ts
│   │   │   │   ├── reset.ts
│   │   │   │   └── trends.ts
│   │   │   ├── memes
│   │   │   │   └── hard-delete.ts
│   │   │   ├── ai-categorise.ts
│   │   │   ├── ai-comparison.ts
│   │   │   ├── ai-stats.ts
│   │   │   ├── memes.ts                              # GET/POST/PATCH/DELETE /api/admin/memes
│   │   │   ├── sql.ts
│   │   │   ├── sync-r2.ts                            # POST /api/admin/sync-r2 (R2→D1 sync)
│   │   │   └── upload.ts                             # POST /api/admin/upload
│   │   ├── ai-judge
│   │   │   ├── run
│   │   │   │   ├── progress.ts
│   │   │   │   ├── start.ts
│   │   │   │   └── stop.ts
│   │   │   ├── classify.ts
│   │   │   ├── config.ts
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── next-meme.ts
│   │   │   └── runs.ts
│   │   ├── cat
│   │   │   ├── admin                                 # Admin dashboard
│   │   │   │   ├── reset.ts
│   │   │   │   └── users.ts
│   │   │   ├── analytics
│   │   │   │   ├── confirm.ts
│   │   │   │   ├── memes.ts                          # GET/POST/PATCH/DELETE /api/admin/memes
│   │   │   │   └── overview.ts
│   │   │   ├── meme
│   │   │   │   └── [memeId].ts
│   │   │   ├── decide.ts
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── me.ts
│   │   │   └── next.ts
│   │   ├── curate
│   │   │   ├── super
│   │   │   │   ├── bulk-resolve.ts
│   │   │   │   ├── export.ts
│   │   │   │   ├── memes.ts                          # GET/POST/PATCH/DELETE /api/admin/memes
│   │   │   │   ├── resolve.ts
│   │   │   │   └── summary.ts
│   │   │   ├── account.ts
│   │   │   ├── ai-presets.ts
│   │   │   ├── ai-proxy.ts
│   │   │   ├── approve.ts                            # POST /api/curate/approve (atomic adoption & finalization)
│   │   │   ├── export.ts
│   │   │   ├── force-remove.ts                       # POST /api/curate/force-remove (permanent R2 & D1 deletion)
│   │   │   ├── list.ts
│   │   │   ├── next.ts
│   │   │   ├── save.ts
│   │   │   └── stats.ts
│   │   ├── contact.ts
│   │   ├── daily-meme.ts                             # GET /api/daily-meme — public
│   │   ├── events.ts
│   │   ├── like.ts
│   │   ├── likes.ts
│   │   ├── random-meme.ts                            # GET /api/random-meme — public
│   │   └── report.ts
│   └── reports.ts
├── functions-dist
│   └── index.js
├── public                                            # Static assets served directly
│   ├── _headers                                      # Cloudflare Pages custom headers
│   ├── icon.svg                                      # PWA icon
│   ├── manifest.webmanifest                          # PWA manifest
│   └── sw.js                                         # Service worker for offline support
├── src                                               # Frontend source code
│   ├── admin                                         # Admin dashboard
│   │   ├── ai
│   │   │   ├── aiApi.ts
│   │   │   ├── AiComparison.tsx
│   │   │   ├── AiOverrideDrawer.tsx
│   │   │   ├── AiOverview.tsx
│   │   │   ├── AiTab.tsx
│   │   │   └── categories.ts
│   │   ├── analytics-dashboard
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── InsightsList.tsx
│   │   │   ├── MemeDetail.tsx
│   │   │   ├── Overview.tsx
│   │   │   ├── Rankings.tsx
│   │   │   └── TrendChart.tsx
│   │   ├── sql-runner
│   │   │   └── SqlRunner.tsx
│   │   ├── admin.css                                 # Admin-specific styles
│   │   ├── AdminApp.tsx                              # Admin UI component
│   │   └── AdminGate.tsx
│   ├── ai-judge
│   │   ├── aiJudge.css
│   │   ├── aiJudgeApi.ts
│   │   └── AiJudgeApp.tsx
│   ├── analytics
│   │   ├── analyticsFlush.ts
│   │   ├── analyticsQueue.ts
│   │   ├── analyticsTypes.ts
│   │   ├── deviceId.ts
│   │   ├── index.ts
│   │   └── useAnalytics.ts
│   ├── categorise
│   │   ├── superadmin
│   │   │   ├── CategoryDistribution.tsx
│   │   │   ├── JudgeProgress.tsx
│   │   │   ├── MemeComparisonTable.tsx
│   │   │   └── SuperDashboard.tsx
│   │   ├── cat.css
│   │   ├── catApi.ts
│   │   ├── CatApp.tsx
│   │   ├── CatComplete.tsx
│   │   ├── CatInterface.tsx
│   │   ├── CatLogin.tsx
│   │   ├── catTypes.ts
│   │   └── useCatAuth.ts
│   ├── curate
│   │   ├── ai-judge
│   │   │   ├── aiJudgeClient.ts
│   │   │   ├── AiJudgeConsole.tsx
│   │   │   ├── aiJudgePrompt.ts
│   │   │   ├── aiJudgeTypes.ts
│   │   │   └── useAiJudgeLoop.ts
│   │   ├── super
│   │   │   ├── curateSuperApi.ts
│   │   │   ├── CurateSuperDashboard.tsx
│   │   │   ├── CuratorComparisonTable.tsx
│   │   │   └── CuratorResolveModal.tsx
│   │   ├── AiPreJudgePanel.tsx
│   │   ├── AiReviewPanel.tsx
│   │   ├── CategorizationPanel.tsx
│   │   ├── curate.css
│   │   ├── CurateAccountModal.tsx
│   │   ├── curateApi.ts
│   │   ├── CurateApp.tsx
│   │   ├── CurateLogin.tsx
│   │   ├── curateTypes.ts
│   │   ├── CurationStatsModal.tsx
│   │   └── EditorialButtons.tsx
│   ├── data                                          # Static data
│   │   └── fallbackMemes.ts                          # Static fallback memes for offline/empty DB
│   ├── lib                                           # Utility modules
│   │   ├── adminApi.ts                               # Frontend → admin API client
│   │   ├── adminCollection.ts                        # Local admin collection (localStorage)
│   │   ├── localState.ts                             # Local device state (favorites, LOLs)
│   │   └── memeApi.ts                                # Frontend → public meme API client
│   ├── base.css
│   ├── main.tsx                                      # React entry point and router
│   ├── types.ts                                      # TypeScript type definitions (Meme, Rarity, etc.)
│   └── vite-env.d.ts                                 # Vite environment type augmentation
├── workers
│   └── analyticsAggregator.ts
├── .dev.vars
├── .dev.vars.example                                 # Environment variable template
├── .env
├── .gitignore                                        # Git ignore rules
├── converted.pdf
├── fetch-knowledge.ps1
├── index.html                                        # HTML entry point
├── package-lock.json                                 # Locked dependency tree
├── package.json                                      # Dependencies and scripts
├── stitch_admin.html
├── tsconfig.functions.json
├── tsconfig.json                                     # TypeScript configuration
├── update-knowledge.ps1
├── vite.config.ts                                    # Vite build configuration
└── wrangler.toml                                     # Cloudflare Workers/Pages config (NEW — Phase 2)
```
<!-- DIRECTORY_MAP_END -->


## Key Components and How They Interact

### Frontend (src/)

| File | Role | Talks To |
|---|---|---|
| `App.tsx` | Main meme capsule UI — spawn button, reveal animation, share/save actions | `memeApi.ts` |
| `main.tsx` | Entry point — renders App or AdminApp based on URL path | `App.tsx`, `AdminApp.tsx` |
| `memeApi.ts` | Fetches memes — tries local admin drafts → API → fallback | `adminCollection.ts`, `/api/random-meme`, `fallbackMemes.ts` |
| `adminApi.ts` | Calls admin backend routes for CRUD and upload | `/api/admin/memes`, `/api/admin/upload` |
| `adminCollection.ts` | Manages admin draft memes in browser localStorage | `localStorage` |
| `share.ts` | Native share sheet and download/save functionality | Browser APIs |
| `localState.ts` | Local favorites and LOL reaction state | `localStorage` |

### Backend (functions/)

| File | Route | Role | Talks To |
|---|---|---|---|
| `random-meme.ts` | `GET /api/random-meme` | Returns one random active meme | D1 database → fallback memes |
| `daily-meme.ts` | `GET /api/daily-meme` | Returns the daily curated pick | D1 database → fallback memes |
| `admin/memes.ts` | `GET/POST/PATCH/DELETE /api/admin/memes` | Admin CRUD for meme metadata | D1 database |
| `admin/upload.ts` | `POST /api/admin/upload` | Uploads image/video to R2 storage | R2 bucket |
| `admin/sync-r2.ts` | `POST /api/admin/sync-r2` | Scans R2 and creates D1 records for untracked files | R2 bucket → D1 database |
| `_shared/d1r2.ts` | (shared module) | D1 queries, R2 helpers, auth, fallback logic | D1, R2, fallback memes |

### Data Flow

```
User taps "Spawn a Random Meme"
  │
  ├── [Dev mode] Check localStorage for active admin drafts
  │     └── Found? Return it immediately
  │
  ├── [Production] GET /api/random-meme
  │     └── Cloudflare Function → D1 query (active memes) → return one
  │           └── D1 empty/error? Return bundled fallback meme
  │
  └── [Offline] Return bundled fallback from src/data/fallbackMemes.ts
```

```
Admin uploads a meme
  │
  ├── POST /api/admin/upload (file → R2 bucket)
  │     └── Returns: { url, storage_path, media_type }
  │
  └── POST /api/admin/memes (metadata → D1)
        └── Sets status='draft', is_active=0 until manually activated
```

```
Admin clicks "Sync R2 Files to D1"
  │
  └── POST /api/admin/sync-r2
        ├── Lists all files in R2 bucket
        ├── Checks which files have no D1 record
        └── Creates D1 rows for missing files (status='active', is_active=1)
```

## Infrastructure

| Service | Purpose | Free Tier |
|---|---|---|
| Cloudflare Pages | Host the PWA (HTML/CSS/JS) | Unlimited sites, 500 builds/month |
| Cloudflare Pages Functions | Serverless API routes | Unlimited requests |
| Cloudflare D1 | SQLite database for meme metadata | 5 GB, 5M reads/day |
| Cloudflare R2 | Object storage for meme files | 10 GB, zero egress fees |

## Scripts

| Command | What It Does |
|---|---|
| `npm.cmd install` | Install all dependencies |
| `npm.cmd run dev` | Start local Vite dev server (frontend only) |
| `npm.cmd run build` | Build production bundle to `dist/` |
| `npm.cmd run preview` | Preview production build locally |
| `npx wrangler pages dev dist` | Run with D1 + R2 bindings locally |
