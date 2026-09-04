import type { Env } from '../../_shared/d1r2'
import { ensureAIPredictionTable } from '../../_shared/curateDb'

const AI_STATUSES = new Set(['keep', 'excluded', 'duplicate', 'review_later'])
const AI_TOPICS = new Set([
  'Everyday Life', 'Work / Education', 'Relationships', 'Family',
  'Politics / Society', 'Internet Culture', 'Pop Culture', 'Gaming',
  'Animals', 'Food', 'Technology', 'Other'
])
const AI_TONES = new Set(['Wholesome', 'Dark', 'Chaotic', 'Cynical', 'Awkward', 'Neutral'])
const AI_MECHANISMS = new Set([
  'Relatability', 'Absurdity', 'Irony', 'Satire', 'Exaggeration',
  'Cringe', 'Dark Humour', 'Parody', 'Surrealism'
])

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_TOKEN}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: any

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    meme_id = null,
    storage_path = null,
    image_url = '',
    category_id = null,
    corpus_status = null,
    decision = null,
    topics = [],
    tone = null,
    humour_mechanisms = [],
    confidence = null,
    reasoning = '',
    model = '',
    tokens_used = 0,
    processing_ms = 0,
    raw_response = '',
    error = null
  } = body

  /*
   * We support BOTH:
   *   1. meme_id
   *   2. storage_path
   *
   * The Python categoriser normally sends storage_path because
   * R2 knows the storage path but does not know the D1 UUID.
   */

  let meme: any = null

  if (meme_id) {
    meme = await env.DB.prepare(
      'SELECT id, image_url, storage_path FROM memes WHERE id = ?'
    )
      .bind(meme_id)
      .first()
  }

  if (!meme && storage_path) {
    meme = await env.DB.prepare(
      'SELECT id, image_url, storage_path FROM memes WHERE storage_path = ?'
    )
      .bind(storage_path)
      .first()
  }

  if (!meme) {
    return Response.json(
      {
        error: 'Meme not found',
        meme_id,
        storage_path
      },
      { status: 404 }
    )
  }

  const resolvedMemeId = meme.id

  // Persist the multi-dimensional pre-judge result separately from human
  // curation. Legacy category fields below remain unchanged for compatibility.
  const hasStructuredResult =
    Object.prototype.hasOwnProperty.call(body, 'corpus_status') ||
    Object.prototype.hasOwnProperty.call(body, 'decision') ||
    Object.prototype.hasOwnProperty.call(body, 'topics') ||
    Object.prototype.hasOwnProperty.call(body, 'tone') ||
    Object.prototype.hasOwnProperty.call(body, 'humour_mechanisms')

  if (hasStructuredResult) {
    const normalizedStatus = String(corpus_status || decision || '').trim().toLowerCase()
    const normalizedTopics = Array.isArray(topics)
      ? topics.filter((value: unknown): value is string => typeof value === 'string' && AI_TOPICS.has(value)).slice(0, 3)
      : []
    const normalizedTone = typeof tone === 'string' && AI_TONES.has(tone) ? tone : null
    const normalizedMechanisms = Array.isArray(humour_mechanisms)
      ? humour_mechanisms.filter((value: unknown): value is string => typeof value === 'string' && AI_MECHANISMS.has(value)).slice(0, 2)
      : []

    if (!AI_STATUSES.has(normalizedStatus)) {
      return Response.json({ error: 'corpus_status must be keep, excluded, duplicate, or review_later.' }, { status: 400 })
    }

    await ensureAIPredictionTable(env.DB)
    await env.DB.prepare(`
      INSERT INTO ai_curation_predictions (
        meme_id, storage_path, image_url, corpus_status, topics, tone,
        humour_mechanisms, confidence, reasoning, model, tokens_used,
        processing_ms, raw_response, error, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(meme_id) DO UPDATE SET
        storage_path = excluded.storage_path,
        image_url = excluded.image_url,
        corpus_status = excluded.corpus_status,
        topics = excluded.topics,
        tone = excluded.tone,
        humour_mechanisms = excluded.humour_mechanisms,
        confidence = excluded.confidence,
        reasoning = excluded.reasoning,
        model = excluded.model,
        tokens_used = excluded.tokens_used,
        processing_ms = excluded.processing_ms,
        raw_response = excluded.raw_response,
        error = excluded.error,
        updated_at = excluded.updated_at
    `).bind(
      resolvedMemeId,
      meme.storage_path || storage_path,
      image_url || meme.image_url || '',
      normalizedStatus,
      JSON.stringify(normalizedTopics),
      normalizedTone,
      JSON.stringify(normalizedMechanisms),
      confidence,
      reasoning,
      model,
      tokens_used,
      processing_ms,
      raw_response,
      error
    ).run()
  }

  await env.DB.prepare(`
    UPDATE memes SET
      ai_category       = ?,
      ai_confidence     = ?,
      ai_reasoning      = ?,
      ai_categorised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      ai_model          = ?
    WHERE id = ?
  `)
    .bind(
      category_id || null,
      confidence,
      reasoning,
      model,
      resolvedMemeId
    )
    .run()

  /*
   * ai_cat_decisions is optional.
   * If this table exists, store the complete decision.
   */

  try {
    await env.DB.prepare(`
      INSERT INTO ai_cat_decisions
        (
          meme_id,
          image_url,
          category_id,
          category_label,
          confidence,
          reasoning,
          raw_response,
          model,
          tokens_used,
          processing_ms,
          error
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        resolvedMemeId,
        image_url || meme.image_url || '',
        category_id || null,
        category_id || null,
        confidence,
        reasoning,
        raw_response,
        model,
        tokens_used,
        processing_ms,
        error
      )
      .run()
  } catch {
    /*
     * Don't fail the entire categorisation if the optional
     * decision-history table isn't available.
     */
  }

  return Response.json({
    success: true,
    meme_id: resolvedMemeId,
    storage_path: meme.storage_path,
    category: category_id,
    confidence
  })
}
