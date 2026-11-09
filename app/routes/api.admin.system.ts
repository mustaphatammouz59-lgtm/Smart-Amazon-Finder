import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.system'
import { apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { getSystemStatus } from '../lib/db/admin-system'

/**
 * GET /api/admin/system — system status (viewer+). D1 is probed live;
 * other bindings are presence-only and labelled as such in the payload.
 * Queue depth is explicitly unavailable (see queueNote) — never faked.
 */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'overview', 'read', accessConfigFromEnv(env))
  return apiJson({ data: await getSystemStatus(db, env) })
})
