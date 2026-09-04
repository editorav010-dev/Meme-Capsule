import type { Env } from '../../_shared/d1r2'

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
