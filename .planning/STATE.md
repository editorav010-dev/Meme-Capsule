---
project: Minimalist Meme Capsule
status: active
current_phase: 2
current_phase_name: Cloudflare R2 + D1 Backend
progress: 10
updated: 2026-05-04
workspace: C:\Users\avspn\Desktop\meme application
---

# Project State

## Current Snapshot

This is a minimalist curated meme PWA. The core product is intentionally tiny: one landing screen, one primary CTA, one random approved meme, and fast share/save actions.

The app has already been implemented as a Vite + React + TypeScript project and moved to:

`C:\Users\avspn\Desktop\meme application`

Current implementation includes:

- Mobile-first meme capsule UI in `src/App.tsx`.
- Reveal animation and polished responsive styling in `src/styles.css`.
- Local curated starter meme data in `src/data/fallbackMemes.ts`.
- Share, save, favorite, Daily Drop, rarity badges, and local LOL reactions.
- Cloudflare Pages Functions in `functions/api/random-meme.ts` and `functions/api/daily-meme.ts`.
- PWA manifest, icon, service worker, and production headers in `public/`.
- Public UX cleanup: one repeat CTA only, shown as `Spawn Another` after a meme is visible.
- Admin dashboard at `/admin` for local draft collection management.
- Storage/backend documentation in `DATABASE.md`.
- Save/download bug fixed: files no longer always download as `.svg`.
- Aspect-ratio bug fixed: public meme display and admin preview no longer force square crops.

Backend migration (Phase 2):

- Phase 2 has been redirected from Supabase to Cloudflare R2 + D1.
- Previous Supabase REST integration exists in `functions/_shared/supabase.ts` (to be replaced).
- Previous Supabase admin routes exist in `functions/api/admin/` (to be rewritten).
- New backend will use native Cloudflare bindings for D1 (SQLite) and R2 (object storage).

Verified command:

```bash
npm.cmd run build
```

Build status: passes.

## Product Rules

These rules are locked unless the owner explicitly changes them:

- Do not scrape memes from the internet.
- Only owner-curated, approved memes are allowed.
- Keep the app minimal, fast, playful, and uncluttered.
- No comments, feeds, accounts, followers, chat, or public uploads in v1.
- User favorites and LOL reactions are local-device only for now.
- Launch as a PWA before considering Play Store or native wrappers.

## Current Phase

Active phase: `2 - Cloudflare R2 + D1 Backend`

Purpose:

- Replace the Supabase backend with native Cloudflare R2 (file storage) + D1 (SQLite database).
- Zero egress bandwidth fees, no external vendor dependency.
- Keep public retrieval limited to reviewed active memes only.
- Preserve local draft mode as a safe fallback for quick testing.

Immediate next actions:

1. Create `wrangler.toml` with D1 and R2 bindings.
2. Create `d1/schema.sql` (SQLite version of the Supabase schema).
3. Rewrite `functions/_shared/supabase.ts` → `functions/_shared/d1r2.ts`.
4. Rewrite `functions/api/random-meme.ts` to query D1.
5. Rewrite `functions/api/daily-meme.ts` to query D1.
6. Rewrite `functions/api/admin/memes.ts` for D1 CRUD.
7. Rewrite `functions/api/admin/upload.ts` for R2 uploads.
8. Update `.dev.vars.example` (remove Supabase vars).
9. Create D1 database and R2 bucket in Cloudflare dashboard.
10. Test locally with `npx wrangler pages dev`.

## Known Gaps

- D1 database not yet created in Cloudflare dashboard.
- R2 bucket not yet created in Cloudflare dashboard.
- `wrangler.toml` does not exist yet.
- Supabase code still present — needs to be replaced, not deleted until R2+D1 is verified.
- Current starter memes are generated placeholders, not the owner collection.
- This Desktop folder is not currently a git repository.

## Useful Commands

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npx wrangler pages dev dist
```

## Agent Handoff Notes

Future agents should continue from the Desktop project folder, not the old OneDrive `New project` folder. Avoid rebuilding the concept from scratch. Preserve the minimalist one-button meme capsule experience and advance through the roadmap in `.planning/ROADMAP.md`.

Backend migration is from Supabase to Cloudflare R2 + D1. Do not re-add Supabase dependencies.
