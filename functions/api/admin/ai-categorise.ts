import type { Env } from '../../_shared/d1r2'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_TOKEN}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: any
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const {
    meme_id, category_id, confidence, reasoning,
    model, tokens_used = 0, processing_ms = 0,
    raw_response = '', error = null
  } = body

  if (!meme_id) return Response.json({ error: 'meme_id required' }, { status: 400 })

  const meme = await env.DB.prepare(
    'SELECT id FROM memes WHERE id = ?'
  ).bind(meme_id).first()

  if (!meme) return Response.json({ error: 'Meme not found' }, { status: 404 })

  await env.DB.prepare(`
    UPDATE memes SET
      ai_category       = ?,
      ai_confidence     = ?,
      ai_reasoning      = ?,
      ai_categorised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      ai_model          = ?
    WHERE id = ?
  `).bind(category_id || null, confidence, reasoning, model, meme_id).run()

  await env.DB.prepare(`
    INSERT INTO ai_cat_decisions
      (meme_id, image_url, category_id, category_label, confidence,
       reasoning, raw_response, model, tokens_used, processing_ms, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    meme_id, '', category_id || null, reasoning, confidence,
    reasoning, raw_response, model, tokens_used, processing_ms, error
  ).run()

  return Response.json({ success: true, meme_id })
}
