import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from './helpers/sqlite-d1'
import { searchProducts, toFtsQuery } from '../app/lib/db/search'
import { rebuildSearchIndex } from '../app/lib/db/reindex'

describe('FTS5 catalog search (spike S-01 design, real SQLite)', () => {
  it('sanitises free text into a safe quoted query', () => {
    expect(toFtsQuery('USB-C hub!')).toBe('"usb-c" "hub"')
    expect(toFtsQuery('a " OR 1=1 --')).toBe('"or"')
  })

  it('finds products by keyword after reindex, ranked by bm25', async () => {
    const { db } = freshCatalogDb()
    const indexed = await rebuildSearchIndex(db)
    expect(indexed).toBe(4)
    const hub = await searchProducts(db, { q: 'hub', includeFixtures: true })
    expect(hub.items.map((i) => i.slug)).toContain('dev-fixture-usb-hub')
    expect(hub.totalEstimate).toBeGreaterThanOrEqual(1)
    const desk = await searchProducts(db, { q: 'desk', includeFixtures: true })
    expect(desk.items.map((i) => i.slug).sort()).toEqual(['dev-fixture-desk-lamp', 'dev-fixture-desk-riser'])
  })

  it('never returns fixtures when disabled, nor gated products ever', async () => {
    const { db } = freshCatalogDb()
    await rebuildSearchIndex(db)
    const off = await searchProducts(db, { q: 'desk', includeFixtures: false })
    expect(off.items).toHaveLength(0)
    const draft = await searchProducts(db, { q: 'draft', includeFixtures: true })
    expect(draft.items.map((i) => i.slug)).not.toContain('dev-fixture-draft-product')
  })

  it('applies category, brand and spec filters', async () => {
    const { db } = freshCatalogDb()
    await rebuildSearchIndex(db)
    const byCategory = await searchProducts(db, {
      categorySlug: 'electronics-accessories',
      includeFixtures: true,
    })
    expect(byCategory.items).toHaveLength(2)
    const bySpec = await searchProducts(db, {
      categorySlug: 'electronics-accessories',
      specFilters: [{ key: 'usb_c_ports', min: 2 }],
      includeFixtures: true,
    })
    expect(bySpec.items.map((i) => i.slug)).toEqual(['dev-fixture-usb-hub'])
    const boolSpec = await searchProducts(db, {
      categorySlug: 'home-office',
      specFilters: [{ key: 'height_adjustable', bool: true }],
      includeFixtures: true,
    })
    expect(boolSpec.items.map((i) => i.slug)).toEqual(['dev-fixture-desk-riser'])
    expect(bySpec.facets.brands[0]?.slug).toBe('devbrand')
  })

  it('paginates with cursors and reports totals', async () => {
    const { db } = freshCatalogDb()
    await rebuildSearchIndex(db)
    const page1 = await searchProducts(db, { includeFixtures: true, limit: 3, sort: 'name' })
    expect(page1.items).toHaveLength(3)
    expect(page1.totalEstimate).toBe(4)
    expect(page1.nextCursor).not.toBeNull()
    const page2 = await searchProducts(db, {
      includeFixtures: true,
      limit: 3,
      sort: 'name',
      cursor: page1.nextCursor,
    })
    expect(page2.items).toHaveLength(1)
    expect(page2.nextCursor).toBeNull()
  })

  it('price filters match nothing while no displayable prices exist', async () => {
    const { db } = freshCatalogDb()
    await rebuildSearchIndex(db)
    const priced = await searchProducts(db, { includeFixtures: true, priceMaxCents: 100000 })
    expect(priced.items).toHaveLength(0)
  })
})
