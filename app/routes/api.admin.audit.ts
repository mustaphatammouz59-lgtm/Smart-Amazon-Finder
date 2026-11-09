import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.audit'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { listAudit } from '../lib/db/admin-system'

function parseOptionalInt(params: URLSearchParams, name: string): number | undefined {
  const raw = params.get(name)
  if (raw === null) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0)
    throw new ApiError('VALIDATION_FAILED', `Invalid ${name} filter.`, {
      [name]: 'Must be a positive integer.',
    })
  return value
}

/** GET /api/admin/audit — audit log viewer (admin+), newest first. */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'audit', 'read', accessConfigFromEnv(env))
  const params = new URL(request.url).searchParams
  const limit = parseOptionalInt(params, 'limit')
  const result = await listAudit(db, {
    entityType: params.get('entityType') ?? undefined,
    entityId: parseOptionalInt(params, 'entityId'),
    actorId: parseOptionalInt(params, 'actorId'),
    action: params.get('action') ?? undefined,
    cursor: params.get('cursor') ?? undefined,
    limit,
  })
  return apiJson({ data: result.items, nextCursor: result.nextCursor })
})
