import type { OfferView } from './types'
import { evaluatePriceDisplay } from '../price-policy'
import { isAllowedDestinationUrl } from '../url-policy'

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
 * Price policy (DATABASE-DESIGN.md §6.1 + DATA-SOURCING-AND-COMPLIANCE): a
 * price may be displayed ONLY when the offer is validation-passed, its
 * licence permits display ('licensed'), and the observation is inside the
 * 24h freshness window. Otherwise the price is hidden (null) and the UI
 * falls back to "Check price" — the value is never exposed by the API.
 *
 * Stage 04.2 (audit F-02/F-06/F-07/F-08): the decision itself now lives in
 * exactly one place — app/lib/price-policy.ts evaluatePriceDisplay — shared
 * with the admin explanation, offer validation, and the SQL search filter.
 * This wrapper only shapes the decision into the public view.
 *
 * Stage 04.2 (audit F-04): destination_url is exposed only when the offer
 * passed validation AND the URL passes the centralized outbound policy
 * (app/lib/url-policy.ts); otherwise it is null — a stored legacy value
 * must never reach a public response because validation was skipped.
 */
export function applyPricePolicy(row: OfferRow, now = Date.now()): OfferView {
  const decision = evaluatePriceDisplay(row, now)
  const displayable = decision.displayable
  return {
    merchant_slug: row.merchant_slug,
    merchant_name: row.merchant_name,
    destination_url:
      row.validation_status === 'passed' && isAllowedDestinationUrl(row.destination_url)
        ? row.destination_url
        : null,
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
