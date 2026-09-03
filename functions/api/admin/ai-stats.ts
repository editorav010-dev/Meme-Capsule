import type { Env } from '../../_shared/d1r2'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_TOKEN}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [totalRow, categorisedRow, distribution, lowConf] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as total FROM memes WHERE is_active = 1').first<{total: number}>(),
    env.DB.prepare('SELECT COUNT(*) as total, AVG(ai_confidence) as avg_conf FROM memes WHERE ai_category IS NOT NULL').first<{total: number, avg_conf: number}>(),
    env.DB.prepare(`
      SELECT ai_category, COUNT(*) as count, AVG(ai_confidence) as avg_confidence
      FROM memes WHERE ai_category IS NOT NULL
      GROUP BY ai_category ORDER BY count DESC
    `).all(),
    env.DB.prepare('SELECT COUNT(*) as total FROM memes WHERE ai_category IS NOT NULL AND ai_confidence < 0.6').first<{total: number}>(),
  ])

  const total            = totalRow?.total ?? 0
  const totalCategorised = categorisedRow?.total ?? 0

  return Response.json({
    total_memes:          total,
    total_ai_categorised: totalCategorised,
    total_uncategorised:  total - totalCategorised,
    percent_complete:     total > 0 ? Math.round((totalCategorised / total) * 100) : 0,
    avg_confidence:       Math.round((categorisedRow?.avg_conf ?? 0) * 100) / 100,
    low_confidence_count: lowConf?.total ?? 0,
    category_distribution: distribution.results,
  })
}
