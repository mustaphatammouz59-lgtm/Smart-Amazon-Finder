import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.category-products'
import { apiJson, withApi } from '../lib/api'
import { assertSpecWhitelist, parseSearchQuery } from '../lib/api-schemas'
import { searchProducts } from '../lib/db/search'
import { fixturesEnabled } from '../lib/db/types'
import { clientIpKey, enforceRateLimit } from '../lib/rate-limit'

/** GET /api/v1/categories/:slug/products — category listing with filters. */
export const loader = withApi(async ({ request, params }: Route.LoaderArgs) => {
  await enforceRateLimit(env, 'search', clientIpKey(request))
  const db = (env as Env).DB as D1Database
  const { query, brands, specFilters } = parseSearchQuery(new URL(request.url).searchParams)
  await assertSpecWhitelist(db, params.slug, specFilters)
  const result = await searchProducts(db, {
    categorySlug: params.slug,
    brandSlugs: brands,
    specFilters,
    priceMinCents: query.priceMin !== undefined ? Math.round(query.priceMin * 100) : undefined,
    priceMaxCents: query.priceMax !== undefined ? Math.round(query.priceMax * 100) : undefined,
    sort: query.sort ?? 'name',
    cursor: query.cursor,
    limit: query.limit,
    includeFixtures: fixturesEnabled(env),
  })
  return apiJson({
    data: result.items,
    facets: result.facets,
    totalEstimate: result.totalEstimate,
    nextCursor: result.nextCursor,
  })
})
