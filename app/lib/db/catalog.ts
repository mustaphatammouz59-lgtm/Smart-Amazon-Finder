import type { ProductCard, ProductRow, SpecFilter, SpecValue } from './types'
import { decodeCursor, encodeCursor, publicGate, specFilterSql } from './types'
import { displayPrice, getProductOffers } from './offers'

export interface ListParams {
  categorySlug?: string
  brandSlugs?: string[]
  specFilters?: SpecFilter[]
  sort?: 'name' | 'newest'
  cursor?: string | null
  limit?: number
  includeFixtures: boolean
}

export interface ListResult {
  items: ProductCard[]
  nextCursor: string | null
}

const CARD_SELECT = `
  SELECT p.slug, p.name, b.name AS brand, c.name AS category, c.slug AS category_slug,
         p.editorial_summary AS summary, p.id AS pid
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id`

async function toCards(db: D1Database, rows: Array<Record<string, unknown>>): Promise<ProductCard[]> {
  const cards: ProductCard[] = []
  for (const r of rows) {
    const offers = await getProductOffers(db, Number(r.pid))
    const price = displayPrice(offers)
    cards.push({
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
  return cards
}

/** Category listing + faceted browse (no keyword). Public gate enforced. */
export async function listProducts(db: D1Database, params: ListParams): Promise<ListResult> {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60)
  const offset = decodeCursor(params.cursor)
  const binds: unknown[] = []
  const where: string[] = [publicGate('p', params.includeFixtures)]
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
  const order = params.sort === 'newest' ? 'p.created_at DESC, p.id DESC' : 'p.name ASC, p.id ASC'
  const sql = `${CARD_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`
  binds.push(limit + 1, offset)
  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<Record<string, unknown>>()
  const hasMore = results.length > limit
  const page = hasMore ? results.slice(0, limit) : results
  return {
    items: await toCards(db, page),
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }
}

export interface ProductDetail {
  product: ProductRow
  brand: string | null
  category: string
  category_slug: string
  specs: SpecValue[]
  offers: Awaited<ReturnType<typeof getProductOffers>>
  attributes: { key: string; value: string }[]
}

export async function getProductBySlug(
  db: D1Database,
  slug: string,
  includeFixtures: boolean,
): Promise<ProductDetail | null> {
  const row = await db
    .prepare(
      `SELECT p.*, b.name AS brand_name, c.name AS category_name, c.slug AS category_slug
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.slug = ? AND ${publicGate('p', includeFixtures)}`,
    )
    .bind(slug)
    .first<ProductRow & { brand_name: string | null; category_name: string; category_slug: string }>()
  if (!row) return null
  const { results: specs } = await db
    .prepare(
      `SELECT d.key, d.label, d.unit, d.value_type, s.value_number, s.value_text, s.value_bool,
              d.is_comparison_criterion
         FROM product_specs s JOIN attribute_definitions d ON d.id = s.definition_id
        WHERE s.product_id = ? ORDER BY d.sort_weight DESC, d.label`,
    )
    .bind(row.id)
    .all<SpecValue>()
  const { results: attributes } = await db
    .prepare('SELECT key, value FROM product_attributes WHERE product_id = ? ORDER BY key, value')
    .bind(row.id)
    .all<{ key: string; value: string }>()
  return {
    product: row,
    brand: row.brand_name,
    category: row.category_name,
    category_slug: row.category_slug,
    specs,
    offers: await getProductOffers(db, row.id),
    attributes,
  }
}

/**
 * Alternatives from specification deltas (UX spec §3.6):
 * - cheaper: a policy-valid (licensed, fresh) lower price — empty until real
 *   licensed prices exist; never estimated.
 * - better fit: same category, strictly more comparison-criterion specs.
 * - simpler: same category, strictly fewer specs overall.
 */
export async function getAlternatives(
  db: D1Database,
  slug: string,
  includeFixtures: boolean,
): Promise<{ cheaper: ProductCard[]; betterFit: ProductCard[]; simpler: ProductCard[] } | null> {
  const lead = await getProductBySlug(db, slug, includeFixtures)
  if (!lead) return null
  const leadPrice = displayPrice(lead.offers).price_cents
  const { results: peers } = await db
    .prepare(
      `SELECT p.slug FROM products p
        WHERE p.category_id = ? AND p.id != ? AND ${publicGate('p', includeFixtures)}`,
    )
    .bind(lead.product.category_id, lead.product.id)
    .all<{ slug: string }>()
  const criterionCount = (d: ProductDetail) => d.specs.filter((s) => s.is_comparison_criterion === 1).length
  const cheaper: ProductCard[] = []
  const betterFit: ProductCard[] = []
  const simpler: ProductCard[] = []
  for (const peer of peers) {
    const detail = await getProductBySlug(db, peer.slug, includeFixtures)
    if (!detail) continue
    const card: ProductCard = {
      slug: detail.product.slug,
      name: detail.product.name,
      brand: detail.brand,
      category: detail.category,
      category_slug: detail.category_slug,
      summary: detail.product.editorial_summary,
      ...displayPrice(detail.offers),
    }
    const peerPrice = displayPrice(detail.offers).price_cents
    if (leadPrice !== null && peerPrice !== null && peerPrice < leadPrice) cheaper.push(card)
    if (criterionCount(detail) > criterionCount(lead)) betterFit.push(card)
    if (detail.specs.length < lead.specs.length) simpler.push(card)
  }
  return { cheaper, betterFit, simpler }
}
