import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.overview'
import { apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { adminOverview } from '../lib/db/admin'

/** GET /api/admin/overview — catalog health (Access + RBAC guarded). */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'overview', 'read', accessConfigFromEnv(env))
  return apiJson({ data: await adminOverview(db) })
})
