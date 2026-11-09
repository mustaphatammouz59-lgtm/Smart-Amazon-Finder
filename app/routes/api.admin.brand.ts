import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.brand'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { deleteBrand, getBrand, updateBrand } from '../lib/db/admin-taxonomy'

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  websiteUrl: z.string().trim().url().max(500).optional().nullable(),
})

function validationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
  return fields
}

function parseId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid brand id.', { id: 'Must be a positive integer.' })
  }
  return id
}

/** GET /api/admin/brands/:id — one brand with its product count. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'brands', 'read', accessConfigFromEnv(env))
  const id = parseId(params.id)
  const brand = await getBrand(db, id)
  if (!brand) throw new ApiError('NOT_FOUND', 'Brand not found.')
  return apiJson({ data: brand })
})

/** PATCH / DELETE /api/admin/brands/:id (admin only, audited; slug immutable). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'brands', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params.id)
  if (request.method === 'DELETE') {
    const result = await deleteBrand(db, actor, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Brand not found.')
      throw new ApiError('CONFLICT', 'Brand is still referenced by products and cannot be deleted.', {
        products: String(result.counts?.products ?? 0),
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
    throw new ApiError('VALIDATION_FAILED', 'The brand payload is invalid.', validationFields(parsed.error))
  }
  const result = await updateBrand(db, actor, id, parsed.data)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Brand not found.')
  return apiJson({ data: await getBrand(db, id) })
})
