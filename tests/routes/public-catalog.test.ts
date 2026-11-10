import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { setStubEnv } from '../helpers/cloudflare-workers'
import { getCategoryBySlug, getProductBySlug, listProducts } from '../../app/lib/db/catalog'
import { loader as productLoader } from '../../app/routes/product'
import { loader as categoryLoader } from '../../app/routes/category'

/**
 * Stage 05.1 (B) — public catalog infrastructure.
 *
 * Tested at two levels, deliberately:
 *  - DAL level (the security boundary): every assertion about visibility
 *    runs the real SQL through getProductBySlug / listProducts /
 *    getCategoryBySlug against a real SQLite catalog. The public gate
 *    (status='published' AND validation_status='passed') and the price
 *    policy live in the DAL, so this is where a leak would occur.
 *  - Route-loader level: the SSR loaders are plain functions of
 *    (params, request) plus the `cloudflare:workers` env binding, which
 *    the test stub supplies — so they are invoked directly here (the
 *    same pattern tests/routes/admin-api.test.ts uses for API routes),
 *    proving the 404 behaviour and that loaders return gated data.
 *  - Source level: pins that the route modules actually call the gated
 *    DAL functions and carry the required disclosure/rel attributes, so
 *    a future refactor cannot silently bypass the gate.
 */

let db: D1Database
let raw: DatabaseSync

beforeEach(() => {
  const fresh = freshCatalogDb()
  db = fresh.db
  raw = fresh.raw
  setStubEnv({ DB: db, DEV_FIXTURES: 'enabled' })
})

function categoryId(slug: string): number {
  return (raw.prepare('SELECT id FROM categories WHERE slug = ?').get(slug) as { id: number }).id
}

function insertCategory(
  slug: string,
  name: string,
  opts: { description?: string | null; parentSlug?: string; sortOrder?: number } = {},
): number {
  raw
    .prepare('INSERT INTO categories (slug, name, description, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(
      slug,
      name,
      opts.description ?? null,
      opts.parentSlug ? categoryId(opts.parentSlug) : null,
      opts.sortOrder ?? 0,
    )
  return categoryId(slug)
}

function insertProduct(
  slug: string,
  opts: {
    categorySlug?: string
    name?: string
    status?: string
    validationStatus?: string
    sourceId?: string
    summary?: string | null
  } = {},
): void {
  raw
    .prepare(
      `INSERT INTO products (category_id, slug, name, editorial_summary, status, validation_status, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      categoryId(opts.categorySlug ?? 'home-office'),
      slug,
      opts.name ?? slug,
      opts.summary ?? null,
      opts.status ?? 'published',
      opts.validationStatus ?? 'passed',
      opts.sourceId ?? 'manual-entry',
    )
}

function merchantId(slug: string): number {
  return (raw.prepare('SELECT id FROM merchants WHERE slug = ?').get(slug) as { id: number }).id
}

function productId(slug: string): number {
  return (raw.prepare('SELECT id FROM products WHERE slug = ?').get(slug) as { id: number }).id
}

describe('public gate — getProductBySlug', () => {
  it('returns a published + passed product (fixture, fixtures enabled)', async () => {
    const detail = await getProductBySlug(db, 'dev-fixture-usb-hub', true)
    expect(detail).not.toBeNull()
    expect(detail?.product.slug).toBe('dev-fixture-usb-hub')
    expect(detail?.category_slug).toBe('electronics-accessories')
  })

  it('returns a published + passed non-fixture product with fixtures disabled', async () => {
    insertProduct('real-published', { summary: 'A real published product.' })
    const detail = await getProductBySlug(db, 'real-published', false)
    expect(detail).not.toBeNull()
    expect(detail?.product.editorial_summary).toBe('A real published product.')
  })

  it('returns null for a draft product', async () => {
    expect(await getProductBySlug(db, 'dev-fixture-draft-product', true)).toBeNull()
    insertProduct('manual-draft', { status: 'draft' })
    expect(await getProductBySlug(db, 'manual-draft', false)).toBeNull()
  })

  it('returns null for a pending-validation product', async () => {
    insertProduct('pending-product', { status: 'published', validationStatus: 'pending' })
    expect(await getProductBySlug(db, 'pending-product', false)).toBeNull()
    expect(await getProductBySlug(db, 'pending-product', true)).toBeNull()
  })

  it('returns null for a failed-validation product', async () => {
    expect(await getProductBySlug(db, 'dev-fixture-unvalidated-product', true)).toBeNull()
    insertProduct('failed-product', { status: 'published', validationStatus: 'failed' })
    expect(await getProductBySlug(db, 'failed-product', false)).toBeNull()
  })

  it('returns null for an archived product', async () => {
    insertProduct('archived-product', { status: 'archived', validationStatus: 'passed' })
    expect(await getProductBySlug(db, 'archived-product', false)).toBeNull()
  })

  it('returns null for an unknown slug', async () => {
    expect(await getProductBySlug(db, 'no-such-product', true)).toBeNull()
  })
})

describe('price policy — no price leaks through the detail read', () => {
  it('fixture offers with non-displayable prices yield price_cents === null', async () => {
    const hub = await getProductBySlug(db, 'dev-fixture-usb-hub', true)
    expect(hub?.offers.length).toBeGreaterThan(0)
    for (const offer of hub?.offers ?? []) {
      expect(offer.price_cents).toBeNull()
    }
    const cable = await getProductBySlug(db, 'dev-fixture-charging-cable', true)
    for (const offer of cable?.offers ?? []) {
      expect(offer.price_cents).toBeNull()
    }
  })

  it('a restricted-licence offer never surfaces its stored price', async () => {
    insertProduct('hidden-price-product')
    raw
      .prepare(
        `INSERT INTO offers (product_id, merchant_id, destination_url, current_price_cents, price_observed_at, licence_status, validation_status)
         VALUES (?, ?, 'https://example.invalid/item', 12345, datetime('now'), 'restricted', 'passed')`,
      )
      .run(productId('hidden-price-product'), merchantId('devmerchant'))
    const detail = await getProductBySlug(db, 'hidden-price-product', false)
    expect(detail?.offers).toHaveLength(1)
    expect(detail?.offers[0]?.price_cents).toBeNull()
  })

  it('a licensed, fresh, passed offer DOES surface its price (policy, not blanket hiding)', async () => {
    insertProduct('visible-price-product')
    raw
      .prepare(
        `INSERT INTO offers (product_id, merchant_id, destination_url, current_price_cents, price_observed_at, licence_status, validation_status)
         VALUES (?, ?, 'https://example.invalid/item', 4999, datetime('now'), 'licensed', 'passed')`,
      )
      .run(productId('visible-price-product'), merchantId('devmerchant'))
    const detail = await getProductBySlug(db, 'visible-price-product', false)
    expect(detail?.offers[0]?.price_cents).toBe(4999)
  })
})

describe('getCategoryBySlug', () => {
  it('returns a root category with no parent and no children', async () => {
    const result = await getCategoryBySlug(db, 'home-office')
    expect(result).not.toBeNull()
    expect(result?.category.slug).toBe('home-office')
    expect(result?.category.name).toBe('Home Office & Productivity')
    expect(result?.category.parent_id).toBeNull()
    expect(result?.parent).toBeNull()
    expect(result?.children).toEqual([])
  })

  it('returns children ordered by sort_order, then name', async () => {
    insertCategory('test-root', 'Test Root')
    insertCategory('zeta-child', 'Zeta Child', {
      parentSlug: 'test-root',
      sortOrder: 2,
      description: 'Last.',
    })
    insertCategory('beta-child', 'Beta Child', { parentSlug: 'test-root', sortOrder: 1 })
    insertCategory('alpha-child', 'Alpha Child', { parentSlug: 'test-root', sortOrder: 1 })
    const result = await getCategoryBySlug(db, 'test-root')
    expect(result?.children.map((c) => c.slug)).toEqual(['alpha-child', 'beta-child', 'zeta-child'])
    expect(result?.children[2]?.description).toBe('Last.')
  })

  it('returns the parent for a child category', async () => {
    insertCategory('parent-cat', 'Parent Category', { description: 'The parent.' })
    insertCategory('child-cat', 'Child Category', { parentSlug: 'parent-cat' })
    const result = await getCategoryBySlug(db, 'child-cat')
    expect(result?.parent).toEqual({ slug: 'parent-cat', name: 'Parent Category' })
    expect(result?.category.description).toBeNull()
  })

  it('returns null for an unknown slug', async () => {
    expect(await getCategoryBySlug(db, 'no-such-category')).toBeNull()
  })
})

describe('listProducts with categorySlugs', () => {
  it('a category holding only a draft product lists zero items', async () => {
    insertCategory('draft-only-cat', 'Draft Only')
    insertProduct('only-a-draft', { categorySlug: 'draft-only-cat', status: 'draft' })
    const viaSlugs = await listProducts(db, { categorySlugs: ['draft-only-cat'], includeFixtures: false })
    expect(viaSlugs.items).toHaveLength(0)
    const viaSingle = await listProducts(db, { categorySlug: 'draft-only-cat', includeFixtures: false })
    expect(viaSingle.items).toHaveLength(0)
  })

  it('includes subcategory products and excludes other categories', async () => {
    insertCategory('desk-extras', 'Desk Extras', { parentSlug: 'home-office' })
    insertProduct('root-product', { categorySlug: 'home-office', name: 'Root Product' })
    insertProduct('sub-product', { categorySlug: 'desk-extras', name: 'Sub Product' })
    insertProduct('other-product', { categorySlug: 'electronics-accessories', name: 'Other Product' })

    const combined = await listProducts(db, {
      categorySlugs: ['home-office', 'desk-extras'],
      includeFixtures: false,
    })
    const slugs = combined.items.map((i) => i.slug)
    expect(slugs).toContain('root-product')
    expect(slugs).toContain('sub-product')
    expect(slugs).not.toContain('other-product')
  })

  it('single categorySlug behaviour is unchanged (subcategory not pulled in)', async () => {
    insertCategory('desk-extras', 'Desk Extras', { parentSlug: 'home-office' })
    insertProduct('root-product', { categorySlug: 'home-office' })
    insertProduct('sub-product', { categorySlug: 'desk-extras' })
    const single = await listProducts(db, { categorySlug: 'home-office', includeFixtures: false })
    const slugs = single.items.map((i) => i.slug)
    expect(slugs).toContain('root-product')
    expect(slugs).not.toContain('sub-product')
  })

  it('an empty categorySlugs list falls back to no category filter', async () => {
    insertProduct('somewhere-product', { categorySlug: 'electronics-accessories' })
    const result = await listProducts(db, { categorySlugs: [], includeFixtures: false })
    expect(result.items.map((i) => i.slug)).toContain('somewhere-product')
  })
})

describe('SSR route loaders', () => {
  const callProduct = (slug: string) =>
    (productLoader as (args: never) => Promise<{ detail: { product: { slug: string } } }>)({
      params: { slug },
      request: new Request(`https://example.test/product/${slug}`),
      context: {},
    } as never)

  const callCategory = (slug: string, query = '') =>
    (
      categoryLoader as (
        args: never,
      ) => Promise<{ items: { slug: string }[]; categoryDetail: { category: { slug: string } } }>
    )({
      params: { slug },
      request: new Request(`https://example.test/category/${slug}${query}`),
      context: {},
    } as never)

  it('product loader returns the gated detail for a published product', async () => {
    const data = await callProduct('dev-fixture-usb-hub')
    expect(data.detail.product.slug).toBe('dev-fixture-usb-hub')
  })

  it('product loader throws a 404 Response for draft and unknown slugs', async () => {
    for (const slug of ['dev-fixture-draft-product', 'no-such-product']) {
      try {
        await callProduct(slug)
        expect.unreachable(`loader should have thrown for ${slug}`)
      } catch (error) {
        expect(error).toBeInstanceOf(Response)
        expect((error as Response).status).toBe(404)
      }
    }
  })

  it('category loader returns the category and its gated products', async () => {
    insertProduct('loader-product', { categorySlug: 'home-office' })
    const data = await callCategory('home-office')
    expect(data.categoryDetail.category.slug).toBe('home-office')
    expect(data.items.map((i) => i.slug)).toContain('loader-product')
    // Fixture products are visible because the stub env enables fixtures,
    // but the gated rows must still be absent.
    expect(data.items.map((i) => i.slug)).not.toContain('dev-fixture-draft-product')
  })

  it('category loader includes subcategory products via categorySlugs', async () => {
    insertCategory('loader-sub', 'Loader Sub', { parentSlug: 'home-office' })
    insertProduct('loader-sub-product', { categorySlug: 'loader-sub' })
    const data = await callCategory('home-office')
    expect(data.items.map((i) => i.slug)).toContain('loader-sub-product')
  })

  it('category loader throws a 404 Response for an unknown category', async () => {
    try {
      await callCategory('no-such-category')
      expect.unreachable('loader should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(Response)
      expect((error as Response).status).toBe(404)
    }
  })
})

describe('source-level gate assertions', () => {
  const productSource = readFileSync(new URL('../../app/routes/product.tsx', import.meta.url), 'utf-8')
  const categorySource = readFileSync(new URL('../../app/routes/category.tsx', import.meta.url), 'utf-8')
  const routesSource = readFileSync(new URL('../../app/routes.ts', import.meta.url), 'utf-8')

  it('product page reads only through the gated DAL and carries disclosure + sponsored rel', () => {
    expect(productSource).toContain('getProductBySlug')
    expect(productSource).toContain('getAlternatives')
    expect(productSource).toContain('DisclosureBanner')
    expect(productSource).toContain('sponsored nofollow noopener')
    expect(productSource).toContain('price_cents !== null')
    expect(productSource).toContain("from '../components/engagement/list-buttons'")
  })

  it('category page reads only through the gated DAL', () => {
    expect(categorySource).toContain('getCategoryBySlug')
    expect(categorySource).toContain('listProducts')
    expect(categorySource).toContain('categorySlugs')
    expect(categorySource).toContain('price_cents !== null')
  })

  it('both dynamic routes are registered', () => {
    expect(routesSource).toContain("route('product/:slug', 'routes/product.tsx')")
    expect(routesSource).toContain("route('category/:slug', 'routes/category.tsx')")
  })
})
