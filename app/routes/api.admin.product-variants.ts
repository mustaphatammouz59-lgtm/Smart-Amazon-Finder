import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.product-variants'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { createVariant, getAdminProduct, listVariants } from '../lib/db/admin-products'

function parseProductId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  return id
}

const createVariantSchema = z.object({
  variantKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(1).max(120),
  sourceSkuRef: z.string().trim().max(120).optional(),
})

/** GET /api/admin/products/:id/variants — list variants (editor+). */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'products', 'read', accessConfigFromEnv(env))
  const id = parseProductId(params.id)
  const detail = await getAdminProduct(db, id)
  if (!detail) throw new ApiError('NOT_FOUND', 'Product not found.')
  const items = await listVariants(db, id)
  return apiJson({ data: items })
})

/** POST /api/admin/products/:id/variants — create a variant (editor+, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseProductId(params.id)
  const body = await readJsonBody(request)
  const parsed = createVariantSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The variant payload is invalid.', fields)
  }
  const result = await createVariant(db, actor, id, parsed.data)
  if ('notFound' in result) throw new ApiError('NOT_FOUND', 'Product not found.')
  if ('conflict' in result) throw new ApiError('CONFLICT', 'A variant with this key already exists.')
  return apiJson({ data: { id: result.id } }, 201)
})
