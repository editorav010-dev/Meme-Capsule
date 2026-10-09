# FORCE REMOVE Feature — Complete Implementation Summary

## Overview
The FORCE REMOVE feature allows judges to permanently delete memes immediately from both the app and R2 storage with a single keyboard shortcut (Shift+X). The action is audited, idempotent, and includes comprehensive superadmin controls.

## Files Created

### 1. Database Migration
- **`d1/migrations/011_force_removals.sql`**
  - Creates `meme_force_removals` audit table with full removal metadata
  - Tracks meme ID, title, storage path, R2 key, removed by (judge), reason, timestamps
  - R2 deletion status and error messages for transparency
  - Indexes on `removed_at`, `removed_by`, `meme_id` for efficient queries

### 2. Backend Endpoints

#### `functions/api/cat/force-remove.ts` (NEW)
- **POST /api/cat/force-remove**
- Auth: Active judge required (Bearer token)
- Idempotent: Safe to call multiple times
- **Request Body**: `{ meme_id: string, reason?: string (max 200 chars) }`
- **Response**: Success with `r2_deleted: true/false` and optional warning
- **Order of Operations**:
  1. Validate meme exists (404 if not)
  2. Resolve R2 key from `storage_path` (priority) or skip if Reddit source
  3. D1 Batch: Deactivate meme (`is_active=0, status='archived'`) + Insert audit row
  4. R2 Delete (only if R2 key exists)
  5. Update audit row with success/error status
- **Handles**:
  - Reddit/non-R2 sources gracefully (no R2 error)
  - R2 failures with meme already hidden from app
  - Concurrent requests safely via D1 UNIQUE constraint on meme_id

#### `functions/api/cat/admin/force-removals.ts` (NEW)
- **GET /api/cat/admin/force-removals**
- Superadmin only
- Returns paginated list of all force-removed memes with audit details
- Enables audit trail viewing and retry capabilities

### 3. Endpoint Guards

#### `functions/api/cat/decide.ts` (MODIFIED)
- Added 410 guard: Returns `{ error: 'meme_removed' }` if meme has `is_active=0`
- Frontend treats 410 as "skip to next meme" without error display

#### `functions/api/cat/analytics/overview.ts` (MODIFIED)
- Exclude force-removed memes from total corpus counts
- Filter: `NOT IN (SELECT meme_id FROM meme_force_removals WHERE r2_deleted=1)`
- Ensures superadmin metrics remain accurate post-removal

#### `functions/api/cat/analytics/memes.ts` (MODIFIED)
- Same exclusion filter applied to meme listings
- Force-removed memes never appear in analytics tables

### 4. Frontend UI Components

#### `src/categorise/CatInterface.tsx` (MODIFIED)
**State additions:**
- `showForceRemoveModal`: Toggle confirmation modal
- `forceRemoveReason`: Text input for removal reason
- `forceRemoveLoading`: Loading state during API call
- `toast`: Success/warning/error notifications

**Features:**
- **FORCE REMOVE Button**: Hot pink (#dd0061) border, separate row below categories
  - Disabled while request in flight
  - Shows "FORCE REMOVE (SHIFT+X)" or "REMOVING..." state
- **Keyboard Shortcut**: Shift+X
  - Ignored if `event.repeat` is true (holding key safe)
  - Ignored if target is input/textarea/contenteditable
  - Ignored if modal already open or request in flight
  - Suspended all other shortcuts (1-7, Space, Z, Arrows, Q/W/E, Tab) when modal is open
- **Confirmation Modal**:
  - Displays meme thumbnail, ID, title
  - Warning text: "PERMANENTLY DELETE THIS MEME?..."
  - Optional reason input (max 200 chars, NOT focused by default for safety)
  - CANCEL (Esc) and FORCE REMOVE (Enter) buttons
  - Modal overlay prevents outside dismissal during loading
- **Toast Notifications**:
  - Success (green): "FORCE REMOVED ✓"
  - Warning (orange): "HIDDEN — STORAGE DELETE FAILED, FLAGGED FOR RETRY"
  - Error (red): Shows error message, does not advance to next meme
  - Auto-dismisses after 2 seconds
- **Undo Handling**:
  - Force-removed memes dropped from history to prevent undo restoration
- **Prefetch Handling**:
  - If prefetched next meme returns 410, gracefully fetch replacement
  - Judge experiences seamless continuation without error

#### `src/categorise/superadmin/ForceRemovalAudit.tsx` (NEW)
- Superadmin-only view of all force-removed memes
- **Table Columns**:
  - Meme ID (green, monospace)
  - Title (truncated with ellipsis)
  - Removed By (judge name)
  - Time (formatted datetime)
  - Reason (optional, truncated)
  - R2 Status: ✓ DELETED / ✗ FAILED / PENDING
  - RETRY button (enabled only for failed R2 deletes)
- **Features**:
  - Sorted by removal time (newest first)
  - RETRY calls force-remove endpoint idempotently (safe)
  - Reloads list after successful retry
  - Error handling and user feedback

#### `src/categorise/superadmin/SuperDashboard.tsx` (MODIFIED)
- Added ForceRemovalAudit import and component
- New toggle button: "FORCE REMOVED AUDIT" (switches between analytics and audit view)
- Button turns hot pink when audit view is active
- Maintains existing analytics view intact

### 5. API Client

#### `src/categorise/catApi.ts` (MODIFIED)
- **New function**: `catForceRemove(token, memeId, reason?)`
  - Calls POST /api/cat/force-remove
  - Returns success with r2_deleted status
  - Throws error on failure or 410

## Keyboard Shortcuts

| Key | Action | When Active |
|-----|--------|------------|
| 1-7 | Categorise | Always (suspended during modal) |
| Space | Skip | Always (suspended during modal) |
| Q/W/E | Confidence | Always (suspended during modal) |
| Z / ← | Undo | Always (suspended during modal) |
| Tab | Toggle Stats | Always (suspended during modal) |
| Shift+X | Force Remove | Always |
| Enter | Confirm (inside modal) | Modal open only |
| Esc | Cancel (inside modal) | Modal open only |

## Safety Features

1. **Keyboard Safety**:
   - `event.repeat` check prevents accidental triggers from holding key
   - Input/textarea detection prevents triggering while typing reason
   - Modal suspension of other shortcuts prevents accidental decisions underneath

2. **UI Safety**:
   - Separate row for FORCE REMOVE button (can't hit by accident)
   - Hot pink/red border signals danger
   - Confirmation modal required (not optimistic)
   - Reason input NOT focused by default
   - Loading state disables buttons during flight

3. **Data Safety**:
   - D1 deactivation happens BEFORE R2 delete (meme hidden from app first)
   - If R2 delete fails, meme is still hidden (app safe, storage flagged for retry)
   - Idempotent: Safe to call multiple times
   - No actual deletion from memes table (audit trail preserved)

4. **Audit Trail**:
   - Every removal logged with judge ID, name, reason, timestamps
   - R2 deletion status tracked separately
   - Failed deletions flagged and retryable

## Database State After Force Remove

| Column | Before | After |
|--------|--------|-------|
| memes.is_active | 1 | 0 |
| memes.status | active | archived |
| meme_force_removals | (no row) | (new row with full audit) |
| cat_decisions | (existing) | (unchanged - audit trail) |
| cat_consensus | (existing) | (unchanged - excluded from counts) |
| R2 Storage | meme exists | deleted |

## Testing Checklist (Manual)

- [ ] **Shortcut**: Press Shift+X with meme displayed → Modal opens
- [ ] **Holding**: Hold Shift+X → Modal does not re-trigger
- [ ] **Input Safety**: Click reason box, type, then press any category key → Category key ignored
- [ ] **Modal Suspend**: Open modal, press 1-7 or Space → Keys ignored
- [ ] **Esc Cancel**: Press Esc in modal → Modal closes, reason cleared
- [ ] **Enter Confirm**: Focus confirm button, press Enter → Force remove executes
- [ ] **Request Flight**: During removal, buttons disabled → Shows "REMOVING..."
- [ ] **Success Toast**: After removal → Shows "FORCE REMOVED ✓", advances to next meme
- [ ] **R2 Verification**: Check R2 dashboard → Meme file deleted
- [ ] **DB Verification**: Query `memes WHERE id='...'` → is_active=0, status='archived'
- [ ] **Audit Row**: Query `meme_force_removals` → Full details logged
- [ ] **Judge Queue**: `/api/cat/next` → Removed meme never returned
- [ ] **Random Meme**: `/api/random-meme` → Removed meme never returned
- [ ] **410 Guard**: Another judge with same meme open calls decide → Gets 410, skips
- [ ] **Idempotent**: Call endpoint twice with same meme_id → Both succeed, no errors
- [ ] **Reddit Meme**: Force-remove meme with only image_url (no storage_path) → Succeeds with r2_deleted=1, r2_error='not_in_r2'
- [ ] **Superadmin Counts**: Overview totals should exclude removed meme
- [ ] **Audit View**: SuperDashboard FORCE REMOVED AUDIT tab → Shows all removals
- [ ] **RETRY Button**: On failed R2 delete row → RETRY button enabled and functional

## Production Deployment

1. **Run Migration**:
   ```bash
   npx wrangler d1 execute meme-capsule-db --file=d1/migrations/011_force_removals.sql
   ```

2. **Deploy**:
   ```bash
   npm run build
   git push
   # Cloudflare Pages auto-deploys on push to main
   ```

3. **Verify**:
   - Check that superadmin can see FORCE REMOVED AUDIT tab
   - Test force-remove with non-critical test meme
   - Verify R2 object deleted and meme hidden from app
   - Confirm audit row created with judge info

## Notes

- Uses `hex(randomblob(6))` for audit row IDs (consistent with existing pattern)
- Respects existing auth system (no new auth required)
- Compatible with existing undo/prefetch logic
- No breaking changes to existing endpoints
- All queries use parameterised SQL (no injection risk)
- Strict TypeScript mode passes without warnings
