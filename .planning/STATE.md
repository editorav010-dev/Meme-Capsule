---
project: Minimalist Meme Capsule
status: active
current_phase: 3
current_phase_name: Launch Prep + Performance Polish
progress: 40
updated: 2026-05-05
workspace: C:\Users\avspn\Desktop\meme application
---

# Project State

## Current Snapshot

This is a minimalist curated meme PWA. The core product is intentionally tiny: one landing screen, one primary CTA, one random approved meme, and fast share/save actions.

The app has already been implemented as a Vite + React + TypeScript project at:

`C:\Users\avspn\Desktop\meme application`

Current implementation includes:

- Mobile-first meme capsule UI in `src/App.tsx`.
- Reveal animation and polished responsive styling in `src/styles.css`.
- Local curated starter meme data in `src/data/fallbackMemes.ts`.
- Share, save, favorite, Daily Drop, rarity badges, and local LOL reactions.
- Cloudflare Pages Functions in `functions/api/random-meme.ts` and `functions/api/daily-meme.ts`.
- PWA manifest, icon, service worker, and production headers in `public/`.
- Public UX cleanup: one repeat CTA only, shown as `Spawn Another` after a meme is visible.
- Admin dashboard at `/admin` for collection management (local draft + backend modes).
- Storage/backend documentation in `DATABASE.md`.
- Save/download bug fixed: files no longer always download as `.svg`.
- Aspect-ratio bug fixed: public meme display and admin preview no longer force square crops.

Backend (Phase 2 — COMPLETE):

- Cloudflare R2 + D1 fully implemented and deployed.
- D1 database `meme-capsule-db` created with schema applied (ID: `64e2bb16-1557-4d53-8e6b-5197c8636d09`).
- R2 bucket `memes` created with public access enabled.
- `wrangler.toml` configured with D1 and R2 bindings.
- `functions/_shared/d1r2.ts` replaces all Supabase code.
- Admin CRUD (`/api/admin/memes`) uses D1 prepared statements.
- Admin upload (`/api/admin/upload`) uses R2 bucket.
- `.dev.vars` configured with `ADMIN_API_TOKEN` and `R2_PUBLIC_URL`.
- Old `functions/_shared/supabase.ts` is still present as an unused archive file (no active imports).
- Admin dashboard enhanced with Backend/Local mode badges, active meme count, and R2_PUBLIC_URL warnings.

Git: Connected to `https://github.com/bbethical010-glitch/meme-capsule` on branch `main`.

Verified command:

```bash
npm.cmd run build
```

Build status: passes (last verified 2026-05-05).

## Product Rules

These rules are locked unless the owner explicitly changes them:

- Do not scrape memes from the internet.
- Only owner-curated, approved memes are allowed.
- Keep the app minimal, fast, playful, and uncluttered.
- No comments, feeds, accounts, followers, chat, or public uploads in v1.
- User favorites and LOL reactions are local-device only for now.
- Launch as a PWA before considering Play Store or native wrappers.

## Current Phase

Active phase: `3 - Launch Prep + Performance Polish`

Purpose:

- Prepare the PWA for public sharing while staying on free infrastructure.
- Test on real devices and browsers.
- Deploy to Cloudflare Pages for a public URL.
- Verify PWA install behavior.

Immediate next actions:

1. Deploy to Cloudflare Pages (connect Git repo or direct upload).
2. Add D1 + R2 bindings in Cloudflare Pages project settings.
3. Set production environment variables (`ADMIN_API_TOKEN`, `R2_PUBLIC_URL`).
4. Test on Android Chrome, iOS Safari, desktop Chrome.
5. Add some real curated memes via the admin dashboard.
6. Verify meme spawning from the production D1 database.
7. Confirm PWA install behavior on mobile.

## Known Gaps

- No real memes in the production D1 database yet (only fallbacks work).
- Old `supabase.ts` file still present (unused, can be cleaned up).
- No privacy policy or content disclaimer page yet.
- The `.dev.vars` still has placeholder values — real R2 public URL needs to be confirmed.

## Useful Commands

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npx wrangler pages dev dist --d1 DB=meme-capsule-db --r2 MEMES_BUCKET=memes
```

## Agent Handoff Notes

Future agents should continue from the Desktop project folder. Backend is Cloudflare R2 + D1 (not Supabase). Do not re-add Supabase dependencies. Preserve the minimalist one-button meme capsule experience. Phase 2 is complete; advance through Phase 3 (Launch Prep) in `.planning/ROADMAP.md`.
