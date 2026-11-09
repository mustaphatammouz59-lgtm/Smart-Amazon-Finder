import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.articles'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { createContent, listContent } from '../lib/db/admin-content'

const listQuerySchema = z.object({
  status: z.enum(['draft', 'in_review', 'published', 'archived']).optional(),
  q: z.string().trim().max(120).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
})

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(200),
  metaTitle: z.string().trim().max(200).nullish(),
  metaDescription: z.string().trim().max(500).nullish(),
})

function validationError(message: string, error: z.ZodError): ApiError {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
  return new ApiError('VALIDATION_FAILED', message, fields)
}

/** GET /api/admin/articles — editorial list (editor+). */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'content', 'read', accessConfigFromEnv(env))
  const params = new URL(request.url).searchParams
  const raw: Record<string, string> = {}
  for (const key of ['status', 'q', 'cursor', 'limit']) {
    const value = params.get(key)
    if (value !== null) raw[key] = value
  }
  const parsed = listQuerySchema.safeParse(raw)
  if (!parsed.success) throw validationError('One or more query parameters are invalid.', parsed.error)
  const result = await listContent(db, 'article', parsed.data)
  return apiJson({ data: result.items, nextCursor: result.nextCursor })
})

/** POST /api/admin/articles — create a draft article (editor+, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'content', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) throw validationError('The article payload is invalid.', parsed.error)
  const result = await createContent(db, actor, 'article', {
    slug: parsed.data.slug,
    title: parsed.data.title,
    metaTitle: parsed.data.metaTitle ?? null,
    metaDescription: parsed.data.metaDescription ?? null,
  })
  if ('conflict' in result) {
    throw new ApiError('CONFLICT', 'An article with this slug already exists.')
  }
  return apiJson({ data: { id: result.id, status: 'draft' } }, 201)
})
