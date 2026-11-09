import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.offer'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { deleteOffer, getAdminOffer, updateOffer } from '../lib/db/admin-commerce'
import { validateDestinationUrl } from '../lib/url-policy'

/** Stage 04.2 (F-04): schema-level application of the centralized outbound
 *  URL policy — the DAL enforces the same policy for non-API callers. */
const destinationUrlField = z
  .string()
  .max(2000)
  .superRefine((value, ctx) => {
    const result = validateDestinationUrl(value)
    if (!result.ok) {
      ctx.addIssue({
        code: 'custom',
        message: `Destination URL is not an allowed public https URL (${result.reason}).`,
      })
    }
  })

const patchSchema = z.object({
  productId: z.number().int().positive().optional(),
  variantId: z.number().int().positive().nullable().optional(),
  merchantId: z.number().int().positive().optional(),
  programId: z.number().int().positive().nullable().optional(),
  merchantItemRef: z.string().trim().max(160).nullable().optional(),
  destinationUrl: destinationUrlField.optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  // F-06: a stored price must be positive; null stays allowed (link-only).
  currentPriceCents: z.number().int().positive().nullable().optional(),
  priceObservedAt: z.string().trim().max(40).nullable().optional(),
  availabilityState: z.enum(['in_stock', 'low', 'out', 'unknown']).nullable().optional(),
  licenceStatus: z.enum(['owned', 'licensed', 'restricted', 'expired']).optional(),
})

function parseId(params: { id?: string }): number {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid offer id.', {
      id: 'Must be a positive integer.',
    })
  }
  return id
}

/** GET /api/admin/offers/:id — one offer with price-display state. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'offers', 'read', accessConfigFromEnv(env))
  const id = parseId(params)
  const offer = await getAdminOffer(db, id)
  if (!offer) throw new ApiError('NOT_FOUND', 'Offer not found.')
  return apiJson({ data: offer })
})

/** PATCH / DELETE /api/admin/offers/:id — update, or delete when no history. */
export const action = withApi(async ({ request, params }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'offers', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const id = parseId(params)
  if (request.method === 'DELETE') {
    const result = await deleteOffer(db, actor, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Offer not found.')
      throw new ApiError(
        'CONFLICT',
        `Offer has ${result.history} price history row(s) and cannot be deleted.`,
      )
    }
    return apiJson({ data: { id, deleted: true } })
  }
  const body = await readJsonBody(request)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The offer payload is invalid.', fields)
  }
  const result = await updateOffer(db, actor, id, parsed.data)
  if (!result.ok) {
    if (result.reason === 'not_found') throw new ApiError('NOT_FOUND', 'Offer not found.')
    if (result.reason === 'unknown_program') {
      throw new ApiError('CONFLICT', 'The referenced affiliate program does not exist.')
    }
    // DAL-level field rejections (defence in depth behind the schemas).
    if (result.reason === 'invalid_destination') {
      throw new ApiError('VALIDATION_FAILED', 'The destination URL is not an allowed public https URL.', {
        destinationUrl: 'Must be an https URL without credentials or private hosts.',
      })
    }
    if (result.reason === 'invalid_currency') {
      throw new ApiError('VALIDATION_FAILED', 'The currency is invalid.', {
        currency: 'Must be a three-letter uppercase ISO code.',
      })
    }
    if (result.reason === 'invalid_price') {
      throw new ApiError('VALIDATION_FAILED', 'The price is invalid.', {
        currentPriceCents: 'Must be a positive integer number of cents, or null.',
      })
    }
    if (result.reason === 'invalid_observed_at') {
      throw new ApiError('VALIDATION_FAILED', 'The price observation timestamp is invalid.', {
        priceObservedAt: 'Must be an ISO 8601 or SQLite UTC datetime the shared price parser accepts.',
      })
    }
    throw new ApiError('CONFLICT', 'An offer already exists for this product, variant and merchant.')
  }
  return apiJson({ data: { id } })
})
