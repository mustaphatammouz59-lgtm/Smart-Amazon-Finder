import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.product-alternatives'
import { ApiError, apiJson, withApi } from '../lib/api'
import { getAlternatives } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'
import { clientIpKey, enforceRateLimit } from '../lib/rate-limit'

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * GET /api/v1/products/:slug/alternatives — cheaper / better fit / simpler.
 *
 * Stage 04.2 (audit F-03): this endpoint previously had NO rate limit while
 * its DAL fanned out over the whole category. It now shares the public
 * search budget (same abuse class, same binding — no new configuration),
 * rejects slug shapes that can never exist as NOT_FOUND (identical to an
 * unknown product: no existence oracle), and the DAL bounds its scan and
 * result sizes (see catalog.ts getAlternatives).
 */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  await enforceRateLimit(env, 'search', clientIpKey(request))
  if (!params.slug || params.slug.length > 120 || !SLUG_SHAPE.test(params.slug)) {
    throw new ApiError('NOT_FOUND', 'Product not found.')
  }
  const db = (env as Env).DB as D1Database
  const result = await getAlternatives(db, params.slug, fixturesEnabled(env))
  if (!result) throw new ApiError('NOT_FOUND', 'Product not found.')
  return apiJson({ data: result })
})
