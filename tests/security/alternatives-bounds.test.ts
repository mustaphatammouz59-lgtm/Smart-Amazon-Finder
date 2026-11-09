import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { ALTERNATIVES_PER_BUCKET, getAlternatives } from '../../app/lib/db/catalog'

/**
 * Stage 04.2 regression suite — F-03: the public alternatives endpoint
 * used to load the full detail of EVERY gated product in the category
 * (unbounded fan-out, no rate limit). The DAL now caps the peer scan and
 * each result bucket; the route adds the shared search rate limit and
 * slug-shape validation (covered in tests/routes/admin-api.test.ts and
 * the workerd sweep).
 */
describe('getAlternatives is bounded (F-03)', () => {
  it('caps every bucket even with far more qualifying peers than the cap', async () => {
    const { db, raw } = freshCatalogDb()
    const category = raw.prepare("SELECT id FROM categories WHERE slug = 'home-office'").get() as { id: number }
    const defs = raw
      .prepare('SELECT id FROM attribute_definitions WHERE category_id = ? ORDER BY id')
      .all(category.id) as Array<{ id: number }>
    expect(defs.length).toBeGreaterThanOrEqual(3)

    const insertProduct = (slug: string, specCount: number) => {
      const p = raw
        .prepare(
          `INSERT INTO products (category_id, slug, name, editorial_summary, status, validation_status, source_id)
           VALUES (?, ?, ?, 'Summary.', 'published', 'passed', 'manual-entry') RETURNING id`,
        )
        .get(category.id, slug, `Peer ${slug}`) as { id: number }
      for (let i = 0; i < specCount; i++) {
        raw
          .prepare('INSERT INTO product_specs (product_id, definition_id, value_number) VALUES (?, ?, ?)')
          .run(p.id, defs[i % defs.length].id, i + 1)
      }
      return p.id
    }

    // Lead with exactly 2 specs; 30 peers with 3 specs (better fit) and
    // 30 peers with 1 spec (simpler) — 60 qualifying peers. The scan
    // window (48) still contains at least a bucket-cap of each kind, so
    // both buckets must fill exactly to the cap and no further.
    insertProduct('bounds-lead', 2)
    for (let i = 0; i < 30; i++) insertProduct(`bounds-better-${i}`, 3)
    for (let i = 0; i < 30; i++) insertProduct(`bounds-simpler-${i}`, 1)

    const result = await getAlternatives(db, 'bounds-lead', false)
    expect(result).not.toBeNull()
    expect(result!.betterFit.length).toBe(ALTERNATIVES_PER_BUCKET)
    expect(result!.simpler.length).toBe(ALTERNATIVES_PER_BUCKET)
    expect(result!.cheaper.length).toBeLessThanOrEqual(ALTERNATIVES_PER_BUCKET)
  })

  it('is deterministic across calls', async () => {
    const { db } = freshCatalogDb()
    const a = await getAlternatives(db, 'dev-fixture-desk-riser', true)
    const b = await getAlternatives(db, 'dev-fixture-desk-riser', true)
    expect(a).toEqual(b)
  })

  it('still returns null for an unknown or gated-out product', async () => {
    const { db } = freshCatalogDb()
    expect(await getAlternatives(db, 'no-such-product', true)).toBeNull()
    expect(await getAlternatives(db, 'dev-fixture-draft-product', true)).toBeNull()
  })
})
