// Stage 05.4 — catalog initialization, verified ingestion, and local QA.
//
// Proves, on a LOCAL node:sqlite database only (no production access of
// any kind):
//  1. fixtures/taxonomy-seeds.sql is idempotent and produces exactly the
//     approved Revision 3 taxonomy (15 subcategories, 118 definitions,
//     is_required per §9.1, D-06 root descriptions, is_indexable = 0).
//  2. fixtures/catalog-products.sql ingests exactly 47 genuine products
//     in the approved distribution, as drafts, with NULL prices, and is
//     itself idempotent.
//  3. The REAL Stage 05.3 validation engine (offer + product) runs over
//     every ingested record; per-product outcomes are written to
//     fixtures/product-validation-results.json.
//  4. Functional QA on the local catalog: publication gates, category
//     visibility, search, comparison data, alternatives, no-price
//     behaviour, and certification derivation honesty.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { isSafetyCertified } from '../app/lib/certification'
import { transitionProductStatus, type AdminActor } from '../app/lib/db/admin'
import { getAlternatives, getCategoryBySlug, getProductBySlug, listProducts } from '../app/lib/db/catalog'
import { displayPrice, getProductOffers } from '../app/lib/db/offers'
import { rebuildSearchIndex } from '../app/lib/db/reindex'
import { searchProducts } from '../app/lib/db/search'
import { runOfferValidation } from '../app/lib/offer-validation'
import { categoryIndexability, productIndexability, runProductValidation } from '../app/lib/product-validation'
import { applyMigrations, createTestDb } from './helpers/sqlite-d1'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

const DIST: Record<string, number> = {
  desks: 5, 'standing-desks': 5, 'office-chairs': 5, 'desk-lighting': 5,
  'monitor-arms': 1, 'laptop-stands': 1, 'desk-organization-storage': 1, 'ergonomic-supports': 1,
  'usb-c-hubs': 5, 'docking-stations': 5, 'chargers-power-adapters': 5, 'cables-adapters': 5,
  'device-stands-holders': 1, 'power-strips-surge-protectors': 1, 'cases-sleeves-protection': 1,
}
const DEF_COUNTS: Record<string, number> = {
  desks: 5, 'standing-desks': 10, 'office-chairs': 6, 'desk-lighting': 7,
  'monitor-arms': 6, 'laptop-stands': 6, 'desk-organization-storage': 6, 'ergonomic-supports': 4,
  'usb-c-hubs': 15, 'docking-stations': 15, 'chargers-power-adapters': 9, 'cables-adapters': 8,
  'device-stands-holders': 8, 'power-strips-surge-protectors': 9, 'cases-sleeves-protection': 4,
}

function stageDb(withProducts: boolean) {
  const { db, raw } = createTestDb()
  applyMigrations(raw)
  raw.exec(read('fixtures/catalog-seeds.sql'))
  raw.exec(read('fixtures/taxonomy-seeds.sql'))
  raw.exec(
    `INSERT OR IGNORE INTO admin_users (email, role, access_identity_ref) VALUES ('owner@example.invalid', 'owner', 'stage05-test')`,
  )
  if (withProducts) raw.exec(read('fixtures/catalog-products.sql'))
  return { db, raw }
}

type Raw = ReturnType<typeof createTestDb>['raw']
const count = (raw: Raw, sql: string) => (raw.prepare(sql).get() as { n: number }).n

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('test admin missing')
  return row
}

describe('Stage 05.4 taxonomy seeds', () => {
  it('are idempotent and produce exactly the approved taxonomy', () => {
    const { raw } = stageDb(false)
    raw.exec(read('fixtures/taxonomy-seeds.sql')) // second application
    raw.exec(read('fixtures/taxonomy-seeds.sql')) // third application
    expect(count(raw, 'SELECT COUNT(*) n FROM categories')).toBe(17)
    expect(count(raw, 'SELECT COUNT(*) n FROM categories WHERE parent_id IS NOT NULL')).toBe(15)
    expect(count(raw, 'SELECT COUNT(*) n FROM attribute_definitions')).toBe(126) // 8 root + 118
    expect(count(raw, 'SELECT COUNT(*) n FROM categories WHERE is_indexable != 0')).toBe(0)
    for (const [slug, n] of Object.entries(DEF_COUNTS)) {
      const got = count(
        raw,
        `SELECT COUNT(*) n FROM attribute_definitions d JOIN categories c ON c.id = d.category_id WHERE c.slug = '${slug}'`,
      )
      expect(got, `definition count for ${slug}`).toBe(n)
    }
    // Required-flag spot checks against the §9.1 matrix.
    const req = (cat: string, key: string) =>
      (raw
        .prepare(
          `SELECT d.is_required FROM attribute_definitions d JOIN categories c ON c.id = d.category_id WHERE c.slug = ? AND d.key = ?`,
        )
        .get(cat, key) as { is_required: number }).is_required
    expect(req('docking-stations', 'ethernet_port')).toBe(1) // docks only
    expect(req('usb-c-hubs', 'ethernet_port')).toBe(0)
    expect(req('power-strips-surge-protectors', 'surge_rating_joules')).toBe(0) // conditional (VR-4), not flag-required
    expect(req('power-strips-surge-protectors', 'surge_protection')).toBe(1)
    expect(req('ergonomic-supports', 'thickness_cm')).toBe(0) // zero mandatory technical attributes (R5)
    expect(req('cables-adapters', 'data_transfer_gbps')).toBe(1)
    expect(count(raw, 'SELECT COUNT(*) n FROM attribute_definitions WHERE is_required = 1')).toBe(60)
  })

  it('applies the final D-06 root descriptions verbatim (locally)', () => {
    const { raw } = stageDb(false)
    const rows = raw
      .prepare('SELECT slug, description FROM categories WHERE parent_id IS NULL ORDER BY sort_order')
      .all() as Array<{ slug: string; description: string }>
    expect(rows[0].slug).toBe('home-office')
    expect(rows[0].description).toBe(
      'A home office earns its keep when the desk, the chair, and the light stop fighting you. This section covers the furniture and workspace accessories that shape a working day — desks and standing desks, seating, lighting, monitor arms and laptop stands, storage, and the small ergonomic pieces in between — each one recorded from manufacturer specifications, so products can be compared on the same terms.',
    )
    expect(rows[1].slug).toBe('electronics-accessories')
    expect(rows[1].description).toBe(
      "The accessories around a laptop or phone decide how well the whole setup works: whether one cable can charge everything, whether a hub or dock has the ports your desk actually needs, and whether a charger's safety claims are supported by verifiable documentation. This section covers hubs, docking stations, chargers, cables and adapters, device stands, power strips and surge protectors, and cases — accessories only, never the devices themselves — with wattage, port, and safety information taken from manufacturer specifications and verifiable evidence.",
    )
  })
})

describe('Stage 05.4 ingestion', () => {
  it('ingests exactly 47 draft products in the approved distribution, idempotently', () => {
    const { raw } = stageDb(true)
    raw.exec(read('fixtures/catalog-products.sql')) // re-apply: must change nothing
    expect(count(raw, "SELECT COUNT(*) n FROM products WHERE source_id = 'stage05-research'")).toBe(47)
    expect(count(raw, "SELECT COUNT(*) n FROM products WHERE source_id = 'stage05-research' AND status != 'draft'")).toBe(0)
    expect(count(raw, 'SELECT COUNT(*) n FROM offers WHERE current_price_cents IS NOT NULL')).toBe(0)
    expect(count(raw, 'SELECT COUNT(*) n FROM offers')).toBe(47)
    for (const [slug, n] of Object.entries(DIST)) {
      const got = count(
        raw,
        `SELECT COUNT(*) n FROM products p JOIN categories c ON c.id = p.category_id WHERE c.slug = '${slug}' AND p.source_id = 'stage05-research'`,
      )
      expect(got, `product count for ${slug}`).toBe(n)
    }
    // Every product carries at least one spec with an evidence-traceable source key.
    expect(
      count(
        raw,
        `SELECT COUNT(DISTINCT product_id) n FROM product_specs ps JOIN products p ON p.id = ps.product_id WHERE p.source_id = 'stage05-research' AND ps.source_id = p.slug`,
      ),
    ).toBe(47)
  })
})

describe('Stage 05.4 validation run (real engine)', () => {
  it('validates all offers and products and records per-product outcomes', async () => {
    const { db, raw } = stageDb(true)
    const actor = await owner(db)
    const products = raw
      .prepare(
        `SELECT p.id, p.slug, c.slug AS category FROM products p JOIN categories c ON c.id = p.category_id WHERE p.source_id = 'stage05-research' ORDER BY p.slug`,
      )
      .all() as Array<{ id: number; slug: string; category: string }>

    const results: Array<Record<string, unknown>> = []
    let offersPassed = 0
    let passed = 0
    let failed = 0
    for (const p of products) {
      const offer = raw.prepare('SELECT id FROM offers WHERE product_id = ?').get(p.id) as { id: number }
      const ov = await runOfferValidation(db, actor, offer.id)
      if (ov?.status === 'passed') offersPassed++
      const pv = await runProductValidation(db, actor, p.id)
      if (pv?.status === 'passed') passed++
      else failed++
      results.push({
        slug: p.slug,
        category: p.category,
        offer_validation: ov?.status ?? null,
        offer_issues: (ov?.issues ?? []).map((i) => `${i.severity}:${i.code}`),
        product_validation: pv?.status ?? null,
        product_issues: (pv?.issues ?? []).filter((i) => i.severity === 'error').map((i) => i.code),
        product_warnings: (pv?.issues ?? []).filter((i) => i.severity === 'warning').map((i) => i.code),
      })
    }
    writeFileSync(
      join(ROOT, 'fixtures/product-validation-results.json'),
      JSON.stringify(
        {
          stage: '05.4',
          generated: '2026-11-09',
          scope: 'LOCAL node:sqlite database only — no production data',
          tally: { products: products.length, offers_passed: offersPassed, products_passed: passed, products_failed: failed },
          results,
        },
        null,
        2,
      ) + '\n',
    )
    expect(offersPassed).toBe(47)
    expect(passed).toBe(47)
    expect(failed).toBe(0)
    // Indexability verification at ingestion state: drafts are never indexable.
    for (const p of products) {
      const idx = await productIndexability(db, p.id)
      expect(idx?.indexable).toBe(false)
      expect(idx?.reasons.join(' ')).toContain('not published')
    }
    const desks = raw.prepare("SELECT id FROM categories WHERE slug = 'desks'").get() as { id: number }
    const catIdx = await categoryIndexability(db, desks.id)
    expect(catIdx?.indexable).toBe(false)
    expect(catIdx?.reasons.join(' ')).toContain('how to choose')
  })
})

describe('Stage 05.4 functional QA (local publish flow)', () => {
  let ctx: ReturnType<typeof stageDb>
  let actor: AdminActor
  beforeAll(async () => {
    ctx = stageDb(true)
    actor = await owner(ctx.db)
    const { db, raw } = ctx
    const products = raw.prepare("SELECT id FROM products WHERE source_id = 'stage05-research'").all() as Array<{ id: number }>
    for (const p of products) {
      const offer = raw.prepare('SELECT id FROM offers WHERE product_id = ?').get(p.id) as { id: number }
      await runOfferValidation(db, actor, offer.id)
      await runProductValidation(db, actor, p.id)
    }
  })

  it('gate: drafts are invisible to every public read before any publish', async () => {
    const { db } = ctx
    const listed = await listProducts(db, { categorySlug: 'desks', includeFixtures: false })
    expect(listed.items).toHaveLength(0)
    expect(await getProductBySlug(db, 'ikea-bekant-desk-160x80', false)).toBeNull()
  })

  it('publishes locally and serves categories, detail, search, alternatives', async () => {
    const { db, raw } = ctx
    const products = raw.prepare("SELECT id, slug FROM products WHERE source_id = 'stage05-research'").all() as Array<{
      id: number
      slug: string
    }>
    // Keep one product in draft as the standing gate control.
    const control = products.find((p) => p.slug.includes('comfilife'))!
    for (const p of products) {
      if (p.id === control.id) continue
      expect(await transitionProductStatus(db, actor, p.id, 'published')).toEqual({ ok: true })
    }
    const indexed = await rebuildSearchIndex(db)
    expect(indexed).toBe(46)

    // Category listing: exact leaf counts (published only).
    for (const [slug, n] of Object.entries(DIST)) {
      const listed = await listProducts(db, { categorySlug: slug, includeFixtures: false, limit: 60 })
      const expected = slug === 'ergonomic-supports' ? 0 : n
      expect(listed.items.length, `published listing for ${slug}`).toBe(expected)
    }
    // Root category pages exist with D-06 copy and roll up (page-level
    // aggregation is exercised through category detail + child listings).
    const root = await getCategoryBySlug(db, 'home-office')
    expect(root?.category.description).toContain('earns its keep')
    expect(root?.children).toHaveLength(8)

    // The draft control stays invisible everywhere.
    expect(await getProductBySlug(db, control.slug, false)).toBeNull()
    const searchControl = await searchProducts(db, { q: 'ComfiLife', includeFixtures: false })
    expect(searchControl.items.map((i) => i.slug)).not.toContain(control.slug)

    // Detail: specs + lawful link-out offer, and NO price anywhere.
    const detail = await getProductBySlug(db, 'anker-737-charger-ganprime-120w-a2148', false)
    expect(detail).not.toBeNull()
    expect(detail!.specs.some((s) => s.key === 'total_output_w' && s.value_number === 120)).toBe(true)
    const offers = await getProductOffers(db, detail!.product.id)
    expect(offers.length).toBe(1)
    expect(offers[0].destination_url).toMatch(/^https:\/\//) // lawful offer: destination exposed
    expect(offers[0].price_cents).toBeNull() // link-out only: destination shown, price never
    expect(displayPrice(offers).price_cents).toBeNull()

    // Search finds ingested products by brand and by name terms.
    const byBrand = await searchProducts(db, { q: 'IKEA', includeFixtures: false })
    expect(byBrand.totalEstimate).toBeGreaterThanOrEqual(10)
    const byTerm = await searchProducts(db, { q: 'surge protector', includeFixtures: false })
    expect(byTerm.items.map((i) => i.slug)).toContain('tripp-lite-protect-it-6-outlet-surge-protector-tlp606')

    // Spec filtering works on real data (hubs with >= 2 USB-C data ports).
    const filtered = await listProducts(db, {
      categorySlug: 'usb-c-hubs',
      includeFixtures: false,
      specFilters: [{ key: 'usb_c_ports', min: 2 }],
    })
    expect(filtered.items.length).toBeGreaterThanOrEqual(1)
    expect(filtered.items.every((i) => i.slug !== 'plugable-usb-c-hub-7-in-1-usbc-7in1')).toBe(true)

    // Comparison data: two chargers expose the same definition keys, aligned.
    const a = await getProductBySlug(db, 'anker-737-charger-ganprime-120w-a2148', false)
    const b = await getProductBySlug(db, 'ugreen-nexode-100w-gan-charger-cd226', false)
    const keysA = new Set(a!.specs.map((s) => s.key))
    for (const k of ['usb_c_ports', 'power_delivery_w', 'total_output_w', 'safety_certification_status'])
      expect(keysA.has(k)).toBe(true)
    expect(b!.specs.some((s) => s.key === 'total_output_w')).toBe(true)

    // Alternatives respond for a hub with peers in-category; the cheaper
    // bucket is honestly empty because no product carries a licensed price.
    const alts = await getAlternatives(db, 'anker-341-usb-c-hub-7-in-1-a8346', false)
    expect(alts).not.toBeNull()
    expect(alts!.cheaper).toHaveLength(0)
    expect(alts!.betterFit.length + alts!.simpler.length).toBeGreaterThanOrEqual(1)
  })

  it('certification derivation is honest on ingested data', async () => {
    const { raw } = ctx
    const rows = raw
      .prepare(
        `SELECT p.slug,
                MAX(CASE WHEN d.key = 'safety_certification_body' THEN ps.value_text END) AS body,
                MAX(CASE WHEN d.key = 'safety_certification_status' THEN ps.value_text END) AS status
           FROM products p
           JOIN product_specs ps ON ps.product_id = p.id
           JOIN attribute_definitions d ON d.id = ps.definition_id
          WHERE p.source_id = 'stage05-research'
          GROUP BY p.slug`,
      )
      .all() as Array<{ slug: string; body: string | null; status: string | null }>
    const certified = rows.filter((r) => isSafetyCertified(r.body, r.status)).map((r) => r.slug).sort()
    // Exactly the two products whose manufacturers publish a third-party
    // listing (UL) in their own documentation derive as certified.
    expect(certified).toEqual([
      'plugable-triple-monitor-usb-c-docking-station-ud-768pdz',
      'tripp-lite-protect-it-6-outlet-surge-protector-tlp606',
    ])
    // No accepted product carries an unverified claim upgraded to certified.
    for (const r of rows) if (r.status === 'claimed_unverified') expect(isSafetyCertified(r.body, r.status)).toBe(false)
    // Plain-strip honesty is structural in the data: the single B6 product is
    // a protector WITH a positive rating; no ingested product pairs
    // surge_protection = false with a joule rating.
    const contradictions = count(
      raw,
      `SELECT COUNT(*) n FROM products p
        WHERE p.source_id = 'stage05-research' AND EXISTS (
          SELECT 1 FROM product_specs ps JOIN attribute_definitions d ON d.id = ps.definition_id
           WHERE ps.product_id = p.id AND d.key = 'surge_protection' AND ps.value_bool = 0)
          AND EXISTS (
          SELECT 1 FROM product_specs ps JOIN attribute_definitions d ON d.id = ps.definition_id
           WHERE ps.product_id = p.id AND d.key = 'surge_rating_joules')`,
    )
    expect(contradictions).toBe(0)
  })

  it('gate: a failed-validation product cannot leak into public reads', async () => {
    const { db, raw } = ctx
    // Simulate a record whose validation later fails (raw state flip is the
    // test-only stand-in for a failed revalidation): public DAL gate excludes
    // it regardless of status.
    const target = raw.prepare("SELECT id, slug FROM products WHERE slug = 'ikea-trotten-desk-120x70'").get() as { id: number; slug: string }
    raw.prepare("UPDATE products SET validation_status = 'failed' WHERE id = ?").run(target.id)
    expect(await getProductBySlug(db, target.slug, false)).toBeNull()
    const listed = await listProducts(db, { categorySlug: 'desks', includeFixtures: false, limit: 60 })
    expect(listed.items.map((i) => i.slug)).not.toContain(target.slug)
  })
})
