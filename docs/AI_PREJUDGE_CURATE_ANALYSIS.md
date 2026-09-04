# AI PRE-JUDGE `/curate` Architecture Analysis

## Scope

This document records the read-only architecture inspection for exposing existing AI
pre-judge results in the human curation interface. The AI layer is advisory only.
It must not become a human judge, alter human vote counts, overwrite human decisions,
or replace consensus and final curation.

## `/curate` ownership

- `src/main.tsx` routes `/curate` to `src/curate/CurateApp.tsx`.
- `src/curate/CurateApp.tsx` owns the human judge page, current meme, human form state,
  navigation, save, undo, and authentication state.
- `src/curate/EditorialButtons.tsx` renders editorial status controls.
- `src/curate/CategorizationPanel.tsx` renders the human taxonomy controls.
- `src/curate/curateTypes.ts` defines the human taxonomy:
  - Topics: Everyday Life, Work / Education, Relationships, Family,
    Politics / Society, Internet Culture, Pop Culture, Gaming, Animals, Food,
    Technology, Other.
  - Tones: Wholesome, Dark, Chaotic, Cynical, Awkward, Neutral.
  - Humour mechanisms: Relatability, Absurdity, Irony, Satire, Exaggeration,
    Cringe, Dark Humour, Parody, Surrealism.
- `src/curate/curateApi.ts` is the frontend API client.
- `src/curate/curate.css` contains the `/curate` styling.

## API data flow

The primary meme endpoint used by `/curate` is:

```text
GET /api/curate/next
```

The frontend calls it through `fetchNextMeme()` in `src/curate/curateApi.ts`.
`functions/api/curate/next.ts` authenticates the curator session, selects the next
meme, loads the current judge's human row, and returns the meme payload.

The endpoint already includes a read-only AI join:

```sql
LEFT JOIN ai_curation_predictions ai
  ON m.id = ai.meme_id
```

The response builder returns that row as `meme.ai_prediction`. A missing row produces
`ai_prediction: null`, so memes without AI results can continue through the queue.

`GET /api/curate/list` is a separate paginated browse endpoint. It currently returns
human curation fields and is not the endpoint used for the active judge workspace.

## AI storage

The `/curate`-compatible AI storage shape is the dynamically ensured
`ai_curation_predictions` table in `functions/api/curate/next.ts`. Its fields include:

- `meme_id`
- `topics`
- `tone`
- `humour_mechanisms`
- `confidence`
- `reasoning`
- `model`
- `tokens_used`
- `processing_ms`
- `error`
- timestamps

The repository also contains a separate legacy AI path:

- `functions/api/admin/ai-categorise.ts` writes numeric `memes.ai_category` data and
  optionally records `ai_cat_decisions`.
- That path belongs to the older seven-category `/categorise` system and is not the
  `/curate` taxonomy.
- `cat_consensus` and `cat_decisions` also belong to the older numeric category system.

The `/curate` human tables are separate:

- `meme_curation`: one human row per meme and user.
- `meme_curation_final`: superadmin-authoritative final curation.

Neither human table should receive AI records.

## Current gap

The backend already returns `meme.ai_prediction`, but the frontend type
`CurateMemeItem` does not declare it and `CurateApp.tsx` does not render it.
Therefore the primary missing link is the frontend display layer and its type.

The existing client-side AI console can generate a decision in React state and route
it through the ordinary human save flow. That behavior is not suitable for an
advisory-only AI layer because it can write AI-populated values into `meme_curation`.
The approved implementation must keep the persisted external AI result read-only in
the human workspace and must not use AI data to update human decisions.

## Required implementation

1. Add a typed optional `ai_prediction` field to `CurateMemeItem`.
2. Add a compact, visually secondary `AI PRE-JUDGE` panel to the existing `/curate`
   workspace.
3. Render topics, tone, humour mechanisms, confidence, reasoning, and model metadata
   from the existing backend response.
4. Render `Not analysed yet.` when no prediction exists.
5. Keep the panel separate from `EditorialButtons`, `CategorizationPanel`, and
   `saveCuration()`.
6. Do not write AI data to `meme_curation`, `meme_curation_final`, `cat_consensus`,
   or `cat_decisions`.

## Database impact

No new database migration is required for the display path because
`ai_curation_predictions` is already created by the existing `/api/curate/next`
endpoint and is already joined into its response. A schema migration would only be
needed if the external producer is proven to write to a different table or if the
existing prediction table is absent from the deployed database.

## Authentication and secrets

`/curate` uses bearer session tokens issued by `/api/cat/login` and validated by
`functions/_shared/catAuth.ts`. The browser must continue to use the existing
same-origin `/api/curate/next` route. `ADMIN_API_TOKEN` must not be exposed to the
frontend.
