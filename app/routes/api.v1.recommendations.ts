import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.recommendations'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { clientIpKey, enforceRateLimit } from '../lib/rate-limit'
import { productFinderSchema } from '../lib/validation'
import { getProductBySlug, listProducts } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'

/**
 * POST /api/v1/recommendations — rule-scored finder results.
 * Scoring is transparent and spec-based: criterion coverage first, then the
 * visitor's stated priority mapped to published criteria. The budget is
 * applied ONLY when a product has a policy-displayable price; otherwise the
 * response says so (never estimated, never invented).
 */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  await enforceRateLimit(env, 'search', clientIpKey(request))
  const body = await readJsonBody(request)
  const parsed = productFinderSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The finder profile is invalid.', fields)
  }
  const profile = parsed.data
  const includeFixtures = fixturesEnabled(env)
  const categorySlug = profile.category === 'home-office' ? 'home-office' : 'electronics-accessories'
  const { items } = await listProducts(db, { categorySlug, limit: 60, includeFixtures })
  const priorityKeys: Record<string, string[]> = {
    durability: ['warranty_years', 'max_load_kg', 'safety_certified'],
    performance: ['power_delivery_w', 'usb_c_ports'],
    design: ['height_adjustable'],
    value: [],
  }
  const scored = []
  for (const item of items) {
    const detail = await getProductBySlug(db, item.slug, includeFixtures)
    if (!detail) continue
    const reasons: string[] = []
    const criterionSpecs = detail.specs.filter((s) => s.is_comparison_criterion === 1)
    let score = criterionSpecs.length * 10
    for (const key of priorityKeys[profile.priority] ?? []) {
      if (detail.specs.some((s) => s.key === key)) {
        score += 5
        reasons.push(`Covers the '${key}' criterion you prioritised`)
      }
    }
    if (criterionSpecs.length > 0) reasons.push(`Assessed on ${criterionSpecs.length} published criteria`)
    let budgetNote: string | null = null
    if (item.price_cents !== null) {
      if (item.price_cents <= profile.budget * 100) {
        score += 8
        reasons.push('Within your budget at its last observed, licensed price')
      } else {
        score -= 8
        reasons.push('Above your budget at its last observed, licensed price')
      }
    } else {
      budgetNote = 'Budget not applied: no licensed, in-window price is published for this product.'
    }
    scored.push({ ...item, score, reasons, budgetNote })
  }
  scored.sort((a, b) => b.score - a.score)
  return apiJson({ data: scored, profile })
})
