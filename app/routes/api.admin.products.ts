import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.products'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { readJsonBody } from '../lib/api'
import { enforceRateLimit } from '../lib/rate-limit'
import { assertSameOrigin } from '../lib/origin'
import { createProduct } from '../lib/db/admin'
import { listAdminProducts } from '../lib/db/admin-products'

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

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['draft', 'in_review', 'published', 'archived']).optional(),
  validation: z.enum(['pending', 'passed', 'failed']).optional(),
  category: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  brand: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sort: z.enum(['name', 'newest', 'updated']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
})

/** GET /api/admin/products — paginated admin product list (editor+). */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'products', 'read', accessConfigFromEnv(env))
  const url = new URL(request.url)
  const param = (name: string): string | undefined => {
    const value = url.searchParams.get(name)
    return value === null || value === '' ? undefined : value
  }
  const parsed = listQuerySchema.safeParse({
    q: param('q'),
    status: param('status'),
    validation: param('validation'),
    category: param('category'),
    brand: param('brand'),
    sort: param('sort'),
    cursor: param('cursor'),
    limit: param('limit'),
  })
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'query')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The product list query is invalid.', fields)
  }
  const { items, nextCursor } = await listAdminProducts(db, {
    q: parsed.data.q,
    status: parsed.data.status,
    validationStatus: parsed.data.validation,
    categorySlug: parsed.data.category,
    brandSlug: parsed.data.brand,
    sort: parsed.data.sort,
    cursor: parsed.data.cursor ?? null,
    limit: parsed.data.limit,
  })
  return apiJson({ data: items, nextCursor })
})

/** POST /api/admin/products — create a draft product (editor+, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
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
