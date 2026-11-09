import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.product-status'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { transitionProductStatus, writeAudit } from '../lib/db/admin'
import { reindexProduct } from '../lib/db/reindex'

const statusSchema = z.object({
  status: z.enum(['in_review', 'draft', 'archived']),
})

/** POST /api/admin/products/:id/status — editor-level status transitions. Publish stays publisher-only. */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  const body = await readJsonBody(request)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The status payload is invalid.', fields)
  }
  const result = await transitionProductStatus(db, actor, id, parsed.data.status)
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Product not found.')
    throw new ApiError('CONFLICT', 'Product cannot change status until its validation status is passed.')
  }
  if (parsed.data.status === 'archived' || parsed.data.status === 'draft') {
    await reindexProduct(db, id)
    await writeAudit(db, actor, 'product.reindex', 'product', id, null, { reason: 'status-change' })
  }
  return apiJson({ data: { id, status: parsed.data.status } })
})
