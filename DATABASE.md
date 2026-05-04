# Database and Storage Plan

## Current Storage

The project is migrating from Supabase to Cloudflare R2 + D1 for production backend.

Current storage layers:

- `src/data/fallbackMemes.ts`: static placeholder/starter memes bundled into the app.
- Browser `localStorage`: local admin dashboard drafts stored under `meme-capsule:admin-collection`.
- `d1/schema.sql`: production database schema for Cloudflare D1 (SQLite).
- `functions/api/random-meme.ts` and `functions/api/daily-meme.ts`: Cloudflare Pages Functions that query D1 when bindings exist and fall back safely when they do not.
- `functions/api/admin/memes.ts`: admin metadata API for listing, creating, updating, and archiving memes via D1.
- `functions/api/admin/upload.ts`: admin upload API for sending files to Cloudflare R2.

Local admin changes sync to the public app only in the same browser. This is useful for review, but it is not global production sync.

## Production Architecture

Use this order:

1. **Cloudflare R2** for curated meme file storage (zero egress fees).
2. **Cloudflare D1** for meme metadata (SQLite at the edge).
3. **Cloudflare Pages Functions** for public random/daily API routes.
4. **Cloudflare Pages** for hosting the PWA.

Why R2 + D1 is the best v1 fit:

- Zero-cost friendly (generous free tiers on all services).
- Zero egress bandwidth fees on R2 — never pay for serving images.
- No external vendor dependency — everything on Cloudflare.
- Native bindings — no API keys, no auth headers, no HTTP hops.
- SQLite metadata is simple and easy to manage.
- Faster — D1 runs at the edge, right next to the Functions.

## Previous Architecture (Supabase — replaced)

The project originally planned to use Supabase Storage + Postgres. That code exists in `functions/_shared/supabase.ts` and `supabase/schema.sql` but is being replaced. The Supabase approach used external REST API calls with API keys. The R2+D1 approach uses native Cloudflare bindings instead.

## Alternatives Considered

| Option | Use Case | Tradeoff |
|---|---|---|
| Supabase | Good SQL database + storage in one | External vendor, 5 GB/month bandwidth cap on free tier, requires API keys |
| Google Drive | Staging area for your personal uploads | Not a reliable public CDN; sharing links may be awkward for direct display. |
| MEGA | Large free storage | Encrypted private storage, not a public CDN, rate-limited bandwidth |
| Cloudinary | Best image/video delivery and transformations | Great upgrade path, but free credits can be exhausted by heavy media traffic. |
| Firebase Storage | Good if the app later becomes Firebase-native | SDK incompatible with Cloudflare Workers, NoSQL mismatch. |
| GitHub/static files | Tiny prototype only | Editing content requires commits and redeploys. |

## Meme Metadata Shape

Production table: `memes` (D1 SQLite)

Core fields:

- `id`: stable text ID such as `meme-exam-001`.
- `title`: admin-facing name.
- `image_url`: direct CDN URL, only if externally hosted.
- `storage_path`: path inside R2 bucket `memes`.
- `source_link`: original source or staging link.
- `category`: loose grouping.
- `tags`: JSON text array (SQLite stores as TEXT).
- `rarity`: `Common`, `Rare`, or `Legendary`.
- `status`: `draft`, `active`, or `archived`.
- `media_type`: `image` or `video`.
- `input_method`: `url`, `upload`, `google-drive`, or `seed`.
- `is_active`: public eligibility switch (integer 0/1 in SQLite).
- `uploaded_at`: created/upload timestamp (ISO string).
- `shown_count`: optional analytics counter.
- `share_count`: optional analytics counter.
- `rights_note`: `original`, `licensed`, `permission`, or `reviewed`.
- `share_text`: text used by share actions.
- `random_key`: indexed random selection helper (REAL type).

Only records with `status = 'active'` and `is_active = 1` should be returned to users.

## API Flow

Public random meme:

```text
User taps Spawn Another
  -> frontend calls getRandomMeme()
  -> local active admin drafts are checked first during development
  -> deployed app calls GET /api/random-meme
  -> Cloudflare Function queries D1 active memes via binding
  -> one approved meme is returned
```

Daily Drop:

```text
User taps Daily Drop
  -> frontend calls getDailyMeme()
  -> Function queries D1 for active memes
  -> stable daily pick returned based on date
```

## Admin Sync Plan

Phase 1.5 admin dashboard (local mode):

- Saves drafts in browser `localStorage`.
- Lets you test URLs, uploads, metadata, status, and previews quickly.
- Active local items are immediately visible in the same browser public app.

Phase 2 R2 + D1 admin (backend mode):

- Upload files to R2 bucket `memes` via `env.MEMES_BUCKET.put()`.
- Insert/update metadata rows in D1 `memes` table via `env.DB.prepare()`.
- Mark reviewed memes with `status = 'active'` and `is_active = 1`.
- Public API automatically starts returning the updated collection.

## Admin API Details

Backend mode uses same-origin Cloudflare Pages Functions. The frontend admin dashboard sends an admin token in `Authorization: Bearer <token>` and `X-Admin-Token`. The token must match `ADMIN_API_TOKEN` configured on Cloudflare.

Required Cloudflare environment variable:

- `ADMIN_API_TOKEN`

D1 and R2 are accessed via native bindings defined in `wrangler.toml` — no URL or key environment variables needed.

Routes:

- `GET /api/admin/memes`: returns all meme records for admin review.
- `POST /api/admin/memes`: creates one metadata row in D1.
- `PATCH /api/admin/memes`: updates one metadata row; pass `originalId` when changing an ID.
- `DELETE /api/admin/memes`: archives one metadata row instead of hard deleting.
- `POST /api/admin/upload`: uploads one image/video file to R2 and returns `storage_path` plus public URL.

Public routes never use the admin token. They only return rows with `status = 'active'` and `is_active = 1`.

## Google Drive Workflow

Recommended use:

1. Upload raw memes to Google Drive as a private staging folder.
2. Copy the Drive link into the admin dashboard as `source_link`.
3. Review title, category, tags, rarity, and rights note.
4. Before production, upload the optimized file to R2 via the admin upload API.
5. Keep the Drive link as an audit/source reference, not the primary public delivery URL.

Google Drive is convenient for collecting content, but R2 is better for serving content to users.
