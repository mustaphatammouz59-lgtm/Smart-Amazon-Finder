import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.product-alternatives'
import { ApiError, apiJson, withApi } from '../lib/api'
import { getAlternatives } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'

/** GET /api/v1/products/:slug/alternatives — cheaper / better fit / simpler. */
export const loader = withApi(async ({ params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  const result = await getAlternatives(db, params.slug, fixturesEnabled(env))
  if (!result) throw new ApiError('NOT_FOUND', 'Product not found.')
  return apiJson({ data: result })
})
