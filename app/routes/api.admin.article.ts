import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.article'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { contentChecklist, getContent, updateContent } from '../lib/db/admin-content'
import type { ContentBlock } from '../lib/sanitize'
import { parseBodyBlocks } from '../lib/sanitize'

const patchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  metaTitle: z.string().trim().max(200).nullish(),
  metaDescription: z.string().trim().max(500).nullish(),
  bodyBlocks: z.unknown().optional(),
})

function parseId(params: { id?: string }): number {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid article id.', { id: 'Must be a positive integer.' })
  }
  return id
}

/** GET /api/admin/articles/:id — detail + publish checklist (editor+). */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'content', 'read', accessConfigFromEnv(env))
  const id = parseId(params)
  const row = await getContent(db, 'article', id)
  if (!row) throw new ApiError('NOT_FOUND', 'Article not found.')
  // Stored bodies are JSON block arrays. A corrupt stored value degrades
  // to an empty body plus a flag — the detail endpoint never throws on it.
  let bodyBlocks: ContentBlock[] = []
  let bodyParseError = false
  if (row.body_blocks) {
    try {
      bodyBlocks = parseBodyBlocks(JSON.parse(row.body_blocks) as unknown)
    } catch {
      bodyBlocks = []
      bodyParseError = true
    }
  }
  const checklist = await contentChecklist(db, 'article', id)
  return apiJson({ data: { ...row, body_blocks: bodyBlocks, body_parse_error: bodyParseError, checklist } })
})

/**
 * PATCH /api/admin/articles/:id — update title/meta/body (editor+, audited).
 * No DELETE for content: archive via the status endpoint instead.
 *
 * Body cap: readJsonBody is called with 256 KB here (not the 16 KB API
 * default) because block content legitimately exceeds 16 KB — up to 200
 * blocks of structured text. The API doc sets no per-endpoint body-size
 * schedule, so the larger cap is local to content saves.
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'content', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params)
  const body = await readJsonBody(request, 256 * 1024)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The article payload is invalid.', fields)
  }
  let bodyBlocks: ContentBlock[] | undefined
  if (parsed.data.bodyBlocks !== undefined) {
    try {
      bodyBlocks = parseBodyBlocks(parsed.data.bodyBlocks)
    } catch {
      throw new ApiError('VALIDATION_FAILED', 'The article payload is invalid.', { bodyBlocks: 'Invalid body blocks.' })
    }
  }
  const result = await updateContent(db, actor, 'article', id, {
    title: parsed.data.title,
    metaTitle: parsed.data.metaTitle,
    metaDescription: parsed.data.metaDescription,
    bodyBlocks,
  })
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Article not found.')
  return apiJson({ data: { id } })
})
