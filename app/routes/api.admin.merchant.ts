import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.merchant'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { deleteMerchant, getMerchant, updateMerchant } from '../lib/db/admin-commerce'

// RBAC: merchants are grouped under the 'programs' area (see merchants route).
const AREA = 'programs'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  baseDomain: z.string().trim().min(1).max(255).optional(),
})

function parseId(params: { id?: string }): number {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid merchant id.', {
      id: 'Must be a positive integer.',
    })
  }
  return id
}

/** GET /api/admin/merchants/:id — one merchant with counts. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, AREA, 'read', accessConfigFromEnv(env))
  const id = parseId(params)
  const merchant = await getMerchant(db, id)
  if (!merchant) throw new ApiError('NOT_FOUND', 'Merchant not found.')
  return apiJson({ data: merchant })
})

/** PATCH / DELETE /api/admin/merchants/:id — update, or delete when unused. */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, AREA, 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params)
  if (request.method === 'DELETE') {
    const result = await deleteMerchant(db, actor, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Merchant not found.')
      throw new ApiError(
        'CONFLICT',
        `Merchant is in use by ${result.programs_count} program(s) and ${result.offers_count} offer(s).`,
      )
    }
    return apiJson({ data: { id, deleted: true } })
  }
  const body = await readJsonBody(request)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The merchant payload is invalid.', fields)
  }
  const result = await updateMerchant(db, actor, id, parsed.data)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Merchant not found.')
  return apiJson({ data: { id } })
})
