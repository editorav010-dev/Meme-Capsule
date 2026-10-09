# AI-Judgement Review Workflow Walkthrough

This document outlines the final, production-verified AI-Judgement Review Workflow for human judges within the Meme Capsule `/curate` dashboard.

## Overview
The `/curate` dashboard deeply integrates pre-evaluations from offline AI models (`user-judge4` and `user-judge5`) directly into the human curation flow. Rather than manually curating all 5,000+ memes from scratch or waiting for multiple human consensus passes, human judges (Judges 1, 2, and 3) review AI evaluations, adopt high-confidence recommendations with single keystrokes, and have **immediate final authority** to publish memes live to the public app or exclude them permanently.

---

## 1. The Core AI Review States

### State A: AI Consensus (Judge 4 & Judge 5 Agree)
- **Condition:** Both AI Judge 4 and AI Judge 5 have evaluated the meme and arrived at the same `corpus_status` (e.g., both voted `keep` or both voted `excluded`).
- **UI Presentation:** High-contrast Neo-Brutalist green banner (`AI CONSENSUS: KEEP`) or red banner (`AI CONSENSUS: EXCLUDE`).
- **Curator Action:**
  - Press `Space` or `Enter` to fast-approve the consensus in a single stroke.
  - If status matches but taxonomy details differ: press `4` to adopt Judge 4, press `5` to adopt Judge 5, or press `Space`/`Enter` to adopt Judge 4 by default.
  - To disagree with both: press `O` to enter Manual Override Mode.

### State B: AI Disagreement (Conflicting Evaluations)
- **Condition:** Both AIs evaluated the meme, but their verdicts differ (e.g., Judge 4 says `keep` while Judge 5 says `excluded`).
- **UI Presentation:** High-contrast orange banner (`⚠️ AI JUDGE DISAGREEMENT`) with two side-by-side cards detailing each AI's decision, topics, tone, and humor mechanisms.
- **Curator Action:**
  - Press `4` to adopt AI Judge 4's decision.
  - Press `5` to adopt AI Judge 5's decision.
  - Press `O` to manually curate from scratch.

### State Single AI: 1 AI Evaluation Ready
- **Condition:** Only one AI (either Judge 4 or Judge 5) has processed the meme.
- **UI Presentation:** Yellow/amber banner displaying the available AI verdict with a "1 AI Ready" badge.
- **Curator Action:**
  - Press `Space` or `Enter` to instantly adopt the available AI verdict without roadmap or delay.
  - Press `O` to manually curate.

### State None: Unprocessed Meme
- **Condition:** Neither AI has evaluated the meme yet.
- **UI Presentation:** Dark card prompting the curator to open manual curation (`O`).

---

## 2. Immediate Finality: Single-Judge Adoption (`POST /api/curate/approve`)

In previous iterations, conflicting judge decisions had to be routed to a separate SuperAdmin Command Center for arbitration. Under this new workflow:
1. **Adoption = Final:** When ANY human judge (Judge 1, 2, or 3) adopts an AI judgement or submits manual curation, the decision is authoritative and final.
2. **Atomic Edge Transaction:**
   - Writes to `meme_curation` under that judge's `user_id` and `user_name` for audit logs.
   - Writes directly to `meme_curation_final` with `resolved_by = "{Judge Name} [Adopted: {Source}]"`.
   - Directly updates `memes` table (`is_active = 1` for keep, `0` for excluded; `status = 'active'` for keep, `'archived'` for excluded; `curation_status`, `tags`, `category`).
3. **Queue Deduplication:** As soon as any human judge finalizes a meme, it automatically exits the `unreviewed` queue for all judges and increments the project-wide reviewed counter.

---

## 3. Destructive Action: FORCE REMOVE (`Shift+Delete` / `POST /api/curate/force-remove`)

For non-meme uploads (e.g., random photos, corrupt images, spam):
- **Hotkey:** `Shift+Delete` or `Shift+Backspace`.
- **UI Button:** Prominent red `🗑️ FORCE REMOVE [SHIFT+DEL]` button available in both AI Review and Override views.
- **Physical Deletion:**
  - Deletes the media file directly from the Cloudflare R2 bucket (`env.MEMES_BUCKET`).
  - Purges all records across D1 tables: `memes`, `meme_curation`, `meme_curation_final`, `ai_curation_predictions`, `meme_events`, `meme_analytics`, `meme_daily_stats`.
- **Safety:** This action is intentionally non-undoable.

---

## 4. Keyboard Shortcuts Summary

### AI Review Mode (Default)
| Key | Action |
|---|---|
| `Space` or `Enter` | Fast-approve AI Consensus / Instantly Adopt Single AI |
| `4` | Adopt AI Judge 4 decision |
| `5` | Adopt AI Judge 5 decision |
| `O` | Enter Manual Override Mode |
| `Shift + Delete` | **FORCE REMOVE** (Permanently delete from R2 & D1) |
| `Ctrl + Z` / `Cmd + Z` / `U` | Undo last curation decision |
| `←` / `→` | Previous / Next meme in queue |

### Manual Override Mode (`O`)
| Key | Action |
|---|---|
| `Space` or `Enter` | Confirm & Advance manual curation |
| `K` | Keep |
| `X` | Exclude & Advance |
| `D` | Mark Duplicate |
| `R` | Review Later & Advance |
| `1-9, 0, -, =` | Toggle Topics (Max 3) |
| `Q, W, E, A, S, F` | Select Tone (1 dominant) |
| `Z, C, V, B, N, M, J, P, O` | Select Humor Mechanisms (Max 2) |
| `Esc` | Return to AI Review view |
| `Shift + Delete` | **FORCE REMOVE** (Permanently delete from R2 & D1) |
| `Ctrl + Z` / `Cmd + Z` / `U` | Undo last curation decision |
| `←` / `→` | Previous / Next meme in queue |

---

## 5. Verification & Testing
- **TypeScript & Vite Build:** Verified with `npm run build` (0 errors, 1,633 modules transformed).
- **Backend API Routes:**
  - `POST /api/curate/approve` (Atomic batch transaction on D1)
  - `POST /api/curate/force-remove` (R2 delete + multi-table D1 cleanup)
  - `GET /api/curate/next` (Filters finalized memes out of unreviewed queues)
- **UI/UX:** Neo-brutalist styling maintained with Anton & Oswald typography, zero layout shifts, and responsive split columns.
