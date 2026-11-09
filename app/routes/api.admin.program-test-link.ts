import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.program-test-link'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { buildSampleLink, getProgram } from '../lib/db/admin-commerce'

const bodySchema = z.object({
  destination: z.string().url().max(2000).optional(),
})

const SAMPLE_DEFAULT = 'https://example.invalid/product'

/**
 * POST /api/admin/programs/:id/test-link — render a sample outbound link
 * from the program's template using the sample destination the admin
 * typed (or a clearly-invalid placeholder when omitted). Preview only:
 * nothing is stored and nothing is activated.
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'programs', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid program id.', {
      id: 'Must be a positive integer.',
    })
  }
  const body = await readJsonBody(request)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The test-link payload is invalid.', fields)
  }
  const program = await getProgram(db, id)
  if (!program) throw new ApiError('NOT_FOUND', 'Program not found.')
  const result = buildSampleLink(program, parsed.data.destination ?? SAMPLE_DEFAULT)
  if (!result.ok) {
    throw new ApiError('VALIDATION_FAILED', result.reason, { linkTemplate: result.reason })
  }
  return apiJson({ data: { url: result.url } })
})
