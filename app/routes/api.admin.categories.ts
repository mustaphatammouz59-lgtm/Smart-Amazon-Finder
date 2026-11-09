import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.categories'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { createCategory, listCategories } from '../lib/db/admin-taxonomy'
import { decodeCursor, encodeCursor } from '../lib/db/types'

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const createSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().min(-1000).max(1000).optional(),
  isIndexable: z.boolean().optional(),
})

function validationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
  return fields
}

/** GET /api/admin/categories — full taxonomy list (admin only). */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'categories', 'read', accessConfigFromEnv(env))
  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get('limit'))
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.max(Math.floor(rawLimit), 1), 60) : 24
  const offset = decodeCursor(url.searchParams.get('cursor'))
  const all = await listCategories(db)
  const items = all.slice(offset, offset + limit)
  const nextCursor = offset + limit < all.length ? encodeCursor(offset + limit) : null
  return apiJson({ data: items, nextCursor })
})

/** POST /api/admin/categories — create a category (admin only, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'categories', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'The category payload is invalid.',
      validationFields(parsed.error),
    )
  }
  const result = await createCategory(db, actor, parsed.data)
  if ('conflict' in result) {
    if (result.conflict === 'unknown_parent') {
      throw new ApiError('VALIDATION_FAILED', 'The parent category does not exist.', {
        parentId: 'Unknown parent category.',
      })
    }
    throw new ApiError('CONFLICT', 'A category with this slug already exists.')
  }
  return apiJson({ data: { id: result.id } }, 201)
})
