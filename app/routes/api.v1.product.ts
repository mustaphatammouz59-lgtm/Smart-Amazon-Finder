import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.product'
import { ApiError, apiJson, withApi } from '../lib/api'
import { getProductBySlug } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'

/** GET /api/v1/products/:slug — product detail (policy-filtered offers). */
export const loader = withApi(async ({ params }: Route.LoaderArgs) => {
  const db = (env as Env).DB as D1Database
  const detail = await getProductBySlug(db, params.slug, fixturesEnabled(env))
  if (!detail) throw new ApiError('NOT_FOUND', 'Product not found.')
  return apiJson({
    data: {
      slug: detail.product.slug,
      name: detail.product.name,
      brand: detail.brand,
      category: detail.category,
      categorySlug: detail.category_slug,
      modelRef: detail.product.model_ref,
      summary: detail.product.editorial_summary,
      specs: detail.specs.map((s) => ({
        key: s.key,
        label: s.label,
        unit: s.unit,
        value: s.value_number ?? s.value_text ?? (s.value_bool === null ? null : s.value_bool === 1),
        isComparisonCriterion: s.is_comparison_criterion === 1,
      })),
      offers: detail.offers,
      attributes: detail.attributes,
    },
  })
})
