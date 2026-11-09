import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.product-specs'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { setProductSpecs } from '../lib/db/admin-products'

const specsSchema = z.object({
  specs: z
    .array(
      z.object({
        definitionId: z.number().int().positive(),
        value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
      }),
    )
    .max(200),
})

/** PUT /api/admin/products/:id/specs — replace spec values (editor+, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  const body = await readJsonBody(request)
  const parsed = specsSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The specs payload is invalid.', fields)
  }
  const result = await setProductSpecs(db, actor, id, parsed.data.specs)
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Product not found.')
    const fields: Record<string, string> = {}
    if (result.definitionId !== undefined) {
      fields.specs =
        result.reason === 'unknown_definition'
          ? `Unknown definition ${result.definitionId} for this product category.`
          : `Value type does not match definition ${result.definitionId}.`
    }
    throw new ApiError('VALIDATION_FAILED', 'The specs payload is invalid.', fields)
  }
  return apiJson({ data: { id, count: parsed.data.specs.length } })
})
