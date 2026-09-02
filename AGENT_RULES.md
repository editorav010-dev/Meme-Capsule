# AGENT_RULES.md — Permanent Operating Instructions for AI Coding Agents

> **STOP. Before making any changes to this workspace, read `AGENT_RULES.md` completely and follow every applicable instruction in it throughout your entire task.**

---

## 1. Core Operating Philosophy & Golden Rules

1. **Do not fix what is not broken**: Never rewrite working code, refactor functional components, or replace established libraries simply because you prefer another design pattern or style.
2. **Strict Scope Control**: Only touch files and logic directly required for the user's requested task. Never change unrelated features while working on a specific feature.
3. **Preserve Backward Compatibility**: Existing working functionality, API contracts, and user data structures must remain fully functional.
4. **No Placeholders or Fake Code**: Every change must be functional, tested, and complete. Never leave `// TODO`, mock data replacements, or half-implemented features.
5. **The Repository is the Source of Truth**: Treat workspace files, existing migrations, and markdown documentation as the persistent project memory. Never guess when information can be verified in the codebase.

---

## 2. Protected Areas (MUST NOT Modify Without Explicit Authorization)

The following core architectural assets and components are protected. AI agents **MUST NOT** modify, delete, redesign, replace, or bypass them without explicit user consent:

### A. Established Architecture & Infrastructure
- **Cloudflare Pages Functions (`functions/api/`)**: The serverless API architecture using Cloudflare bindings (`env.DB` for D1 and `env.BUCKET` for R2). Do not replace this with Express, Next.js, or external servers.
- **Cloudflare D1 Database (`d1/migrations/`)**: Existing migration files (`001_initial.sql`, `002_schema_v2.sql`, `003_categorisation.sql`, `004_curation.sql`, `005_curation_final.sql`, `000_complete_setup.sql`) are historical database artifacts. Never modify or delete past migration files. Add new migration files incrementally.
- **R2 Storage Integration**: The media bucket binding (`env.BUCKET`) and public asset URL resolution (`env.R2_PUBLIC_URL`).
- **Cloudflare Configuration**: `wrangler.toml`, `.dev.vars`, and environment bindings.

### B. UI/UX Identity & Design Systems
- **Neo-Brutalist Aesthetic**: Heavy black borders (`border: 2px solid ...`), hard offset box-shadows (`box-shadow: 4px 4px 0px ...`), high-contrast color palettes (yellow `#f4c300`, purple `#9b30ff`, green `#34C759`, dark `#121212`), and bold typography (`Anton`, `Oswald`).
- **Mobile-First Public PWA**: The core swiping, random drop, reaction, and capsule experience (`src/App.tsx`, `src/styles.css`).
- **Fallback Mechanism**: The static fallback meme system (`src/data/fallbackMemes.ts`) that guarantees zero-failure offline functionality.

### C. Authentication & Security Mechanisms
- **Admin Dashboard Token**: `ADMIN_API_TOKEN` verification in `functions/_shared/auth.ts`.
- **Judge & Curator Sessions**: SHA-256 password verification and 8-hour token session management in `functions/_shared/catAuth.ts`.
- **Admin Reset Security**: Verification code challenge for destructive admin operations (such as resetting analytics algorithms).

### D. Core Working Features
- **Public Meme Delivery**: `/api/memes/random`, `/api/memes/daily`, `/api/memes/reactions`.
- **Admin Dashboard (`/admin`)**: Storage sync from R2, SQL query execution, metadata editing, analytics resets, CSV/Excel exports.
- **Curator & Super Admin Portal (`/curate`)**: Multi-judge login (`cat_users`), keyboard-driven curation (`meme_curation`), conflict arbitration (`CuratorResolveModal`), batch consensus, and authoritative resolutions (`meme_curation_final`).

---

## 3. Standard Agent Workflow

Every AI coding agent must adhere to this step-by-step workflow:

```text
1. READ AGENT_RULES.md
   ↓
2. INSPECT WORKSPACE & DOCUMENTATION (GEMINI.md, docs/, schema)
   ↓
3. PLAN CHANGE & IDENTIFY RELEVANT FILES ONLY
   ↓
4. IMPLEMENT FOCUSED CHANGES (Follow existing patterns & styles)
   ↓
5. TEST THOROUGHLY (npm run build, runtime validation)
   ↓
6. "DON'T STOP AT THE FIRST ERROR" (Diagnose root causes, rerun tests)
   ↓
7. UPDATE RELEVANT DOCUMENTATION (README, docs, walkthrough)
   ↓
8. PRE-COMMIT CHECKLIST
   ↓
9. ATOMIC GIT COMMIT & PUSH
```

### Before Changing Code:
1. Read `AGENT_RULES.md` completely.
2. Read project context in `GEMINI.md`, `CLAUDE.md`, and `docs/`.
3. Check git status to ensure working on a clean tree.
4. Locate existing utilities, middleware, and shared types before creating new ones.

### During Implementation:
- Keep changes minimal and surgically focused on the task.
- Match existing TypeScript conventions (strict typing, functional React components, hooks).
- Maintain Vanilla CSS design tokens; do not introduce external CSS frameworks like Tailwind unless explicitly asked.
- When creating D1 queries, write safe parameter bindings (`.bind(...)`) to prevent SQL injection.

---

## 4. Testing & Verification Requirements

No task is complete until verified. Agents **MUST NOT** proclaim completion without testing:

1. **Build Verification**: Run `npm run build` to verify TypeScript types, Vite bundling, and asset integrity.
2. **Zero Uncaught Errors**: Ensure no syntax errors, missing imports, or unhandled promise rejections exist in console logs.
3. **Database & API Integrity**: Verify that SQL queries, column names, and API parameters match the actual D1 schema.

---

## 5. The "Don't Stop at the First Error" Rule

If a test, build, or command fails:
1. **Identify the exact error message and line number**.
2. **Understand why it failed**: Do not apply superficial band-aids or suppress errors. Look for the true root cause (e.g. missing table, mismatched column name, unhandled null, stale closure).
3. **Fix the underlying issue cleanly**.
4. **Re-run the build/test**: Ensure the fix works and did not introduce secondary regressions.
5. If an external blocker cannot be resolved safely (e.g. missing Cloudflare remote permissions), document the blocker clearly and provide exact copy-paste scripts for the user.

---

## 6. Documentation Synchronization

After completing any non-trivial change, update the project's documentation:
- Keep `walkthrough.md` updated with exact details of changes made, how to test them, and direct URLs.
- Update `GEMINI.md` / `CLAUDE.md` if new routes, features, or environment variables were added.
- Update `docs/` if database schema or API endpoints were modified.
- Never document features that were not verified.

---

## 7. Pre-Commit Checklist

Before committing and pushing to git, confirm:
- [ ] Did I implement exactly what was requested without touching unrelated features?
- [ ] Are existing working features (Public app, Admin, Curator, API) unaffected?
- [ ] Did `npm run build` pass with 0 errors?
- [ ] Did I remove all debug `console.log` statements, scratch files, and temporary artifacts?
- [ ] Are the relevant markdown documentation files updated?
- [ ] Is the git commit message clear, descriptive, and formatted with conventional commits (e.g. `feat: ...`, `fix: ...`, `docs: ...`)?

---

## 8. Summary Reminder

> **Read First → Change Only What Is Needed → Protect Established Architecture → Build & Test → Keep Docs Synced.**
