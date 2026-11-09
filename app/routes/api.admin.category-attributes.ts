import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.category-attributes'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { createAttributeDefinition, getCategory, listAttributeDefinitions } from '../lib/db/admin-taxonomy'
import { decodeCursor, encodeCursor } from '../lib/db/types'

const createSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]{1,60}$/),
  label: z.string().trim().min(1).max(120),
  unit: z.string().trim().max(20).optional().nullable(),
  valueType: z.enum(['number', 'text', 'bool']),
  isFilterable: z.boolean().optional(),
  isComparisonCriterion: z.boolean().optional(),
  sortWeight: z.number().int().optional(),
})

function validationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
  return fields
}

function parseId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid category id.', { id: 'Must be a positive integer.' })
  }
  return id
}

/** GET /api/admin/categories/:id/attributes — definitions of one category. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'categories', 'read', accessConfigFromEnv(env))
  const id = parseId(params.id)
  const category = await getCategory(db, id)
  if (!category) throw new ApiError('NOT_FOUND', 'Category not found.')
  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get('limit'))
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.max(Math.floor(rawLimit), 1), 60) : 24
  const offset = decodeCursor(url.searchParams.get('cursor'))
  const all = await listAttributeDefinitions(db, id)
  const items = all.slice(offset, offset + limit)
  const nextCursor = offset + limit < all.length ? encodeCursor(offset + limit) : null
  return apiJson({ data: items, nextCursor })
})

/** POST /api/admin/categories/:id/attributes — create a definition (audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'categories', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params.id)
  const category = await getCategory(db, id)
  if (!category) throw new ApiError('NOT_FOUND', 'Category not found.')
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'The attribute definition payload is invalid.',
      validationFields(parsed.error),
    )
  }
  const result = await createAttributeDefinition(db, actor, id, parsed.data)
  if ('conflict' in result) {
    if (result.conflict === 'unknown_category') throw new ApiError('NOT_FOUND', 'Category not found.')
    throw new ApiError('CONFLICT', 'An attribute definition with this key already exists in the category.', {
      key: 'Key already exists in this category.',
    })
  }
  return apiJson({ data: { id: result.id } }, 201)
})
