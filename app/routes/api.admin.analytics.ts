import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.analytics'
import { apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { getAnalytics } from '../lib/db/admin-system'

/**
 * GET /api/admin/analytics — daily rollups + affiliate click totals
 * (viewer+). Rollups are a Stage 13 no-op until real traffic exists;
 * the payload's note states that plainly instead of implying data.
 */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'analytics', 'read', accessConfigFromEnv(env))
  return apiJson({ data: await getAnalytics(db) })
})
