import type { OfferView } from './types'
import { PRICE_FRESHNESS_MS } from './types'

interface OfferRow {
  merchant_slug: string
  merchant_name: string
  destination_url: string
  currency: string
  current_price_cents: number | null
  price_observed_at: string | null
  availability_state: string | null
  licence_status: string
  validation_status: string
}

/**
 * Price policy (DATABASE-DESIGN.md §6.1 + DATA-SOURCING-AND-COMPLIANCE):
 * a price may be displayed ONLY when the offer is validation-passed, its
 * licence permits display ('licensed'), and the observation is inside the
 * 24h freshness window. Otherwise the price is hidden (null) and the UI
 * falls back to "Check price" — the value is never exposed by the API.
 */
export function applyPricePolicy(row: OfferRow, now = Date.now()): OfferView {
  const fresh =
    row.price_observed_at !== null && now - Date.parse(row.price_observed_at + 'Z') <= PRICE_FRESHNESS_MS
  const displayable =
    row.current_price_cents !== null &&
    row.licence_status === 'licensed' &&
    row.validation_status === 'passed' &&
    fresh
  return {
    merchant_slug: row.merchant_slug,
    merchant_name: row.merchant_name,
    destination_url: row.destination_url,
    currency: row.currency,
    price_cents: displayable ? row.current_price_cents : null,
    price_observed_at: displayable ? row.price_observed_at : null,
    availability_state: displayable ? row.availability_state : null,
  }
}

export async function getProductOffers(db: D1Database, productId: number): Promise<OfferView[]> {
  const { results } = await db
    .prepare(
      `SELECT m.slug AS merchant_slug, m.name AS merchant_name, o.destination_url, o.currency,
              o.current_price_cents, o.price_observed_at, o.availability_state,
              o.licence_status, o.validation_status
         FROM offers o JOIN merchants m ON m.id = o.merchant_id
        WHERE o.product_id = ? ORDER BY o.id`,
    )
    .bind(productId)
    .all<OfferRow>()
  return results.map((r) => applyPricePolicy(r))
}

/** The single display price for a product card: min over policy-valid offers. */
export function displayPrice(offers: OfferView[]): {
  price_cents: number | null
  price_observed_at: string | null
} {
  const priced = offers.filter((o) => o.price_cents !== null)
  if (priced.length === 0) return { price_cents: null, price_observed_at: null }
  const best = priced.reduce((a, b) => ((a.price_cents ?? 0) <= (b.price_cents ?? 0) ? a : b))
  return { price_cents: best.price_cents, price_observed_at: best.price_observed_at }
}
