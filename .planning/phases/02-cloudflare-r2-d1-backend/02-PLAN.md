---
phase: 2
name: Cloudflare R2 + D1 Backend
wave: 1
depends_on: []
files_modified:
  - wrangler.toml
  - d1/schema.sql
  - functions/_shared/d1r2.ts
  - functions/_shared/supabase.ts
  - functions/api/random-meme.ts
  - functions/api/daily-meme.ts
  - functions/api/admin/memes.ts
  - functions/api/admin/upload.ts
  - .dev.vars.example
  - src/types.ts
autonomous: true
---

# Phase 2: Cloudflare R2 + D1 Backend — Plan

## Objective

Replace all Supabase backend code with native Cloudflare R2 (file storage) and D1 (SQLite database) bindings. The public API shape stays the same. The admin API shape stays the same. Only the internal implementation changes.

## What You Need To Do (manual steps in Cloudflare Dashboard)

Before the code changes work, you need to create the D1 database and R2 bucket. This takes about 5 minutes.

### Step A: Create the D1 Database

1. Go to https://dash.cloudflare.com
2. Pick your account (or sign up free — no credit card needed)
3. In the left sidebar, click **Workers & Pages** → **D1 SQL Database**
4. Click **Create database**
5. Name it: `meme-capsule-db`
6. Region: choose the one closest to you (or leave default)
7. Click **Create**
8. After it creates, click on the database name
9. Go to the **Console** tab
10. Paste the contents of `d1/schema.sql` into the console
11. Click **Execute** — you should see "Query executed successfully"
12. Copy the **Database ID** shown at the top of the page — you'll need it for `wrangler.toml`

### Step B: Create the R2 Bucket

1. In the left sidebar, click **R2 Object Storage**
2. Click **Create bucket**
3. Name it: `memes`
4. Location: automatic (or pick closest)
5. Click **Create bucket**
6. After it creates, go to **Settings** tab
7. Under **Public access**, click **Allow Access** (so meme images can be loaded by browsers)
8. Note the public URL — it will be something like `https://pub-xxxxx.r2.dev` or your custom domain

### Step C: Update wrangler.toml

After creating both resources, put their IDs into `wrangler.toml` (the file is already created with placeholder values — just replace them).

## What The Code Does Automatically (tasks I will execute)

---

### Task 1: Create wrangler.toml

<objective>
Create the Cloudflare Pages configuration file with D1 and R2 bindings.
</objective>

<read_first>
- package.json (project name and scripts)
- vite.config.ts (build config)
</read_first>

<action>
Create `wrangler.toml` at project root with:

```toml
name = "meme-capsule"
compatibility_date = "2024-12-18"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "meme-capsule-db"
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"

[[r2_buckets]]
binding = "MEMES_BUCKET"
bucket_name = "memes"
```

The `binding` names (`DB` and `MEMES_BUCKET`) are what the code uses to access D1 and R2 inside Functions. The `database_id` must be replaced with the real ID from the Cloudflare dashboard.
</action>

<acceptance_criteria>
- `wrangler.toml` exists at project root
- File contains `[[d1_databases]]` with `binding = "DB"`
- File contains `[[r2_buckets]]` with `binding = "MEMES_BUCKET"`
- File contains `pages_build_output_dir = "dist"`
</acceptance_criteria>

---

### Task 2: Create d1/schema.sql (SQLite version)

<objective>
Convert the Postgres schema from `supabase/schema.sql` to SQLite-compatible syntax for D1.
</objective>

<read_first>
- supabase/schema.sql (source Postgres schema)
- src/types.ts (TypeScript types that must match)
</read_first>

<action>
Create `d1/schema.sql` with SQLite-compatible schema:

Key differences from Postgres:
- No `pgcrypto` extension
- Use `TEXT` with `CHECK` instead of enums
- Use `INTEGER` for booleans (0/1)
- Use `REAL` for random_key instead of `double precision`
- Default ID uses `hex(randomblob(6))` instead of `gen_random_uuid()`
- `tags` stored as JSON TEXT (SQLite has no native array type)
- `uploaded_at` stored as TEXT in ISO format
- No RLS — access control is handled in the Functions code
</action>

<acceptance_criteria>
- `d1/schema.sql` exists
- Table `memes` has columns: id, title, image_url, storage_path, source_link, category, tags, rarity, status, media_type, input_method, is_active, uploaded_at, shown_count, share_count, rights_note, share_text, random_key
- CHECK constraints exist for rarity, status, media_type, input_method
- Index on `is_active, random_key` exists
- No Postgres-specific syntax (no `::text`, no `pgcrypto`, no RLS)
</acceptance_criteria>

---

### Task 3: Create functions/_shared/d1r2.ts

<objective>
Create the shared backend module that replaces supabase.ts. This handles D1 queries, R2 operations, admin auth, meme normalization, and fallback logic.
</objective>

<read_first>
- functions/_shared/supabase.ts (current implementation to replace)
- functions/_shared/fallbackMemes.ts (fallback functions used)
- src/types.ts (Meme type shape)
</read_first>

<action>
Create `functions/_shared/d1r2.ts` with:

1. `Env` type: `DB: D1Database`, `MEMES_BUCKET: R2Bucket`, `ADMIN_API_TOKEN?: string`, `R2_PUBLIC_URL?: string`
2. `json()` helper (same as current)
3. `requireAdmin()` (same auth logic as current)
4. `normalizeRow()` that maps D1 row → Meme type (parse tags from JSON string, convert is_active from 0/1, build R2 public URL from storage_path)
5. `getRandomMeme(env)` — uses `env.DB.prepare()` with SQL: `SELECT * FROM memes WHERE is_active = 1 AND status = 'active' AND random_key >= ? ORDER BY random_key ASC LIMIT 1` with wraparound
6. `getDailyMeme(env)` — uses `env.DB.prepare()` to get active memes, pick stable daily one
7. `randomMemeOrFallback(env)` and `dailyMemeOrFallback(env)` — same fallback wrapping as current

Key difference: No `fetch()` to external URLs. All database access is `env.DB.prepare().bind().all()`. All file access is `env.MEMES_BUCKET.put()` / `env.MEMES_BUCKET.get()`.
</action>

<acceptance_criteria>
- `functions/_shared/d1r2.ts` exists
- Exports: `Env`, `json`, `requireAdmin`, `normalizeRow`, `getRandomMeme`, `getDailyMeme`, `randomMemeOrFallback`, `dailyMemeOrFallback`
- No `fetch()` calls to external URLs (all D1/R2 via bindings)
- No imports of `supabase.ts`
- Tags parsed from JSON string via `JSON.parse()`
- R2 public URL constructed from `env.R2_PUBLIC_URL` or hardcoded pattern
</acceptance_criteria>

---

### Task 4: Rewrite functions/api/random-meme.ts

<objective>
Switch from Supabase import to D1 import.
</objective>

<read_first>
- functions/api/random-meme.ts (current)
- functions/_shared/d1r2.ts (new shared module)
</read_first>

<action>
Replace import from `../_shared/supabase` with `../_shared/d1r2`. Change `Env` import source. The function body stays almost identical — just uses the new `randomMemeOrFallback`.
</action>

<acceptance_criteria>
- File imports from `../_shared/d1r2`, not `../_shared/supabase`
- `onRequestGet` still returns `json({ meme })`
</acceptance_criteria>

---

### Task 5: Rewrite functions/api/daily-meme.ts

<objective>
Switch from Supabase import to D1 import.
</objective>

<read_first>
- functions/api/daily-meme.ts (current)
- functions/_shared/d1r2.ts (new shared module)
</read_first>

<action>
Same change as random-meme.ts — swap import source.
</action>

<acceptance_criteria>
- File imports from `../_shared/d1r2`, not `../_shared/supabase`
- `onRequestGet` still returns `json({ meme, date })`
</acceptance_criteria>

---

### Task 6: Rewrite functions/api/admin/memes.ts

<objective>
Replace all Supabase REST API calls with D1 prepared statements for the 4 admin CRUD operations.
</objective>

<read_first>
- functions/api/admin/memes.ts (current Supabase implementation — 226 lines)
- functions/_shared/d1r2.ts (new shared module)
- src/types.ts (Meme type)
</read_first>

<action>
Rewrite all 4 handlers:

1. `onRequestGet` — `env.DB.prepare("SELECT * FROM memes ORDER BY uploaded_at DESC").all()`
2. `onRequestPost` — `env.DB.prepare("INSERT INTO memes (...) VALUES (...)").bind(...).run()`
3. `onRequestPatch` — `env.DB.prepare("UPDATE memes SET ... WHERE id = ?").bind(...).run()`
4. `onRequestDelete` — `env.DB.prepare("UPDATE memes SET status = 'archived', is_active = 0 WHERE id = ?").bind(id).run()`

Keep the same validation logic (ID pattern, allowed rarity/status/mediaType/inputMethod, tag sanitization). Keep the same `requireAdmin` check. Import from `d1r2.ts` instead of `supabase.ts`.

Tags must be stored as `JSON.stringify(tags)` since D1/SQLite has no array type.
</action>

<acceptance_criteria>
- All 4 handlers use `env.DB.prepare()` — no `fetch()` calls
- Import from `../_shared/d1r2`, not `../_shared/supabase`
- Tags stored as JSON string
- Validation logic preserved (ID pattern, allowed values)
- Admin auth check preserved
</acceptance_criteria>

---

### Task 7: Rewrite functions/api/admin/upload.ts

<objective>
Replace Supabase Storage upload with R2 bucket put.
</objective>

<read_first>
- functions/api/admin/upload.ts (current Supabase implementation)
- functions/_shared/d1r2.ts (new shared module)
</read_first>

<action>
Replace the `fetch()` to Supabase Storage with:

```typescript
await env.MEMES_BUCKET.put(path, file.stream(), {
  httpMetadata: { contentType: file.type }
});
```

Return the public URL using `env.R2_PUBLIC_URL` or a constructed URL pattern.

Keep the same file validation (image/video only), filename sanitization, and date-based path structure.
</action>

<acceptance_criteria>
- Uses `env.MEMES_BUCKET.put()` — no `fetch()` to external URLs
- Import from `../_shared/d1r2`, not `../_shared/supabase`
- Returns `{ url, storage_path, source_link, media_type }`
- File validation preserved (image/video only)
</acceptance_criteria>

---

### Task 8: Update .dev.vars.example

<objective>
Remove Supabase variables, keep admin token, add R2 public URL.
</objective>

<read_first>
- .dev.vars.example (current)
</read_first>

<action>
Replace contents with:

```
ADMIN_API_TOKEN=choose-a-long-random-admin-password
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

No `SUPABASE_URL`, no `SUPABASE_SERVICE_ROLE_KEY`, no `SUPABASE_ANON_KEY`.
D1 and R2 bindings come from `wrangler.toml`, not env vars.
</action>

<acceptance_criteria>
- No Supabase-related variables
- Contains `ADMIN_API_TOKEN`
- Contains `R2_PUBLIC_URL` with example value
</acceptance_criteria>

---

## Verification

After all tasks are complete:

1. `npm.cmd run build` passes with zero errors.
2. No file imports from `supabase.ts` (grep for `supabase` in functions/ should only find the old file, not imports of it).
3. `wrangler.toml` exists with D1 + R2 bindings.
4. `d1/schema.sql` is valid SQLite.
5. All API routes use `env.DB` and `env.MEMES_BUCKET` bindings.

## must_haves (goal-backward check)

- [ ] D1 schema exists and matches the meme metadata shape
- [ ] R2 bucket binding configured in wrangler.toml
- [ ] Random meme API queries D1, not Supabase
- [ ] Daily meme API queries D1, not Supabase
- [ ] Admin CRUD uses D1 prepared statements
- [ ] Admin upload uses R2 put
- [ ] Fallback memes still work when D1 is empty
- [ ] Build passes
