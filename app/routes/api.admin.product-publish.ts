import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.product-publish'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { transitionProductStatus, writeAudit } from '../lib/db/admin'
import { reindexProduct } from '../lib/db/reindex'

/**
 * POST /api/admin/products/:id/publish — publisher+ only.
 * The DAL gate refuses publication unless validation_status='passed';
 * a successful publish maintains the search projection immediately
 * (the queue job performs the same reindex asynchronously in production).
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'publish', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  const result = await transitionProductStatus(db, actor, id, 'published')
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Product not found.')
    throw new ApiError('CONFLICT', 'Product cannot be published until its validation status is passed.')
  }
  await reindexProduct(db, id)
  await writeAudit(db, actor, 'product.reindex', 'product', id, null, { reason: 'publish' })
  return apiJson({ data: { id, status: 'published' } })
})
