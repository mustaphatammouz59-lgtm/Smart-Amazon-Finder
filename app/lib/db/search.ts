import type { ProductCard, SpecFilter } from './types'
import { decodeCursor, encodeCursor, publicGate, specFilterSql } from './types'
import { displayPrice, getProductOffers } from './offers'
import { freshnessSqlCondition } from '../price-policy'

export interface SearchParams {
  q?: string
  categorySlug?: string
  brandSlugs?: string[]
  specFilters?: SpecFilter[]
  priceMinCents?: number
  priceMaxCents?: number
  sort?: 'relevance' | 'price-asc' | 'price-desc' | 'name'
  cursor?: string | null
  limit?: number
  includeFixtures: boolean
}

export interface SearchResult {
  items: ProductCard[]
  nextCursor: string | null
  totalEstimate: number
  facets: { brands: { slug: string; name: string; count: number }[] }
}

/** Turn free text into a safe FTS5 query: quoted terms, AND semantics. */
export function toFtsQuery(q: string): string {
  const terms = q
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length >= 2 && /[a-z0-9]/.test(t))
    .slice(0, 8)
  return terms.map((t) => `"${t}"`).join(' ')
}

export async function searchProducts(db: D1Database, params: SearchParams): Promise<SearchResult> {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60)
  const offset = decodeCursor(params.cursor)
  const fts = params.q ? toFtsQuery(params.q) : ''
  const binds: unknown[] = []
  const where: string[] = [publicGate('p', params.includeFixtures)]
  let from = 'products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id'
  let rankSelect = 'NULL AS rank'
  if (fts) {
    from += ' JOIN products_fts ON products_fts.rowid = p.id'
    where.push('products_fts MATCH ?')
    binds.push(fts)
    rankSelect = 'bm25(products_fts) AS rank'
  }
  if (params.categorySlug) {
    where.push('c.slug = ?')
    binds.push(params.categorySlug)
  }
  if (params.brandSlugs && params.brandSlugs.length > 0) {
    where.push(`b.slug IN (${params.brandSlugs.map(() => '?').join(',')})`)
    binds.push(...params.brandSlugs)
  }
  if (params.specFilters && params.specFilters.length > 0) {
    where.push(specFilterSql('p', params.specFilters, binds))
  }
  // Price filters apply ONLY over policy-valid prices. This SQL mirrors the
  // ONE shared policy in app/lib/price-policy.ts (Stage 04.2, F-02/F-06/
  // F-07/F-08): licensed + validation-passed + positive price + valid
  // currency + a fresh, non-future observation (freshnessSqlCondition).
  // tests/security/price-policy.test.ts pins JS and SQL to the same verdicts.
  const priceJoin = `
    LEFT JOIN (
      SELECT o.product_id, MIN(o.current_price_cents) AS display_price
        FROM offers o
       WHERE o.licence_status = 'licensed' AND o.validation_status = 'passed'
         AND o.current_price_cents > 0
         AND o.currency GLOB '[A-Z][A-Z][A-Z]'
         AND ${freshnessSqlCondition('o')}
       GROUP BY o.product_id
    ) priced ON priced.product_id = p.id`
  if (params.priceMinCents !== undefined) {
    where.push('priced.display_price >= ?')
    binds.push(params.priceMinCents)
  }
  if (params.priceMaxCents !== undefined) {
    where.push('priced.display_price <= ?')
    binds.push(params.priceMaxCents)
  }

  const countSql = `SELECT COUNT(*) AS n FROM ${from} ${priceJoin} WHERE ${where.join(' AND ')}`
  const countRow = await db
    .prepare(countSql)
    .bind(...binds)
    .first<{ n: number }>()
  const total = countRow?.n ?? 0

  const facetSql = `
    SELECT b.slug AS slug, b.name AS name, COUNT(*) AS n
      FROM ${from} ${priceJoin}
     WHERE ${where.join(' AND ')} AND b.slug IS NOT NULL
     GROUP BY b.slug, b.name ORDER BY n DESC, b.name LIMIT 20`
  const { results: facetRows } = await db
    .prepare(facetSql)
    .bind(...binds)
    .all<{ slug: string; name: string; n: number }>()

  let order = 'p.name ASC, p.id ASC'
  if (params.sort === 'price-asc') order = 'priced.display_price IS NULL, priced.display_price ASC, p.id ASC'
  else if (params.sort === 'price-desc')
    order = 'priced.display_price IS NULL, priced.display_price DESC, p.id ASC'
  else if (fts && (params.sort === undefined || params.sort === 'relevance')) order = 'rank ASC, p.id ASC'

  const pageSql = `
    SELECT p.slug, p.name, b.name AS brand, c.name AS category, c.slug AS category_slug,
           p.editorial_summary AS summary, p.id AS pid, priced.display_price, ${rankSelect}
      FROM ${from} ${priceJoin}
     WHERE ${where.join(' AND ')}
     ORDER BY ${order} LIMIT ? OFFSET ?`
  const { results } = await db
    .prepare(pageSql)
    .bind(...binds, limit + 1, offset)
    .all<Record<string, unknown>>()
  const hasMore = results.length > limit
  const page = hasMore ? results.slice(0, limit) : results

  const items: ProductCard[] = []
  for (const r of page) {
    const offers = await getProductOffers(db, Number(r.pid))
    const price = displayPrice(offers)
    items.push({
      slug: String(r.slug),
      name: String(r.name),
      brand: (r.brand as string | null) ?? null,
      category: String(r.category),
      category_slug: String(r.category_slug),
      summary: (r.summary as string | null) ?? null,
      price_cents: price.price_cents,
      price_observed_at: price.price_observed_at,
    })
  }
  return {
    items,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    totalEstimate: total,
    facets: { brands: facetRows.map((f) => ({ slug: f.slug, name: f.name, count: f.n })) },
  }
}
