import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.media-primary'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { setPrimaryMedia } from '../lib/db/admin-media'

/** POST /api/admin/media/:id/primary — set a product's primary image (editor+, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid media id.', { id: 'Must be a positive integer.' })
  const result = await setPrimaryMedia(db, actor, id)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Media not found.')
  return apiJson({ data: { id, primary: true } })
})
