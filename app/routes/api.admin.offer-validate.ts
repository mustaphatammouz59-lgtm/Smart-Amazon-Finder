import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.offer-validate'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { runOfferValidation } from '../lib/offer-validation'

/**
 * POST /api/admin/offers/:id/validate — run offer validation, persist
 * offers.validation_status, and audit the run ('offer.validate').
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
  const validation = await runOfferValidation(db, actor, id)
  if (!validation) throw new ApiError('NOT_FOUND', 'Offer not found.')
  return apiJson({ data: validation })
})
