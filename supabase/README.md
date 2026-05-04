# Supabase Admin Workflow

This app is designed for manually curated memes only. Do not scrape random meme sources.

## Setup

1. Create a Supabase project.
2. Run `schema.sql` in the Supabase SQL editor.
3. Upload optimized images to the public Storage bucket named `memes`.
4. Add rows to `public.memes` through Supabase Studio or the future `/admin` Supabase-backed dashboard.
5. Set `status = active` and `is_active = true` only after reviewing the meme.

## Row Rules

- Use `storage_path` for files stored in the `memes` bucket, for example `2026/first-drop.webp`.
- Use `image_url` only for trusted CDN-hosted files you control.
- Use `source_link` for the original source or Google Drive staging link.
- Keep `rights_note` honest: `original`, `licensed`, `permission`, or `reviewed`.
- Prefer WebP or AVIF under 500 KB.
- Deactivate stale memes with `status = archived` and `is_active = false` instead of deleting immediately.

## Cloudflare Pages Environment Variables

Set these in Cloudflare Pages:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_TOKEN`

For a stricter public-read setup, you can use `SUPABASE_ANON_KEY` instead, as long as the RLS read policy is active.

`ADMIN_API_TOKEN` should be a long random password. It protects `/api/admin/memes` and `/api/admin/upload`.
