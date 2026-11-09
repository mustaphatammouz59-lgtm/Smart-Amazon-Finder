import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.sources'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { listSources } from '../lib/db/admin-commerce'

/**
 * GET /api/admin/sources — list source records (read-only this stage;
 * the import pipeline is Stage 06). Listings never include the
 * normalised_json / licence_json bodies — those are detail-only.
 */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'sources', 'read', accessConfigFromEnv(env))
  const params = new URL(request.url).searchParams
  const validationStatus = params.get('validationStatus') ?? undefined
  if (
    validationStatus !== undefined &&
    !['pending', 'passed', 'failed'].includes(validationStatus)
  ) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid validationStatus parameter.', {
      validationStatus: 'Must be pending, passed or failed.',
    })
  }
  let limit: number | undefined
  const limitRaw = params.get('limit')
  if (limitRaw !== null) {
    limit = Number(limitRaw)
    if (!Number.isInteger(limit)) {
      throw new ApiError('VALIDATION_FAILED', 'Invalid limit parameter.', {
        limit: 'Must be an integer.',
      })
    }
  }
  const result = await listSources(db, {
    sourceId: params.get('sourceId') ?? undefined,
    validationStatus,
    cursor: params.get('cursor') ?? undefined,
    limit,
  })
  return apiJson({ data: result.items, nextCursor: result.nextCursor })
})
