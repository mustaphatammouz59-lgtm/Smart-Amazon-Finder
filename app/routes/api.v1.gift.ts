import { env } from 'cloudflare:workers'
import type { Route } from './+types/api.v1.gift'
import { ApiError, apiJson, readJsonBody, withApi } from '../lib/api'
import { clientIpKey, enforceRateLimit } from '../lib/rate-limit'
import { giftFinderSchema } from '../lib/validation'
import { getProductBySlug, listProducts } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'

/**
 * POST /api/v1/gift-finder — shortlist from editorial attributes.
 * Matching is attribute-based (occasion / audience tags assigned by
 * editors), never an AI guess: every item states the attribute it matched.
 * Budget applies only to policy-displayable prices.
 */
export const action = withApi(async ({ request }: Route.ActionArgs) => {
  const db = (env as Env).DB as D1Database
  await enforceRateLimit(env, 'search', clientIpKey(request))
  const body = await readJsonBody(request)
  const parsed = giftFinderSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'body')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'The gift profile is invalid.', fields)
  }
  const profile = parsed.data
  const includeFixtures = fixturesEnabled(env)
  const { items } = await listProducts(db, { limit: 60, includeFixtures })
  const shortlist = []
  for (const item of items) {
    const detail = await getProductBySlug(db, item.slug, includeFixtures)
    if (!detail) continue
    const reasons: string[] = []
    if (detail.attributes.some((a) => a.key === 'occasion' && a.value === profile.occasion)) {
      reasons.push(`Tagged by our editors for '${profile.occasion}' occasions`)
    }
    if (detail.attributes.some((a) => a.key === 'audience' && a.value === profile.recipient)) {
      reasons.push(`Tagged as suitable for a ${profile.recipient}`)
    }
    if (reasons.length === 0) continue
    if (item.price_cents !== null && item.price_cents > profile.budget * 100) continue
    if (item.price_cents !== null) reasons.push('Within your budget at its last observed, licensed price')
    shortlist.push({ ...item, reasons })
  }
  return apiJson({ data: shortlist, profile })
})
