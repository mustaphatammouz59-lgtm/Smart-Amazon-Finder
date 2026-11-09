import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.offer-refresh'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { queueOfferRefresh } from '../lib/db/admin-commerce'

/**
 * POST /api/admin/offers/:id/refresh — enqueue a 'refresh-offers' job
 * and audit it ('offer.refresh_queued'). The queue consumer is a
 * contract no-op until Stage 06, so this queues honestly: no price
 * is fetched or changed by this endpoint.
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'offers', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid offer id.', {
      id: 'Must be a positive integer.',
    })
  }
  const result = await queueOfferRefresh((env as Env).JOBS, db, actor, id)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Offer not found.')
  return apiJson({ data: { id, queued: true } })
})
