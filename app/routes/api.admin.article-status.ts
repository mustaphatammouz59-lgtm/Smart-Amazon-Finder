import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.article-status'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { transitionContent } from '../lib/db/admin-content'

const statusSchema = z.object({
  status: z.enum(['draft', 'in_review', 'published', 'archived']),
})

/**
 * POST /api/admin/articles/:id/status — workflow transition.
 * Publishing requires the 'publish' RBAC action (publisher+); every other
 * transition requires 'write' (editor+). The write check runs first in
 * the standard mutation order; when the target is 'published' the actor
 * is re-checked against the publish action before the DAL is called.
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'content', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid article id.', { id: 'Must be a positive integer.' })
  }
  const body = await readJsonBody(request)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The status payload is invalid.', fields)
  }
  if (parsed.data.status === 'published') {
    await requireAdmin(request, db, 'content', 'publish', accessConfigFromEnv(env))
  }
  const result = await transitionContent(db, actor, 'article', id, parsed.data.status)
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Article not found.')
    throw new ApiError('CONFLICT', 'Publish checklist failed.', { issues: JSON.stringify(result.issues ?? []) })
  }
  return apiJson({ data: { id, status: parsed.data.status } })
})
