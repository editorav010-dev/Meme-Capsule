# Meme Capsule - Project Context

## Project Overview
**Meme Capsule** is a high-performance, minimalist curated meme platform built as a Progressive Web App (PWA). It features a "mobile-first" approach and a playful interface to "Spawn a Random Meme" or view a "Daily Drop".

**Tech Stack:**
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Vanilla CSS (`styles.css` / `admin.css`)
- **Backend/API:** Cloudflare Pages Functions (`functions/api/`)
- **Database:** Cloudflare D1 (SQLite) for meme metadata
- **Storage:** Cloudflare R2 for media assets
- **Hosting:** Cloudflare Pages

**Architecture Highlights:**
- **Storage Reality:** Uses a three-tier fallback mechanism: 
  1. Local storage (admin drafts for local testing)
  2. Cloudflare D1/R2 API (production mode)
  3. Static fallback memes (`src/data/fallbackMemes.ts`)
- **Admin Dashboard:** Located at `/admin`. Supports managing the local draft collection (stored in browser `localStorage` as Phase 1.5) and interacting with the production D1/R2 backend (requires `ADMIN_API_TOKEN`).

## Building and Running

**Prerequisites:** Node.js (npm). The project uses `npm.cmd` in its documentation for Windows environments.

- **Install Dependencies:**
  ```bash
  npm install
  ```

- **Run Frontend Locally (Vite):**
  ```bash
  npm run dev
  ```
  *This runs the Vite server on 127.0.0.1. Access the public app at `/` and the admin dashboard at `/admin`.*

- **Run Full Stack Locally (with Cloudflare Bindings):**
  To test D1 + R2 bindings locally via Wrangler:
  ```bash
  npm run build
  npx wrangler pages dev dist
  ```

- **Build for Production:**
  ```bash
  npm run build
  ```
  *The build output directory is `dist`.*

## Development Conventions

- **Code Style:** TypeScript with React Functional Components and Hooks. No heavy state management libraries; uses Context API and Local Storage.
- **Styling:** Vanilla CSS is preferred over complex frameworks (e.g., no Tailwind). Maintain the mobile-first, minimalist design aesthetic.
- **Documentation:** Primary project documentation is kept in the `docs/` folder. Be sure to reference `docs/README.md`, `docs/PROJECT_STRUCTURE.md`, and `docs/DATABASE.md` for in-depth architectural choices.
- **Environment Variables:** Backend mode for the admin dashboard requires `ADMIN_API_TOKEN` configured in Cloudflare Pages. It is not bundled into the frontend. D1 and R2 are accessed natively via bindings in `wrangler.toml`.
