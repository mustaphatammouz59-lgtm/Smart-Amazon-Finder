import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.search'
import { ApiError, apiJson, requestId, withApi } from '../lib/api'
import { assertSpecWhitelist, parseSearchQuery } from '../lib/api-schemas'
import { searchProducts } from '../lib/db/search'
import { listProducts } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'
import { clientIpKey, enforceRateLimit } from '../lib/rate-limit'

/**
 * GET /api/v1/search — keyword (FTS5) + faceted search over the public
 * catalog. Returns only published + validation-passed products; prices
 * appear only when the licence/freshness policy allows (see db/offers).
 */
export const loader = withApi(async ({ request }: Route.LoaderArgs) => {
  await enforceRateLimit(env, 'search', clientIpKey(request))
  const db = (env as Env).DB as D1Database
  const params = new URL(request.url).searchParams
  const { query, brands, specFilters } = parseSearchQuery(params)
  await assertSpecWhitelist(db, query.category, specFilters)
  const includeFixtures = fixturesEnabled(env)
  const common = {
    categorySlug: query.category,
    brandSlugs: brands,
    specFilters,
    priceMinCents: query.priceMin !== undefined ? Math.round(query.priceMin * 100) : undefined,
    priceMaxCents: query.priceMax !== undefined ? Math.round(query.priceMax * 100) : undefined,
    cursor: query.cursor,
    limit: query.limit,
    includeFixtures,
  }
  const result = query.q
    ? await searchProducts(db, { ...common, q: query.q, sort: query.sort })
    : await (async () => {
        const listed = await listProducts(db, { ...common, sort: 'name' })
        return { ...listed, totalEstimate: listed.items.length, facets: { brands: [] } }
      })()
  return apiJson({
    data: result.items,
    facets: result.facets,
    totalEstimate: result.totalEstimate,
    nextCursor: result.nextCursor,
    searchId: requestId(),
  })
})

export function action(): never {
  throw new ApiError('VALIDATION_FAILED', 'Method not allowed on this endpoint.')
}
