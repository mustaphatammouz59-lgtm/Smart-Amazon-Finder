import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.program'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { deleteProgram, getProgram, updateProgram } from '../lib/db/admin-commerce'

// merchantId is immutable: it is deliberately absent from the patch schema,
// so a merchantId in the payload is ignored rather than applied.
const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  linkTemplate: z.string().trim().min(1).max(2000).optional(),
  trackingParam: z.string().trim().max(500).nullable().optional(),
  termsUrl: z.string().url().max(2000).nullable().optional(),
  status: z.enum(['inactive', 'active', 'suspended']).optional(),
  termsCheckedAt: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
})

function parseId(params: { id?: string }): number {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid program id.', {
      id: 'Must be a positive integer.',
    })
  }
  return id
}

/** GET /api/admin/programs/:id — one program with merchant + offer count. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'programs', 'read', accessConfigFromEnv(env))
  const id = parseId(params)
  const program = await getProgram(db, id)
  if (!program) throw new ApiError('NOT_FOUND', 'Program not found.')
  return apiJson({ data: program })
})

/** PATCH / DELETE /api/admin/programs/:id — update, or delete when unused. */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'programs', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params)
  if (request.method === 'DELETE') {
    const result = await deleteProgram(db, actor, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Program not found.')
      throw new ApiError('CONFLICT', `Program is in use by ${result.offers_count} offer(s).`)
    }
    return apiJson({ data: { id, deleted: true } })
  }
  const body = await readJsonBody(request)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The program payload is invalid.', fields)
  }
  const result = await updateProgram(db, actor, id, parsed.data)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Program not found.')
  return apiJson({ data: { id } })
})
