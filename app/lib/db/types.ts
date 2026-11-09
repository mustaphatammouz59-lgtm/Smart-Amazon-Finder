/**
 * Catalog data-access types (Stage 03). The DAL in app/lib/db is the ONLY
 * path from application code to catalog tables (DATABASE-DESIGN.md §6.2).
 */

export interface ProductRow {
  id: number
  category_id: number
  brand_id: number | null
  slug: string
  name: string
  model_ref: string | null
  editorial_summary: string | null
  status: string
  validation_status: string
  source_id: string
  licence_status: string
  created_at: string
  updated_at: string
}

export interface SpecValue {
  key: string
  label: string
  unit: string | null
  value_type: 'number' | 'text' | 'bool'
  value_number: number | null
  value_text: string | null
  value_bool: number | null
  is_comparison_criterion: number
}

export interface OfferView {
  merchant_slug: string
  merchant_name: string
  /** Non-null ONLY when the offer passed validation AND the URL passes the
   *  outbound policy (Stage 04.2, audit F-04) — see db/offers.ts. */
  destination_url: string | null
  currency: string
  /** Non-null ONLY when the price policy allows display (see offers.ts). */
  price_cents: number | null
  price_observed_at: string | null
  availability_state: string | null
}

export interface ProductCard {
  slug: string
  name: string
  brand: string | null
  category: string
  category_slug: string
  summary: string | null
  price_cents: number | null
  price_observed_at: string | null
}

/** Licence freshness window for price display: 24 hours (compliance doc). */
export const PRICE_FRESHNESS_MS = 24 * 60 * 60 * 1000

/**
 * Development fixtures (source_id='dev-fixture') are excluded from every
 * public query unless the Worker variable DEV_FIXTURES is exactly
 * 'enabled'. The production configuration never sets it.
 */
export function fixturesEnabled(env: unknown): boolean {
  return (env as Record<string, unknown> | null)?.DEV_FIXTURES === 'enabled'
}

/** SQL fragment + binds implementing the public gate (integrity rule 2). */
export function publicGate(alias: string, includeFixtures: boolean): string {
  const base = `${alias}.status = 'published' AND ${alias}.validation_status = 'passed'`
  return includeFixtures ? base : `${base} AND ${alias}.source_id != 'dev-fixture'`
}

export interface SpecFilter {
  key: string
  min?: number
  max?: number
  bool?: boolean
  text?: string
}

/** One EXISTS clause per spec filter; definitions are whitelisted by category. */
export function specFilterSql(alias: string, filters: SpecFilter[], binds: unknown[]): string {
  return filters
    .map((f) => {
      const conds: string[] = [
        `ps.definition_id = (SELECT id FROM attribute_definitions WHERE category_id = ${alias}.category_id AND key = ?)`,
      ]
      binds.push(f.key)
      if (f.min !== undefined) {
        conds.push('ps.value_number >= ?')
        binds.push(f.min)
      }
      if (f.max !== undefined) {
        conds.push('ps.value_number <= ?')
        binds.push(f.max)
      }
      if (f.bool !== undefined) {
        conds.push('ps.value_bool = ?')
        binds.push(f.bool ? 1 : 0)
      }
      if (f.text !== undefined) {
        conds.push('ps.value_text = ?')
        binds.push(f.text)
      }
      return `EXISTS (SELECT 1 FROM product_specs ps WHERE ps.product_id = ${alias}.id AND ${conds.join(' AND ')})`
    })
    .join(' AND ')
}

export function encodeCursor(offset: number): string {
  return btoa(JSON.stringify({ o: offset }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0
  try {
    const json = atob(cursor.replaceAll('-', '+').replaceAll('_', '/'))
    const parsed = JSON.parse(json) as { o?: unknown }
    return typeof parsed.o === 'number' && parsed.o >= 0 ? Math.floor(parsed.o) : 0
  } catch {
    return 0
  }
}
