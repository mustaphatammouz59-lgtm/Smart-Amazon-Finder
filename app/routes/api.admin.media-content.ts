import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.admin.media-content'
import { ApiError, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { getMediaRow } from '../lib/db/admin-media'

/**
 * GET /api/admin/media/:id/content — admin preview of the stored R2
 * object (editor+). Served private/no-store and inline; this is the
 * only read path for uploaded originals (the bucket is not public).
 */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'products', 'read', accessConfigFromEnv(env))
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid media id.', { id: 'Must be a positive integer.' })
  const row = await getMediaRow(db, id)
  if (!row) throw new ApiError('NOT_FOUND', 'Media not found.')
  const object = await (env as Env).MEDIA.get(row.url_or_key)
  if (!object) throw new ApiError('NOT_FOUND', 'Media object not found.')
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
    },
  })
})
