import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.merchants'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { createMerchant, listMerchants } from '../lib/db/admin-commerce'

// RBAC note: merchants have no dedicated area in ADMIN_RBAC. Merchant and
// affiliate-program administration are grouped under 'programs' (admin+)
// for both merchants and programs routes in this stage.
const AREA = 'programs'

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(160),
  baseDomain: z.string().trim().min(1).max(255),
})

/** GET /api/admin/merchants — list merchants with program/offer counts. */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, AREA, 'read', accessConfigFromEnv(env))
  return apiJson({ data: await listMerchants(db) })
})

/** POST /api/admin/merchants — create a merchant (admin+, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, AREA, 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The merchant payload is invalid.', fields)
  }
  const result = await createMerchant(db, actor, parsed.data)
  if ('conflict' in result) {
    throw new ApiError('CONFLICT', 'A merchant with this slug already exists.')
  }
  return apiJson({ data: { id: result.id } }, 201)
})
