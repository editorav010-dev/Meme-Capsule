import type { Env } from '../../_shared/d1r2'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_TOKEN}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const url    = new URL(request.url)
  const filter = url.searchParams.get('filter') ?? 'all'
  const page   = parseInt(url.searchParams.get('page') ?? '1')
  const limit  = Math.min(parseInt(url.searchParams.get('per_page') ?? '50'), 100)
  const offset = (page - 1) * limit

  let whereClause = 'WHERE m.ai_category IS NOT NULL AND c.consensus_category IS NOT NULL'
  if (filter === 'agree')          whereClause += ' AND m.ai_category = c.consensus_category'
  if (filter === 'disagree')       whereClause += ' AND m.ai_category != c.consensus_category'
  if (filter === 'low_confidence') whereClause += ' AND m.ai_confidence < 0.6'

  const [rows, countRow] = await Promise.all([
    env.DB.prepare(`
      SELECT m.id, m.image_url, m.title,
             m.ai_category, m.ai_confidence, m.ai_reasoning, m.ai_model,
             c.consensus_category, c.confidence_score,
             c.vote_breakdown, c.is_resolved, c.final_category
      FROM memes m
      JOIN cat_consensus c ON m.id = c.meme_id
      ${whereClause}
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all(),
    env.DB.prepare(`
      SELECT COUNT(*) as total FROM memes m
      JOIN cat_consensus c ON m.id = c.meme_id
      ${whereClause}
    `).first<{total: number}>(),
  ])

  const total = countRow?.total ?? 0

  return Response.json({
    memes:       rows.results,
    total,
    page,
    per_page:    limit,
    total_pages: Math.ceil(total / limit),
    filter,
  })
}
