# Roadmap

## Milestone 0: Zero-Investment Curated Meme PWA

Goal: Build and launch a tiny, fast, owner-curated meme application with no paid infrastructure. The app should feel playful and shareable without becoming a feed, social network, or bloated content platform.

## Phase 1: MVP App Shell - Complete

Status: COMPLETE

Delivered:

- Vite + React + TypeScript PWA foundation.
- Single-screen meme capsule experience.
- Primary `Spawn a Random Meme` CTA.
- Meme reveal animation.
- Share, save, favorite, Daily Drop, rarity badge, and LOL reaction controls.
- Local curated fallback meme data.
- PWA metadata, icon, headers, and service worker.
- Cloudflare Pages Function stubs for random and daily memes.
- Supabase schema and admin workflow documentation.
- Duplicate `Again` action removed; public app now has one repeat CTA.

Acceptance already met:

- `npm.cmd run build` passes.
- Project can be opened from `C:\Users\avspn\Desktop\meme application`.

## Phase 1.5: Review + Starter Content Replacement - Complete

Status: COMPLETE

Goal: Review the implemented app and replace placeholder starter memes with real owner-curated content while keeping the app lightweight and locally runnable.

Tasks:

- Run `npm.cmd run dev` and review the UI.
- Check mobile layout, button spacing, text fit, reveal feel, and share/save behavior.
- Use `/admin` to add local draft memes by URL, Google Drive link, or upload preview.
- Mark reviewed local memes as `active` to test them in the public app.
- Replace placeholder generated memes in `src/data/fallbackMemes.ts` only if a static bundled collection is still wanted.
- Keep at least 20 curated memes available before backend launch testing.
- Confirm every meme has category, tags, rarity, share text, and rights note.

Acceptance criteria:

- App still builds with `npm.cmd run build`.
- Random spawn works without Supabase configured.
- Admin dashboard can add, edit, delete, preview, and export local collection items.
- Save downloads preserve original file type when possible.
- Public/admin previews preserve original media aspect ratio.
- No unapproved or scraped content is introduced.
- UI still feels like a single playful tool, not a feed.

## Phase 2: Cloudflare R2 + D1 Backend — Active

Status: ACTIVE

Goal: Move curated memes into a zero-cost, zero-egress backend using Cloudflare R2 (file storage) and D1 (SQLite database), keeping everything on one platform with no external vendor dependency.

Why R2 + D1 instead of Supabase:

- Zero egress bandwidth fees forever (R2's killer feature).
- No external API keys or auth headers needed — native CF bindings.
- Everything stays on Cloudflare (Pages + Functions + D1 + R2 = one vendor).
- SQLite schema translates directly from the existing Postgres schema.
- Faster — no cross-network HTTP calls, everything runs at the edge.

Implementation direction:

- Create a D1 database via Cloudflare dashboard or Wrangler CLI.
- Create an R2 bucket named `memes` via Cloudflare dashboard or Wrangler CLI.
- Add a `wrangler.toml` with D1 and R2 bindings.
- Convert `supabase/schema.sql` to SQLite-compatible `d1/schema.sql`.
- Rewrite `functions/_shared/supabase.ts` → `functions/_shared/d1r2.ts` using native bindings.
- Rewrite `functions/api/random-meme.ts` and `functions/api/daily-meme.ts` to use D1.
- Rewrite `functions/api/admin/memes.ts` to use D1 for CRUD.
- Rewrite `functions/api/admin/upload.ts` to use R2 for file storage.
- Update `.dev.vars.example` to remove Supabase vars.
- Update admin frontend API client if endpoint shapes change.
- Keep `ADMIN_API_TOKEN` for admin route protection.

Previously implemented (Supabase — being replaced):

- `/api/admin/memes` for admin list/create/update/archive (Supabase REST).
- `/api/admin/upload` for Supabase Storage uploads.
- `/admin` backend mode that uses a session-entered admin token.
- `.dev.vars.example` for Cloudflare/Supabase environment setup.

Acceptance criteria:

- D1 database created and schema applied.
- R2 bucket created and accessible.
- `wrangler.toml` has correct D1 + R2 bindings.
- `/api/random-meme` returns a random active meme from D1.
- `/api/daily-meme` returns the daily meme from D1.
- `/api/admin/memes` CRUD works against D1.
- `/api/admin/upload` stores files in R2 and returns public URLs.
- Inactive/draft/archived memes are never returned to public users.
- Fallback memes still work if D1 is empty or unavailable.
- `npm.cmd run build` still passes.
- Admin dashboard works with the new backend.

## Phase 3: Launch Prep + Performance Polish

Status: PLANNED

Goal: Prepare the PWA for public sharing while staying on free infrastructure.

Tasks:

- Test on Android Chrome, iOS Safari, desktop Chrome, and narrow mobile widths.
- Verify native share sheet behavior where supported.
- Verify download/save fallback behavior.
- Add or confirm privacy policy and content disclaimer.
- Confirm caching headers and PWA install behavior.
- Deploy to Cloudflare Pages.

Acceptance criteria:

- Public URL works.
- Random meme flow is fast on mobile data.
- No layout overlap at common viewport sizes.
- PWA can be installed on supported browsers.

## Phase 4: Optional Growth Features

Status: BACKLOG

Only add these if the core loop proves fun:

- Tiny local favorites gallery.
- Daily Drop history.
- Better rarity presentation.
- Cloudinary integration for advanced image transformations if needed.
- Lightweight admin auth (e.g., Cloudflare Access or simple password gate).
- Community submissions only with manual review, reporting, and moderation.
- Android wrapper using Capacitor or Trusted Web Activity after traction.

## Non-Goals

Do not add these unless the owner explicitly changes direction:

- Public meme scraping.
- User accounts for normal users.
- Feed, comments, follows, chat, profiles, or leaderboards.
- Auto-publishing user submissions.
- Video meme support in the first public version.
- Paid infrastructure before the free PWA has been validated.

## Backlog

- Add a small `content/` folder or CSV import workflow for easier meme metadata management.
- Add image compression guidance or scripts after real meme files are available.
- Add Play Store packaging notes if PWA traction justifies the one-time developer fee.
