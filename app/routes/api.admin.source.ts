import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.source'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { getSource } from '../lib/db/admin-commerce'

/**
 * GET /api/admin/sources/:id — one source record in full, including the
 * normalised_json / licence_json bodies and raw_hash (read-only).
 */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'sources', 'read', accessConfigFromEnv(env))
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid source id.', {
      id: 'Must be a positive integer.',
    })
  }
  const source = await getSource(db, id)
  if (!source) throw new ApiError('NOT_FOUND', 'Source record not found.')
  return apiJson({ data: source })
})
