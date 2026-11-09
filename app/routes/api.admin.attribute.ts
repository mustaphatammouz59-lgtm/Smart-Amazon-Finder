import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.attribute'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import {
  deleteAttributeDefinition,
  getAttributeDefinition,
  updateAttributeDefinition,
} from '../lib/db/admin-taxonomy'

/** key, value_type and category are immutable, so they are not patch fields. */
const patchSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  unit: z.string().trim().max(20).optional().nullable(),
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
    throw new ApiError('VALIDATION_FAILED', 'Invalid attribute definition id.', {
      id: 'Must be a positive integer.',
    })
  }
  return id
}

/** PATCH / DELETE /api/admin/attributes/:id (admin only, audited). */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'categories', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params.id)
  if (request.method === 'DELETE') {
    const result = await deleteAttributeDefinition(db, actor, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Attribute definition not found.')
      throw new ApiError(
        'CONFLICT',
        'Attribute definition is still used by product specs and cannot be deleted.',
        { specs: String(result.counts?.specs ?? 0) },
      )
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
      'The attribute definition payload is invalid.',
      validationFields(parsed.error),
    )
  }
  const result = await updateAttributeDefinition(db, actor, id, parsed.data)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Attribute definition not found.')
  return apiJson({ data: await getAttributeDefinition(db, id) })
})
