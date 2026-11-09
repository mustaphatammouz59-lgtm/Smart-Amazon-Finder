import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.users'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { listPublicUsers } from '../lib/db/admin-system'

/** GET /api/admin/users — public account list (admin+). password_hash is never selected. */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'users', 'read', accessConfigFromEnv(env))
  const params = new URL(request.url).searchParams
  const rawLimit = params.get('limit')
  let limit: number | undefined
  if (rawLimit !== null) {
    limit = Number(rawLimit)
    if (!Number.isInteger(limit) || limit <= 0)
      throw new ApiError('VALIDATION_FAILED', 'Invalid limit.', { limit: 'Must be a positive integer.' })
  }
  const result = await listPublicUsers(db, { cursor: params.get('cursor') ?? undefined, limit })
  return apiJson({ data: result.items, nextCursor: result.nextCursor })
})
