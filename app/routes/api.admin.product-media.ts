import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.product-media'
import { ApiError, apiJson, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { MAX_MEDIA_BYTES, buildMediaKey, sniffImageType, storeMedia } from '../lib/media'
import { addProductMedia, listProductMedia } from '../lib/db/admin-media'

const metaSchema = z.object({
  altText: z.string().trim().max(300).optional(),
  licenceStatus: z.enum(['owned', 'licensed', 'restricted', 'expired']).optional(),
  expiresAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Must be an ISO date.' })
    .optional(),
})

function parseProductId(params: Route.ActionArgs['params']): number {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0)
    throw new ApiError('VALIDATION_FAILED', 'Invalid product id.', { id: 'Must be a positive integer.' })
  return id
}

/** GET /api/admin/products/:id/media — list a product's media (editor+). */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'products', 'read', accessConfigFromEnv(env))
  const productId = parseProductId(params)
  return apiJson({ data: await listProductMedia(db, productId) })
})

/**
 * POST /api/admin/products/:id/media — upload one image (editor+, audited).
 * Multipart form: `file` plus optional altText / licenceStatus / expiresAt.
 * The image type is detected from the file's magic bytes, never from the
 * filename or the client-supplied Content-Type.
 */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'products', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const productId = parseProductId(params)

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    throw new ApiError('VALIDATION_FAILED', 'The upload payload is invalid.', {
      file: 'A file field is required.',
    })
  }
  const rawMeta: Record<string, string> = {}
  for (const key of ['altText', 'licenceStatus', 'expiresAt'] as const) {
    const value = form.get(key)
    if (typeof value === 'string' && value.length > 0) rawMeta[key] = value
  }
  const parsed = metaSchema.safeParse(rawMeta)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The upload payload is invalid.', fields)
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new ApiError('PAYLOAD_TOO_LARGE', `Image exceeds the ${MAX_MEDIA_BYTES}-byte limit.`)
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length > MAX_MEDIA_BYTES) {
    throw new ApiError('PAYLOAD_TOO_LARGE', `Image exceeds the ${MAX_MEDIA_BYTES}-byte limit.`)
  }
  const sniff = sniffImageType(bytes)
  if (!sniff) {
    throw new ApiError('VALIDATION_FAILED', 'The upload payload is invalid.', {
      file: 'Only JPEG, PNG, WebP or GIF images are accepted (detected by content, not filename).',
    })
  }
  const bucket = (env as Env).MEDIA as R2Bucket
  const key = buildMediaKey(productId, sniff.ext)
  // Stage 04.6 (04.5-F1) ordering: the R2 object is uploaded FIRST and
  // the D1 row + verdict reset then commit atomically (addProductMedia
  // batches them). R2 is not transactional with D1: if the D1 commit
  // fails, the uploaded object is removed best-effort; if that cleanup
  // also fails the object stays as an unreferenced orphan under
  // products/<id>/ — harmless, and never publicly reachable, because no
  // product_media row points at it.
  await storeMedia(bucket, key, bytes, sniff.contentType)
  let result: Awaited<ReturnType<typeof addProductMedia>>
  try {
    result = await addProductMedia(db, actor, productId, {
      key,
      altText: parsed.data.altText ?? null,
      licenceStatus: parsed.data.licenceStatus,
      expiresAt: parsed.data.expiresAt ?? null,
    })
  } catch (error) {
    await bucket.delete(key).catch(() => {})
    throw error
  }
  if ('notFound' in result) {
    // Product vanished between auth and insert: do not orphan the object.
    await bucket.delete(key)
    throw new ApiError('NOT_FOUND', 'Product not found.')
  }
  return apiJson({ data: { id: result.id, key } }, 201)
})
