import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.product-attributes'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { setProductAttributes } from '../lib/db/admin-products'

const attributesSchema = z.object({
  attributes: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9_]{1,40}$/),
        value: z.string().min(1).max(200),
      }),
    )
    .max(50),
})

/** PUT /api/admin/products/:id/attributes — replace all attributes (editor+, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  const body = await readJsonBody(request)
  const parsed = attributesSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The attributes payload is invalid.', fields)
  }
  const result = await setProductAttributes(db, actor, id, parsed.data.attributes)
  if (!result.ok && result.reason === 'invalid_key')
    throw new ApiError('VALIDATION_FAILED', 'An attribute key or value is invalid.', {
      attributes: 'Keys must be lowercase slug characters (a-z, 0-9, _), values 1–200 characters.',
    })
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Product not found.')
  return apiJson({ data: { id, count: parsed.data.attributes.length } })
})
