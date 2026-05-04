# Changelog

## 2026-05-04

- Backend migration: Phase 2 redirected from Supabase to Cloudflare R2 + D1.
- Rationale: zero egress bandwidth fees, native Cloudflare bindings, no external vendor dependency.
- Created `PROJECT_STRUCTURE.md` with full directory map and component interaction docs.
- Created `.planning/phases/02-cloudflare-r2-d1-backend/02-PLAN.md` with 8 migration tasks.
- Updated `ROADMAP.md`, `STATE.md`, `DATABASE.md`, and `README.md` to reflect R2+D1 backend.

## 2026-05-02

- Removed the duplicate public `Again` button.
- Renamed the single repeat CTA to `Spawn Another` after a meme is visible.
- Clarified `Daily Drop` as a separate daily curated pick, not a second random action.
- Added `/admin` dashboard for local content management.
- Added admin support for direct URLs, Google Drive links, local file upload previews, editing, deleting, and JSON export.
- Added local admin collection sync for same-browser public app testing.
- Expanded meme metadata types with title, source link, status, media type, and input method.
- Updated Supabase schema to support admin metadata and active/draft/archived status.
- Added `DATABASE.md` to document current and future storage architecture.
- Fixed save/download behavior so memes preserve their original file extension when possible instead of always downloading as `.svg`.
- Fixed public meme display and admin preview rendering so real meme aspect ratios are preserved instead of forced into square crops.
- Started Phase 2 backend work by adding admin Supabase API routes for list/create/update/archive.
- Added Supabase Storage upload API for admin image/video uploads.
- Added backend mode to `/admin` using a session-entered `ADMIN_API_TOKEN`.
- Added `.dev.vars.example` for local Cloudflare/Supabase environment setup.
- Disabled production sourcemaps to keep Cloudflare Pages uploads smaller and reduce deploy upload failures.
