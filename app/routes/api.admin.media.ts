import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.media'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { deleteMediaRow, getMediaRow, updateMedia } from '../lib/db/admin-media'

const patchSchema = z.object({
  altText: z.string().trim().max(300).nullable().optional(),
  licenceStatus: z.enum(['owned', 'licensed', 'restricted', 'expired']).optional(),
  expiresAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Must be an ISO date.' })
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
})

/**
 * PATCH / DELETE /api/admin/media/:id (editor+, audited).
 * PATCH updates row metadata (atomically with the product's verdict
 * reset, inside the DAL).
 *
 * DELETE ordering (Stage 04.6, 04.5-F1 — reversed from Stage 04): the
 * D1 row deletion and the product's verdict reset commit FIRST, in one
 * atomic batch inside deleteMediaRow; the R2 object is deleted only
 * after that commit succeeds. R2 is not transactional with D1: a
 * failed object delete leaves an unreferenced orphan (never a dangling
 * row, never a stale verdict), while a failed D1 delete leaves row and
 * object consistently in place.
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid media id.', { id: 'Must be a positive integer.' })

  if (request.method === 'DELETE') {
    const row = await getMediaRow(db, id)
    if (!row) throw new ApiError('NOT_FOUND', 'Media not found.')
    const result = await deleteMediaRow(db, actor, id)
    if (!result.ok) throw new ApiError('NOT_FOUND', 'Media not found.')
    // Best-effort object cleanup AFTER the D1 commit (see header): a
    // failure here leaves an orphan object, which nothing references.
    await (env as Env).MEDIA.delete(row.url_or_key).catch(() => {})
    return apiJson({ data: { deleted: true } })
  }

  if (request.method !== 'PATCH') {
    throw new ApiError('VALIDATION_FAILED', 'Method not allowed on this endpoint.')
  }
  const body = await readJsonBody(request)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The media payload is invalid.', fields)
  }
  const result = await updateMedia(db, actor, id, parsed.data)
  if (!result.ok) throw new ApiError('NOT_FOUND', 'Media not found.')
  return apiJson({ data: { id } })
})
