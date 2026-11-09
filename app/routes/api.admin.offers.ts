import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Route } from './+types/api.admin.offers'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { requireAdmin } from '../lib/auth'
import { accessConfigFromEnv } from '../lib/access'
import { assertSameOrigin } from '../lib/origin'
import { enforceRateLimit } from '../lib/rate-limit'
import { createOffer, listAdminOffers } from '../lib/db/admin-commerce'
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

const createSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  merchantId: z.number().int().positive(),
  programId: z.number().int().positive().nullable().optional(),
  merchantItemRef: z.string().trim().max(160).nullable().optional(),
  destinationUrl: destinationUrlField,
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default('USD'),
  // F-06: a stored price must be positive; null stays allowed (link-only).
  currentPriceCents: z.number().int().positive().nullable().optional(),
  priceObservedAt: z.string().trim().max(40).nullable().optional(),
  availabilityState: z.enum(['in_stock', 'low', 'out', 'unknown']).nullable().optional(),
  licenceStatus: z.enum(['owned', 'licensed', 'restricted', 'expired']).optional(),
})

function parsePositiveInt(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (raw === null) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError('VALIDATION_FAILED', `Invalid ${key} parameter.`, {
      [key]: 'Must be a positive integer.',
    })
  }
  return value
}

/** GET /api/admin/offers — list offers with filters + price-display state. */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  await requireAdmin(request, db, 'offers', 'read', accessConfigFromEnv(env))
  const params = new URL(request.url).searchParams
  const validationStatus = params.get('validationStatus') ?? undefined
  if (
    validationStatus !== undefined &&
    !['pending', 'passed', 'failed'].includes(validationStatus)
  ) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid validationStatus parameter.', {
      validationStatus: 'Must be pending, passed or failed.',
    })
  }
  const licenceStatus = params.get('licenceStatus') ?? undefined
  if (
    licenceStatus !== undefined &&
    !['owned', 'licensed', 'restricted', 'expired'].includes(licenceStatus)
  ) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid licenceStatus parameter.', {
      licenceStatus: 'Must be owned, licensed, restricted or expired.',
    })
  }
  let limit: number | undefined
  const limitRaw = params.get('limit')
  if (limitRaw !== null) {
    limit = Number(limitRaw)
    if (!Number.isInteger(limit)) {
      throw new ApiError('VALIDATION_FAILED', 'Invalid limit parameter.', {
        limit: 'Must be an integer.',
      })
    }
  }
  const result = await listAdminOffers(db, {
    productId: parsePositiveInt(params, 'productId'),
    merchantId: parsePositiveInt(params, 'merchantId'),
    validationStatus,
    licenceStatus,
    cursor: params.get('cursor') ?? undefined,
    limit,
  })
  return apiJson({ data: result.items, nextCursor: result.nextCursor })
})

/** POST /api/admin/offers — create an offer (editor+, audited). */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  const actor = await requireAdmin(request, db, 'offers', 'write', accessConfigFromEnv(env))
  await enforceRateLimit(env, 'adminWrite', actor.email)
  assertSameOrigin(request)
  const body = await readJsonBody(request)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The offer payload is invalid.', fields)
  }
  const result = await createOffer(db, actor, parsed.data)
  if ('conflict' in result) {
    // DAL-level field rejections (defence in depth behind the schemas).
    if (result.conflict === 'invalid_destination') {
      throw new ApiError('VALIDATION_FAILED', 'The destination URL is not an allowed public https URL.', {
        destinationUrl: 'Must be an https URL without credentials or private hosts.',
      })
    }
    if (result.conflict === 'invalid_currency') {
      throw new ApiError('VALIDATION_FAILED', 'The currency is invalid.', {
        currency: 'Must be a three-letter uppercase ISO code.',
      })
    }
    if (result.conflict === 'invalid_price') {
      throw new ApiError('VALIDATION_FAILED', 'The price is invalid.', {
        currentPriceCents: 'Must be a positive integer number of cents, or null.',
      })
    }
    if (result.conflict === 'invalid_observed_at') {
      throw new ApiError('VALIDATION_FAILED', 'The price observation timestamp is invalid.', {
        priceObservedAt: 'Must be an ISO 8601 or SQLite UTC datetime the shared price parser accepts.',
      })
    }
    const messages = {
      duplicate: 'An offer already exists for this product, variant and merchant.',
      unknown_product: 'The referenced product does not exist.',
      unknown_merchant: 'The referenced merchant does not exist.',
      unknown_program: 'The referenced affiliate program does not exist.',
      unknown_variant: 'The referenced variant does not exist for this product.',
    } as const
    throw new ApiError('CONFLICT', messages[result.conflict])
  }
  return apiJson({ data: { id: result.id } }, 201)
})
