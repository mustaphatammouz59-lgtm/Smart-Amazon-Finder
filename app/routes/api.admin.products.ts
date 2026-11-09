import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.products'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { readJsonBody } from '../lib/api'
import { enforceRateLimit } from '../lib/rate-limit'
import { createProduct } from '../lib/db/admin'

const createSchema = z.object({
  categorySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brandSlug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(3).max(160),
  modelRef: z.string().trim().max(120).optional(),
  editorialSummary: z.string().trim().max(2000).optional(),
})

/** POST /api/admin/products — create a draft product (editor+, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The product payload is invalid.', fields)
  }
  const result = await createProduct(db, actor, parsed.data)
  if ('conflict' in result) {
    throw new ApiError(
      'CONFLICT',
      'A product with this slug already exists, or the category/brand is unknown.',
    )
  }
  return apiJson({ data: { id: result.id, status: 'draft' } }, 201)
})
