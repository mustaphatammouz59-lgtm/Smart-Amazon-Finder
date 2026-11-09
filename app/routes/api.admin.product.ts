import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.product'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { getAdminProduct, updateProduct } from '../lib/db/admin-products'
import { productIndexability, validateProduct } from '../lib/product-validation'

function parseProductId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  return id
}

const patchSchema = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  modelRef: z.string().trim().max(120).nullable().optional(),
  editorialSummary: z.string().trim().max(10000).nullable().optional(),
  categorySlug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  brandSlug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()
    .optional(),
  licenceStatus: z.enum(['owned', 'licensed', 'restricted', 'expired']).optional(),
})

/** GET /api/admin/products/:id — admin product detail + validation + indexability. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'products', 'read', accessConfigFromEnv(env))
  const id = parseProductId(params.id)
  const detail = await getAdminProduct(db, id)
  if (!detail) throw new ApiError('NOT_FOUND', 'Product not found.')
  const validation = await validateProduct(db, id)
  const indexability = await productIndexability(db, id)
  return apiJson({ data: { ...detail, validation, indexability } })
})

/** PATCH /api/admin/products/:id — update product fields (editor+, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseProductId(params.id)
  const body = await readJsonBody(request)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The product payload is invalid.', fields)
  }
  const result = await updateProduct(db, actor, id, parsed.data)
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Product not found.')
    throw new ApiError('CONFLICT', 'The category or brand is unknown.')
  }
  const detail = await getAdminProduct(db, id)
  return apiJson({ data: detail ? { id, ...detail } : { id } })
})
