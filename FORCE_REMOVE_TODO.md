# FORCE REMOVE Feature Implementation

## STEP 0 — FINDINGS

### D1/R2 Bindings & Environment
- **R2 Bucket Name**: `MEMES_BUCKET` ✓
- **D1 Database Name**: `DB` ✓
- Source: `functions/_shared/d1r2.ts` lines 5-6

### Judge Auth System
- **Auth Module**: `functions/_shared/catAuth.ts`
- **Session Validation**: `validateSession()` — queries `cat_sessions` joined with `cat_users`
- **Auth Requirement**: User must have active Bearer token in `Authorization` header
- **User Status**: Must have `is_active = 1` on `cat_users` table
- **Helper Functions**: 
  - `validateSession(request, env): Promise<CatUser | null>`
  - `requireAuth(request, env, requiredRole?): Promise<CatUser>`

### Database Schema
- **Memes Table** (`d1/schema.sql` lines 1-22):
  - `is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1))`
  - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived'))`
  - Can safely set `is_active = 0` and `status = 'archived'` (both values permitted by CHECK constraints)
  - Primary key: `id TEXT PRIMARY KEY DEFAULT ('meme-' || hex(randomblob(6)))`

### Judge Queue Endpoint
- **Path**: `GET /api/cat/next`
- **File**: `functions/api/cat/next.ts` line 39
- **Filter**: Already has `WHERE m.is_active = 1` ✓
- **Status**: No changes needed

### Judge Decision Endpoint
- **Path**: `POST /api/cat/decide`
- **File**: `functions/api/cat/decide.ts`
- **Current Behavior**: No guard against removed memes (410 response)
- **Required Addition**: Check if `is_active = 0` and return 410 with `{ error: 'meme_removed' }`

### Judge Frontend Component
- **File**: `src/categorise/CatInterface.tsx`
- **Existing Keyboard Shortcuts**:
  - `1-7` — Categorise
  - `Space` — Skip (category 0)
  - `Q/W/E` — Confidence (1/3/5)
  - `Z` — Undo
  - `ArrowLeft` — Undo
  - `Tab` — Toggle stats sidebar
- **Available Shortcuts**: Shift+X not used ✓
- **Shortcut Legend**: Lines 361-367, shows inline help
- **Global Keydown Handler**: Lines 127-188, checks INPUT/TEXTAREA tags, preventDefault where needed
- **Undo History**: `history` state (line 23), can be modified to drop removed items

### Superadmin Dashboard
- **Overview Endpoint**: `functions/api/cat/analytics/overview.ts`
  - Line 28: Counts `WHERE is_active = 1`
  - Line 40: Resolved/unresolved from `cat_consensus` table
  - Line 95: Category distribution from `cat_consensus`
  - **Required Change**: Exclude force-removed memes from totals (add `NOT IN (SELECT meme_id FROM meme_force_removals WHERE r2_deleted = 1)`)
- **Memes List**: `functions/api/cat/analytics/memes.ts` line 54, has `WHERE m.is_active = 1`
  - **Required Change**: Exclude force-removed memes

### Public Meme Endpoints
- **random-meme.ts**: Uses `randomMemeOrFallback(env)` helper
- **daily-meme.ts**: Uses `dailyMemeOrFallback(env)` helper
- **d1r2.ts lines 119-145**: Both helpers already filter `WHERE m.is_active = 1` ✓
- **Status**: No changes needed

### R2 Key Derivation
- **Priority**:
  1. If `meme.storage_path` exists → use it as R2 key (e.g., `memes/abc123/image.jpg`)
  2. If `meme.image_url` exists but no `storage_path` → could be direct R2 URL or Reddit URL
  3. If only `meme.image_url` → likely Reddit/external source, no R2 deletion
- **Logic**: Check if `storage_path` is set; if yes, that's the R2 key; if no, r2_key = null and skip R2 delete

### Reddit/Non-R2 Memes
- Memes with only `image_url` pointing to Reddit or external sites have `storage_path = NULL`
- These cannot be deleted from R2 (they don't exist there)
- Force-remove should succeed with `r2_deleted = 1, r2_error = 'not_in_r2'`

---

## STEP 1 — AUDIT TABLE

**Status**: [✓ DONE]

Created migration file `d1/migrations/011_force_removals.sql` with the audit table structure including indexes.

---

## STEP 2 — BACKEND ENDPOINT

**Status**: [✓ DONE]

Created `functions/api/cat/force-remove.ts` with:
- Auth guard for active judges
- Meme lookup with 404 handling
- R2 key resolution (storage_path priority)
- D1 batch: deactivate + audit insert
- R2 delete with error handling
- Idempotent retry logic
- Proper success/warning/error responses
- Handles Reddit/non-R2 memes gracefully

---

## STEP 3 — EXISTING ENDPOINT GUARDS

**Status**: [✓ DONE]

Changes made:
- [✓] `decide.ts`: Added 410 guard for `is_active = 0` memes
- [✓] `overview.ts`: Exclude force-removed memes from counts
- [✓] `memes.ts`: Exclude force-removed memes from listings

---

## STEP 4 — JUDGE UI

**Status**: [✓ DONE]

Modified `src/categorise/CatInterface.tsx`:
- [✓] Add FORCE REMOVE button (separate row, hot pink/red border, Shift+X label)
- [✓] Add confirmation modal (thumbnail, text, reason input, cancel/confirm buttons)
- [✓] Show loading state while request in flight
- [✓] Show toast on success/warning
- [✓] Show error toast on failure, do NOT advance
- [✓] Do not use optimistic UI — only advance after server confirms

---

## STEP 5 — KEYBOARD SHORTCUT

**Status**: [✓ DONE]

Modified keyboard handler in `CatInterface.tsx`:
- [✓] Check Shift+X (case: e.shiftKey && e.key.toLowerCase() === 'x')
- [✓] Ignore if event.repeat = true
- [✓] Ignore if target is INPUT/TEXTAREA/SELECT/contenteditable
- [✓] Ignore if modal already open or request in flight
- [✓] While modal open: suspend all other shortcuts (1-7, Space, Z, Arrows, Q/W/E, Tab)
- [✓] Inside modal: Enter confirms, Esc cancels
- [✓] Added "Shift+X FORCE REMOVE" to shortcut legend
- [✓] Remove listener on unmount

---

## STEP 6 — UNDO AND STATE HANDLING

**Status**: [✓ DONE]

- [✓] When a meme is force-removed, drop it from `history` state to prevent undo restoration
- [✓] If judge fetches next meme and it returns 410, retry fetching next (gracefully skip removed)
- [✓] Added catForceRemove API function to catApi.ts

---

## STEP 7 — SUPERADMIN VISIBILITY

**Status**: [✓ DONE]

Created:
- [✓] `src/categorise/superadmin/ForceRemovalAudit.tsx` — table view with meme ID, title, removed by, time, reason, R2 status
- [✓] `functions/api/cat/admin/force-removals.ts` — superadmin endpoint to fetch all removals
- [✓] RETRY button on rows with r2_deleted = 0 (idempotent)
- [✓] Integrated into SuperDashboard with toggle button
- [✓] Superadmin auth required

---

## STEP 8 — VERIFY, BUILD, COMMIT

**Status**: [✓ DONE]

### Verification Checklist
- [✓] npm run build passes with zero TypeScript errors
- [✓] All migration files created (011_force_removals.sql)
- [✓] Backend endpoint created (functions/api/cat/force-remove.ts)
- [✓] Existing endpoints guarded (decide.ts, overview.ts, memes.ts)
- [✓] UI components created (FORCE REMOVE button, modal, toast)
- [✓] Keyboard shortcut implemented (Shift+X)
- [✓] Superadmin audit view created
- [✓] Force-remove API function added to catApi.ts

### Commit Done
✓ Committed: "feat: judge force-remove — immediate R2 deletion with audit log, keyboard shortcut, confirm modal"
✓ Pushed to main (commit: a6c42a0)

### Ready for Testing
All components are in place and TypeScript strict mode passes. The feature is ready for:
1. Database migration (run 011_force_removals.sql)
2. Testing on staging
3. Production deployment
