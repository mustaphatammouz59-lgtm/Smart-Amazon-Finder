// Stage 05.1 (D) — SEO indexability: lawful-offer product fix +
// category indexability (SEO-STRATEGY.md §6).
//
// Regression context: productIndexability previously required a
// price-DISPLAYABLE offer. Under the Stage 05 link-out model offers
// store no price, so every offered product computed non-indexable
// forever. §6 requires a LAWFUL offer (or editorial-only), and a
// price-less offer with validation 'passed' + a policy-valid https
// destination is lawful (offer validation: 'no_price' is a warning).
import { describe, expect, it } from 'vitest'
import { categoryIndexability, productIndexability } from '../app/lib/product-validation'
import { loader as robotsLoader } from '../app/routes/robots.txt.tsx'
import { freshCatalogDb } from './helpers/sqlite-d1'

type Raw = ReturnType<typeof freshCatalogDb>['raw']

const LAWFUL_REASON = 'No lawful offer is available.'
const GUIDE_REASON =
  'No buying guide or completed "how to choose" block is linked yet (arrives with the content stage).'

function idBySlug(raw: Raw, table: 'categories' | 'products' | 'merchants', slug: string): number {
  const row = raw.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug) as { id: number } | undefined
  if (!row) throw new Error(`${table} row ${slug} missing`)
  return row.id
}

interface ProductOpts {
  slug: string
  categorySlug?: string
  status?: string
  validationStatus?: string
  summary?: string | null
  withSpec?: boolean
}

function addProduct(raw: Raw, opts: ProductOpts): number {
  const categoryId = idBySlug(raw, 'categories', opts.categorySlug ?? 'home-office')
  raw
    .prepare(
      `INSERT INTO products (category_id, slug, name, editorial_summary, status, validation_status, licence_status)
       VALUES (?, ?, ?, ?, ?, ?, 'owned')`,
    )
    .run(
      categoryId,
      opts.slug,
      `Product ${opts.slug}`,
      opts.summary === undefined ? 'A complete editorial summary.' : opts.summary,
      opts.status ?? 'published',
      opts.validationStatus ?? 'passed',
    )
  const id = idBySlug(raw, 'products', opts.slug)
  if (opts.withSpec ?? true) {
    // Only the seeded home-office dictionary is used for specs; callers
    // seeding products in ad-hoc categories pass withSpec: false.
    const def = raw.prepare("SELECT id FROM attribute_definitions WHERE key = 'warranty_years'").get() as
      | { id: number }
      | undefined
    if (!def) throw new Error('warranty_years definition missing')
    raw
      .prepare('INSERT INTO product_specs (product_id, definition_id, value_number) VALUES (?, ?, ?)')
      .run(id, def.id, 2)
  }
  return id
}

interface OfferOpts {
  destinationUrl?: string
  validationStatus?: string
  priceCents?: number | null
  priceObservedAt?: string | null
  licenceStatus?: string
}

function addOffer(raw: Raw, productId: number, opts: OfferOpts = {}): void {
  const merchantId = idBySlug(raw, 'merchants', 'devmerchant')
  raw
    .prepare(
      `INSERT INTO offers (product_id, merchant_id, destination_url, currency,
                           current_price_cents, price_observed_at, licence_status, validation_status)
       VALUES (?, ?, ?, 'USD', ?, ?, ?, ?)`,
    )
    .run(
      productId,
      merchantId,
      opts.destinationUrl ?? 'https://example.com/item',
      opts.priceCents ?? null,
      opts.priceObservedAt ?? null,
      opts.licenceStatus ?? 'restricted',
      opts.validationStatus ?? 'passed',
    )
}

function addCategory(raw: Raw, slug: string, description: string | null): number {
  raw
    .prepare('INSERT INTO categories (slug, name, description) VALUES (?, ?, ?)')
    .run(slug, `Category ${slug}`, description)
  return idBySlug(raw, 'categories', slug)
}

describe('productIndexability — lawful-offer fix (Stage 05.1)', () => {
  it('(1) regression: link-only offer (passed, valid https, price NULL) is indexable', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-link-only' })
    addOffer(raw, id, { priceCents: null })
    const result = await productIndexability(db, id)
    expect(result).toEqual({ indexable: true, reasons: [] })
  })

  it('(2) draft product (otherwise complete) is not indexable', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-draft', status: 'draft' })
    addOffer(raw, id)
    const result = await productIndexability(db, id)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain('Product is not published.')
  })

  it('(3) validation_status failed product is not indexable', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-failed', validationStatus: 'failed' })
    addOffer(raw, id)
    const result = await productIndexability(db, id)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain('Validation has not passed.')
  })

  it('(4a) published+passed without an editorial summary is not indexable', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-no-summary', summary: null })
    addOffer(raw, id)
    const result = await productIndexability(db, id)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain('Editorial summary is missing.')
  })

  it('(4b) published+passed with summary but zero specs is not indexable', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-no-specs', withSpec: false })
    addOffer(raw, id)
    const result = await productIndexability(db, id)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain('Product has no specifications.')
  })

  it('(5a) only offer with validation_status failed → lawful-offer reason', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-offer-failed' })
    addOffer(raw, id, { validationStatus: 'failed' })
    const result = await productIndexability(db, id)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain(LAWFUL_REASON)
  })

  it('(5b) only offer with a non-https destination → lawful-offer reason', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-offer-http' })
    addOffer(raw, id, { destinationUrl: 'http://example.com/item' })
    const result = await productIndexability(db, id)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain(LAWFUL_REASON)
  })

  it('(5c) stale price (48h old, licensed, passed) does not affect lawfulness', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-stale-price' })
    const stale = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    addOffer(raw, id, { priceCents: 4999, priceObservedAt: stale, licenceStatus: 'licensed' })
    const result = await productIndexability(db, id)
    expect(result).toEqual({ indexable: true, reasons: [] })
  })

  it('(6) zero-offer published+passed product is indexable (editorial-only path)', async () => {
    const { db, raw } = freshCatalogDb()
    const id = addProduct(raw, { slug: 'seo-editorial-only' })
    const result = await productIndexability(db, id)
    expect(result).toEqual({ indexable: true, reasons: [] })
  })

  it('returns null for a nonexistent product', async () => {
    const { db } = freshCatalogDb()
    expect(await productIndexability(db, 999999)).toBeNull()
  })
})

describe('categoryIndexability (Stage 05.1, SEO §6)', () => {
  it('(7a) 4 published+passed products → count reason naming found vs required', async () => {
    const { db, raw } = freshCatalogDb()
    const catId = addCategory(raw, 'seo-cat-four', 'Original intro copy.')
    for (let i = 1; i <= 4; i++) {
      addProduct(raw, { slug: `seo-cat-four-p${i}`, categorySlug: 'seo-cat-four', withSpec: false })
    }
    // Non-qualifying rows must not count toward the 5.
    addProduct(raw, {
      slug: 'seo-cat-four-draft',
      categorySlug: 'seo-cat-four',
      status: 'draft',
      withSpec: false,
    })
    addProduct(raw, {
      slug: 'seo-cat-four-failed',
      categorySlug: 'seo-cat-four',
      validationStatus: 'failed',
      withSpec: false,
    })
    const result = await categoryIndexability(db, catId)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain('Category has 4 published, validated products; 5 are required.')
  })

  it('(7b) 5 published+passed products → no count/intro reason, guide reason still blocks', async () => {
    const { db, raw } = freshCatalogDb()
    const catId = addCategory(raw, 'seo-cat-five', 'Original intro copy.')
    for (let i = 1; i <= 5; i++) {
      addProduct(raw, { slug: `seo-cat-five-p${i}`, categorySlug: 'seo-cat-five', withSpec: false })
    }
    const result = await categoryIndexability(db, catId)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toEqual([GUIDE_REASON])
  })

  it('(7c) empty description → intro-copy reason present', async () => {
    const { db, raw } = freshCatalogDb()
    const catId = addCategory(raw, 'seo-cat-blank', '   ')
    const result = await categoryIndexability(db, catId)
    expect(result?.indexable).toBe(false)
    expect(result?.reasons).toContain('Category intro copy (description) is missing.')
    expect(result?.reasons).toContain(GUIDE_REASON)
  })

  it('(7d) nonexistent category → null', async () => {
    const { db } = freshCatalogDb()
    expect(await categoryIndexability(db, 999999)).toBeNull()
  })
})

describe('global noindex posture preservation (Stage 05.1)', () => {
  // tests/seo.test.ts covers buildMeta's opt-in robots noindex and
  // tests/routes.test.ts covers robots route registration, but neither
  // asserts the robots.txt loader body — this case covers that gap
  // without duplicating them.
  it('(8) robots.txt loader still disallows everything (foundation posture untouched)', async () => {
    const response = robotsLoader()
    const body = await response.text()
    expect(body).toContain('Disallow: /')
  })
})
