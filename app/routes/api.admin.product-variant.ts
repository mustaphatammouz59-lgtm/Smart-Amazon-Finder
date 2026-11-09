import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.product-variant'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { deleteVariant } from '../lib/db/admin-products'

/** DELETE /api/admin/products/:id/variants/:variantId — delete a variant (editor+, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  const variantId = Number(params.variantId)
  if (!Number.isInteger(variantId) || variantId <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid variant id.', {
      variantId: 'Must be a positive integer.',
    })
  const result = await deleteVariant(db, actor, id, variantId)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Variant not found.')
  return apiJson({ data: { deleted: true } })
})
