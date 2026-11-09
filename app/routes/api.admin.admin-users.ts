import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.admin-users'
import { apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { listAdminUsers } from '../lib/db/admin-system'

/** GET /api/admin/admin-users — admin account list (admin+). No secrets exist in this table. */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'users', 'read', accessConfigFromEnv(env))
  return apiJson({ data: await listAdminUsers(db) })
})
