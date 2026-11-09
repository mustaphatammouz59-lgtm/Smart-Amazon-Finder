import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.category'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { deleteCategory, getCategory, updateCategory } from '../lib/db/admin-taxonomy'

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
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

function parseId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid category id.', { id: 'Must be a positive integer.' })
  }
  return id
}

/** GET /api/admin/categories/:id — one category with reference counts. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'categories', 'read', accessConfigFromEnv(env))
  const id = parseId(params.id)
  const category = await getCategory(db, id)
  if (!category) throw new ApiError('NOT_FOUND', 'Category not found.')
  return apiJson({ data: category })
})

/** PATCH / DELETE /api/admin/categories/:id (admin only, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'categories', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params.id)
  if (request.method === 'DELETE') {
    const result = await deleteCategory(db, actor, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Category not found.')
      const counts = result.counts ?? { children: 0, products: 0, definitions: 0, guides: 0 }
      throw new ApiError('CONFLICT', 'Category is still referenced and cannot be deleted.', {
        children: String(counts.children),
        products: String(counts.products),
        definitions: String(counts.definitions),
        guides: String(counts.guides),
      })
    }
    return apiJson({ data: { id, deleted: true } })
  }
  if (request.method !== 'PATCH') {
    throw new ApiError('VALIDATION_FAILED', `Unsupported method ${request.method}.`)
  }
  const body = await readJsonBody(request)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'The category payload is invalid.',
      validationFields(parsed.error),
    )
  }
  const result = await updateCategory(db, actor, id, parsed.data)
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Category not found.')
    if (result.reason === 'cycle') {
      throw new ApiError(
        'CONFLICT',
        'The proposed parent would create a cycle: a category cannot be its own ancestor.',
        { parentId: 'Parent must not be the category itself or one of its descendants.' },
      )
    }
    throw new ApiError('VALIDATION_FAILED', 'The parent category does not exist.', {
      parentId: 'Unknown parent category.',
    })
  }
  return apiJson({ data: await getCategory(db, id) })
})
