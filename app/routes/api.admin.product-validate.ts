import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.product-validate'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { runProductValidation } from '../lib/product-validation'

/** POST /api/admin/products/:id/validate — run + persist product validation (editor+). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  const validation = await runProductValidation(db, actor, id)
  if (!validation) throw new ApiError('NOT_FOUND', 'Product not found.')
  return apiJson({ data: validation })
})
