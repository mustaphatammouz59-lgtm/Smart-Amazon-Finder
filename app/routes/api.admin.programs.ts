import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.programs'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { createProgram, listPrograms } from '../lib/db/admin-commerce'

const createSchema = z.object({
  merchantId: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  linkTemplate: z.string().trim().min(1).max(2000),
  trackingParam: z.string().trim().max(500).nullable().optional(),
  termsUrl: z.string().url().max(2000).nullable().optional(),
  status: z.enum(['inactive', 'active', 'suspended']).optional(),
  termsCheckedAt: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
})

/** GET /api/admin/programs — list affiliate programs (?merchantId= filter). */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'programs', 'read', accessConfigFromEnv(env))
  const params = new URL(request.url).searchParams
  const merchantIdRaw = params.get('merchantId')
  let merchantId: number | undefined
  if (merchantIdRaw !== null) {
    merchantId = Number(merchantIdRaw)
    if (!Number.isInteger(merchantId) || merchantId <= 0) {
      throw new ApiError('VALIDATION_FAILED', 'Invalid merchantId parameter.', {
        merchantId: 'Must be a positive integer.',
      })
    }
  }
  return apiJson({ data: await listPrograms(db, { merchantId }) })
})

/** POST /api/admin/programs — create a program (admin+, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'programs', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The program payload is invalid.', fields)
  }
  const result = await createProgram(db, actor, parsed.data)
  if ('conflict' in result) {
    throw new ApiError('CONFLICT', 'The referenced merchant does not exist.')
  }
  return apiJson({ data: { id: result.id } }, 201)
})
