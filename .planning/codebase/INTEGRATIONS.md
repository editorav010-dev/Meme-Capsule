# Integrations

## Cloudflare Native Bindings
- **D1 Database (SQLite):** Bound as `DB` in `wrangler.toml`. Used for storing meme metadata (`id`, `title`, `storage_path`, `is_active`, `status`, etc.).
- **R2 Storage:** Bound as `MEMES_BUCKET` in `wrangler.toml`. Used for storing image and video assets with zero egress fees.

## Local Storage
- **Admin Drafts:** Browser `localStorage` is used to store draft metadata and states before uploading to production.
