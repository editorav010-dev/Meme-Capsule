import type { Env } from '../../../_shared/d1r2';

const CATEGORY_MAP: Record<number, string> = {
  1: "Dank",
  2: "Relatable",
  3: "Dark Humour",
  4: "Wholesome",
  5: "Cringe",
  6: "Political",
  7: "Cursed"
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  const tokenHeader = request.headers.get('X-Admin-Token');
  const isAuthorized =
    (authHeader && authHeader === `Bearer ${env.ADMIN_API_TOKEN}`) ||
    (tokenHeader && tokenHeader === env.ADMIN_API_TOKEN);

  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const memeId = body.meme_id || body.memeId;
  const categoryId = Number(body.category_id ?? body.categoryId);

  if (!memeId) {
    return Response.json({ error: 'meme_id required' }, { status: 400 });
  }

  if (isNaN(categoryId) || categoryId < 1 || categoryId > 7) {
    return Response.json({ error: 'category_id must be between 1 and 7' }, { status: 400 });
  }

  const meme = await env.DB.prepare(
    'SELECT id FROM memes WHERE id = ?'
  ).bind(memeId).first();

  if (!meme) {
    return Response.json({ error: 'Meme not found' }, { status: 404 });
  }

  const categoryLabel = CATEGORY_MAP[categoryId] || "Unsorted";
  const now = new Date().toISOString();

  // 1. Update memes table with override
  await env.DB.prepare(`
    UPDATE memes SET
      ai_category       = ?,
      ai_confidence     = 1.0,
      ai_reasoning      = 'Manually confirmed/overridden by superadmin',
      ai_categorised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).bind(categoryId, memeId).run();

  // 2. Also ensure cat_consensus reflects final confirmed category
  try {
    await env.DB.prepare(`
      INSERT INTO cat_consensus (meme_id, consensus_category, confidence_score, is_resolved, final_category, last_updated)
      VALUES (?, ?, 1.0, 1, ?, ?)
      ON CONFLICT(meme_id) DO UPDATE SET
        final_category = excluded.final_category,
        is_resolved = 1,
        last_updated = excluded.last_updated
    `).bind(memeId, categoryId, categoryId, now).run();
  } catch (err) {
    // If cat_consensus table has not been migrated yet, continue safely
    console.warn('cat_consensus update notice:', err);
  }

  return Response.json({
    success: true,
    meme_id: memeId,
    category_id: categoryId,
    category_label: categoryLabel
  });
};
