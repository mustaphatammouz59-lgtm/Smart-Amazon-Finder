// Stage 05.2 — taxonomy model conformance.
//
// Proves the REVISED Stage 05.2 taxonomy (TAXONOMY-stage05-proposal.md
// Revision 2) fits the existing schema, write path, validation engine,
// publication gate and indexability computation — and originally
// demonstrated, as passing assertions of the behaviour of the time,
// the two enforcement gaps the revision flagged for the ingestion
// stage (GAP VR-2: required attributes were editorial only; GAP VR-4:
// the conditional surge rules were not engine-enforced). Those two
// GAP tests were written to pin the gaps until Stage 05.3 landed;
// Stage 05.3 (FI-1 + FI-2, migration 0006) closed both, and the two
// tests were flipped to assert the enforced behaviour — the
// documented lifecycle of a gap-pinning test.
//
// Everything here is local test data on the SQLite shim: clearly
// labelled fixtures, no real products, no production data.
import { describe, expect, it } from 'vitest'
import {
  CERTIFICATION_BODIES,
  CERTIFICATION_STATUSES,
  CERTIFIED_BODIES,
  isSafetyCertified,
} from '../app/lib/certification'
import { createProduct, transitionProductStatus, type AdminActor } from '../app/lib/db/admin'
import { setProductSpecs } from '../app/lib/db/admin-products'
import { getProductBySlug, listProducts } from '../app/lib/db/catalog'
import { productIndexability, runProductValidation, validateProduct } from '../app/lib/product-validation'
import { freshCatalogDb } from './helpers/sqlite-d1'

type Raw = ReturnType<typeof freshCatalogDb>['raw']
type DefRow = [key: string, label: string, unit: string | null, type: string, f: number, c: number, w: number]

const CERT_TRIO: DefRow[] = [
  ['safety_certification_body', 'Certification body / mark', null, 'text', 1, 1, 10],
  ['safety_certification_status', 'Certification verification status', null, 'text', 1, 1, 10],
  ['safety_certification_id', 'Certification identifier', null, 'text', 0, 0, 0],
]

/** The revised dictionaries, transcribed from the Revision 2 tables. */
const DICTIONARIES: Record<string, DefRow[]> = {
  'laptop-stands': [
    ['max_laptop_size_in', 'Maximum laptop size', 'in', 'number', 1, 1, 10],
    ['height_adjustable', 'Height adjustable', null, 'bool', 1, 1, 30],
    ['max_load_kg', 'Maximum load', 'kg', 'number', 1, 1, 20],
    ['tilt_adjustable', 'Tilt adjustable', null, 'bool', 1, 1, 10],
    ['foldable', 'Foldable', null, 'bool', 1, 0, 0],
    ['warranty_years', 'Warranty', 'years', 'number', 0, 1, 10],
  ],
  'usb-c-hubs': [
    ['usb_c_ports', 'USB-C ports', null, 'number', 1, 1, 30],
    ['power_delivery_w', 'Power delivery', 'W', 'number', 1, 1, 20],
    ['usb_a_ports', 'USB-A ports', null, 'number', 1, 1, 10],
    ['hdmi_ports', 'HDMI ports', null, 'number', 1, 1, 10],
    ['max_video_resolution', 'Maximum video output', null, 'text', 0, 1, 10],
    ['usb_data_speed_gbps', 'USB data transfer rate', 'Gbps', 'number', 1, 1, 10],
    ['ethernet_port', 'Ethernet port', null, 'bool', 1, 0, 0],
    ['ethernet_speed_mbps', 'Ethernet speed', 'Mbps', 'number', 0, 1, 10],
    ['card_reader_sd', 'SD card reader', null, 'bool', 1, 0, 0],
    ['card_reader_microsd', 'microSD card reader', null, 'bool', 1, 0, 0],
    ['displayport_outputs', 'DisplayPort outputs', null, 'number', 1, 1, 10],
    ['max_external_displays', 'Maximum external displays', null, 'number', 1, 1, 10],
    ...CERT_TRIO,
  ],
  'chargers-power-adapters': [
    ['usb_c_ports', 'USB-C ports', null, 'number', 1, 1, 30],
    ['power_delivery_w', 'Power delivery', 'W', 'number', 1, 1, 20],
    ['total_output_w', 'Total output', 'W', 'number', 1, 1, 10],
    ['usb_a_ports', 'USB-A ports', null, 'number', 1, 1, 10],
    ['uses_gan', 'GaN technology', null, 'bool', 1, 0, 0],
    ['wireless_output_w', 'Wireless charging output', 'W', 'number', 1, 1, 10],
    ...CERT_TRIO,
  ],
  'power-strips-surge-protectors': [
    ['cable_length_m', 'Cable length', 'm', 'number', 1, 0, 0],
    ['ac_outlets', 'AC outlets', null, 'number', 1, 1, 10],
    ['surge_protection', 'Surge protection', null, 'bool', 1, 1, 10],
    ['surge_rating_joules', 'Surge protection rating', 'J', 'number', 1, 1, 10],
    ['usb_c_ports', 'USB-C ports', null, 'number', 1, 1, 30],
    ['power_delivery_w', 'Power delivery', 'W', 'number', 1, 1, 20],
    ...CERT_TRIO,
  ],
  'ergonomic-supports': [
    ['warranty_years', 'Warranty', 'years', 'number', 0, 1, 10],
    ['height_adjustable', 'Height adjustable', null, 'bool', 1, 1, 30],
    ['adjustable_angle', 'Adjustable angle', null, 'bool', 1, 1, 10],
    ['thickness_cm', 'Thickness', 'cm', 'number', 0, 0, 0],
  ],
}
// Docking stations carry the identical structural dictionary to hubs in
// Revision 2 (the hubs/docks difference is required-status, an editorial
// property with no schema representation).
DICTIONARIES['docking-stations'] = DICTIONARIES['usb-c-hubs']

const PARENTS: Record<string, string> = {
  'laptop-stands': 'home-office',
  'ergonomic-supports': 'home-office',
  'usb-c-hubs': 'electronics-accessories',
  'docking-stations': 'electronics-accessories',
  'chargers-power-adapters': 'electronics-accessories',
  'power-strips-surge-protectors': 'electronics-accessories',
}

function seedTaxonomy(raw: Raw): void {
  for (const [slug, defs] of Object.entries(DICTIONARIES)) {
    raw
      .prepare(
        `INSERT INTO categories (slug, name, description, parent_id, sort_order, is_indexable)
         VALUES (?, ?, 'Conformance fixture category.', (SELECT id FROM categories WHERE slug = ?), 99, 0)`,
      )
      .run(slug, `Fixture ${slug}`, PARENTS[slug])
    for (const [key, label, unit, type, f, c, w] of defs) {
      raw
        .prepare(
          `INSERT INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
           SELECT id, ?, ?, ?, ?, ?, ?, ? FROM categories WHERE slug = ?`,
        )
        .run(key, label, unit, type, f, c, w, slug)
    }
  }
}

function defId(raw: Raw, categorySlug: string, key: string): number {
  const row = raw
    .prepare(
      `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
       WHERE c.slug = ? AND d.key = ?`,
    )
    .get(categorySlug, key) as { id: number } | undefined
  if (!row) throw new Error(`definition ${categorySlug}/${key} missing`)
  return row.id
}

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

async function addDraft(
  db: D1Database,
  actor: AdminActor,
  categorySlug: string,
  slug: string,
  summary?: string,
): Promise<number> {
  const created = await createProduct(db, actor, {
    categorySlug,
    slug,
    name: `Fixture product ${slug}`,
    editorialSummary: summary ?? 'An original fixture summary written for conformance testing only.',
  })
  if ('conflict' in created) throw new Error(`product ${slug} conflict`)
  return created.id
}

function addLawfulOffer(raw: Raw, productId: number): void {
  const merchant = raw.prepare("SELECT id FROM merchants WHERE slug = 'devmerchant'").get() as
    | { id: number }
    | undefined
  if (!merchant) throw new Error('devmerchant fixture missing')
  raw
    .prepare(
      `INSERT INTO offers (product_id, merchant_id, destination_url, currency,
                           current_price_cents, price_observed_at, licence_status, validation_status)
       VALUES (?, ?, 'https://example.com/fixture-item', 'USD', NULL, NULL, 'licensed', 'passed')`,
    )
    .run(productId, merchant.id)
}

describe('Stage 05.2 taxonomy conformance', () => {
  it('model completeness: revised dictionaries insert with the documented row counts', () => {
    const { raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const counts = Object.fromEntries(
      Object.keys(DICTIONARIES).map((slug) => {
        const row = raw
          .prepare(
            `SELECT COUNT(*) AS n FROM attribute_definitions d JOIN categories c ON c.id = d.category_id WHERE c.slug = ?`,
          )
          .get(slug) as { n: number }
        return [slug, row.n]
      }),
    )
    expect(counts).toEqual({
      'laptop-stands': 6,
      'usb-c-hubs': 15,
      'docking-stations': 15,
      'chargers-power-adapters': 9,
      'power-strips-surge-protectors': 9,
      'ergonomic-supports': 4,
    })
  })

  it('R1 laptop stands: the new dictionary stores via the real write path and validates', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)
    const id = await addDraft(db, actor, 'laptop-stands', 'fixture-laptop-stand')
    const set = (key: string, value: number | boolean) =>
      setProductSpecs(db, actor, id, [{ definitionId: defId(raw, 'laptop-stands', key), value }])
    expect(await set('max_laptop_size_in', 17)).toEqual({ ok: true })
    expect(await set('height_adjustable', true)).toEqual({ ok: true })
    expect(await set('max_load_kg', 10)).toEqual({ ok: true })
    expect(await set('tilt_adjustable', true)).toEqual({ ok: true })
    expect(await set('foldable', false)).toEqual({ ok: true })
    expect(await set('warranty_years', 1)).toEqual({ ok: true })
    const validation = await runProductValidation(db, actor, id)
    expect(validation?.status).toBe('passed')
    expect(validation?.persistence).toBe('persisted')
    // The publication gate opens only because validation passed.
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
  })

  it('R1 laptop stands: monitor-arm semantics cannot be stored (definitions are category-scoped)', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)
    const id = await addDraft(db, actor, 'laptop-stands', 'fixture-stand-scoping')
    // hdmi_ports belongs to usb-c-hubs; the write path must refuse it here,
    // exactly as it would refuse the removed vesa_compatible/screen keys.
    const result = await setProductSpecs(db, actor, id, [
      { definitionId: defId(raw, 'usb-c-hubs', 'hdmi_ports'), value: 1 },
    ])
    expect(result).toEqual({ ok: false, reason: 'unknown_definition', definitionId: defId(raw, 'usb-c-hubs', 'hdmi_ports') })
  })

  it('VR-2 (Stage 05.3): required attributes are engine-enforced via is_required', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    // Stage 05.3 (FI-1): this test pinned the VR-2 gap until this
    // stage; flipping it is its documented lifecycle. The Revision 2
    // required attributes for laptop stands are now flagged
    // is_required (the flag a future approved ingestion sets from the
    // §9.1 matrix), and the engine enforces them.
    raw
      .prepare(
        `UPDATE attribute_definitions SET is_required = 1 WHERE key IN ('max_laptop_size_in','height_adjustable','max_load_kg') AND category_id = (SELECT id FROM categories WHERE slug = 'laptop-stands')`,
      )
      .run()
    const actor = await owner(db)
    const id = await addDraft(db, actor, 'laptop-stands', 'fixture-stand-missing-required')
    // Only ONE optional spec recorded; all three required attributes
    // are absent, so validation must now FAIL with one
    // missing_required_attribute error per required key.
    await setProductSpecs(db, actor, id, [
      { definitionId: defId(raw, 'laptop-stands', 'foldable'), value: true },
    ])
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    const missing = (validation?.issues ?? []).filter((i) => i.code === 'missing_required_attribute')
    expect(missing.map((i) => i.field).sort()).toEqual([
      'specs.height_adjustable',
      'specs.max_laptop_size_in',
      'specs.max_load_kg',
    ])
    expect(missing.every((i) => i.severity === 'error')).toBe(true)
    expect(validation?.issues.some((i) => i.code === 'missing_specs')).toBe(false)
  })

  it('R2 docking stations: the extended dictionary stores and the write path type-checks it', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)
    const id = await addDraft(db, actor, 'docking-stations', 'fixture-dock')
    const specs: Array<[string, number | string | boolean]> = [
      ['usb_c_ports', 3],
      ['power_delivery_w', 100],
      ['usb_a_ports', 4],
      ['hdmi_ports', 2],
      ['max_video_resolution', '4K 60Hz'],
      ['usb_data_speed_gbps', 10],
      ['ethernet_port', true],
      ['ethernet_speed_mbps', 1000],
      ['card_reader_sd', true],
      ['card_reader_microsd', false],
      ['displayport_outputs', 1],
      ['max_external_displays', 3],
    ]
    for (const [key, value] of specs) {
      expect(await setProductSpecs(db, actor, id, [{ definitionId: defId(raw, 'docking-stations', key), value }])).toEqual({
        ok: true,
      })
    }
    const mismatch = await setProductSpecs(db, actor, id, [
      { definitionId: defId(raw, 'docking-stations', 'ethernet_speed_mbps'), value: 'fast' },
    ])
    expect(mismatch.ok).toBe(false)
    if (!mismatch.ok) expect(mismatch.reason).toBe('type_mismatch')
  })

  it('R3 derivation rule: claimed_unverified never counts as certified', () => {
    expect(isSafetyCertified('UL', 'verified_certifier_database')).toBe(true)
    expect(isSafetyCertified('ETL', 'verified_manufacturer_documentation')).toBe(true)
    expect(isSafetyCertified('UL', 'claimed_unverified')).toBe(false)
    expect(isSafetyCertified('UL', 'not_certified')).toBe(false)
    // Conformity / EMC marks are recorded factually but are not, alone,
    // a third-party safety listing.
    expect(isSafetyCertified('CE', 'verified_manufacturer_documentation')).toBe(false)
    expect(isSafetyCertified('FCC', 'verified_certifier_database')).toBe(false)
    expect(isSafetyCertified('none', 'verified_certifier_database')).toBe(false)
    expect(isSafetyCertified(null, 'verified_certifier_database')).toBe(false)
    expect(isSafetyCertified('UL', null)).toBe(false)
    expect(isSafetyCertified('BOGUS', 'verified_certifier_database')).toBe(false)
    for (const body of CERTIFIED_BODIES) expect(CERTIFICATION_BODIES).toContain(body)
    expect(CERTIFICATION_STATUSES).toContain('claimed_unverified')
  })

  it('R3 storage + DAL filter: only the verified product surfaces under the certified status filter', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)

    async function charger(slug: string, status: string): Promise<number> {
      const id = await addDraft(db, actor, 'chargers-power-adapters', slug)
      const set = (key: string, value: number | string) =>
        setProductSpecs(db, actor, id, [{ definitionId: defId(raw, 'chargers-power-adapters', key), value }])
      await set('usb_c_ports', 2)
      await set('power_delivery_w', 65)
      await set('total_output_w', 65)
      await set('safety_certification_body', 'UL')
      await set('safety_certification_status', status)
      await set('safety_certification_id', 'E123456')
      addLawfulOffer(raw, id)
      const validation = await runProductValidation(db, actor, id)
      expect(validation?.status).toBe('passed')
      expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
      return id
    }

    await charger('fixture-charger-verified', 'verified_certifier_database')
    await charger('fixture-charger-claimed', 'claimed_unverified')

    const certified = await listProducts(db, {
      categorySlug: 'chargers-power-adapters',
      specFilters: [{ key: 'safety_certification_status', text: 'verified_certifier_database' }],
    })
    expect(certified.items.map((i) => i.slug)).toEqual(['fixture-charger-verified'])

    // The recorded evidence round-trips through the public gated read.
    const detail = await getProductBySlug(db, 'fixture-charger-claimed', false)
    const status = detail?.specs.find((s) => s.key === 'safety_certification_status')
    expect(status?.value_text).toBe('claimed_unverified')
    expect(isSafetyCertified('UL', status?.value_text)).toBe(false)
  })

  it('R4 surge model: both product types store distinctly', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)
    const surge = await addDraft(db, actor, 'power-strips-surge-protectors', 'fixture-surge-protector')
    const plain = await addDraft(db, actor, 'power-strips-surge-protectors', 'fixture-plain-strip')
    const setOn = (id: number) => (key: string, value: number | string | boolean) =>
      setProductSpecs(db, actor, id, [
        { definitionId: defId(raw, 'power-strips-surge-protectors', key), value },
      ])
    const setSurge = setOn(surge)
    await setSurge('surge_protection', true)
    await setSurge('surge_rating_joules', 1080)
    await setSurge('ac_outlets', 6)
    await setSurge('cable_length_m', 1.8)
    const setPlain = setOn(plain)
    await setPlain('surge_protection', false)
    await setPlain('ac_outlets', 4)
    await setPlain('cable_length_m', 1.5)
    // The plain strip carries NO surge_rating_joules row at all — the
    // rating is absent, never a displayed 0.
    const plainSpecs = raw
      .prepare(
        `SELECT d.key FROM product_specs ps JOIN attribute_definitions d ON d.id = ps.definition_id WHERE ps.product_id = ?`,
      )
      .all(plain) as Array<{ key: string }>
    expect(plainSpecs.map((s) => s.key)).not.toContain('surge_rating_joules')
    expect((await validateProduct(db, surge))?.status).toBe('passed')
    expect((await validateProduct(db, plain))?.status).toBe('passed')
  })

  it('VR-4 (Stage 05.3): the conditional surge rules are engine-enforced', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)
    // Stage 05.3 (FI-2): this test pinned the VR-4 gap until this
    // stage; flipping it is its documented lifecycle. Violation of
    // the Revision 2 rule on two axes at once: a product declaring
    // surge_protection = true with NO joule rating, and a plain strip
    // carrying the old, prohibited 0-joule value. The write path
    // stores both (types are correct); the engine now reads the spec
    // values, so both must FAIL validation.
    const noRating = await addDraft(db, actor, 'power-strips-surge-protectors', 'fixture-surge-no-rating')
    await setProductSpecs(db, actor, noRating, [
      { definitionId: defId(raw, 'power-strips-surge-protectors', 'surge_protection'), value: true },
    ])
    const vNoRating = await validateProduct(db, noRating)
    expect(vNoRating?.status).toBe('failed')
    expect(vNoRating?.issues.some((i) => i.code === 'missing_surge_rating')).toBe(true)

    const zeroJoules = await addDraft(db, actor, 'power-strips-surge-protectors', 'fixture-strip-zero-joules')
    await setProductSpecs(db, actor, zeroJoules, [
      { definitionId: defId(raw, 'power-strips-surge-protectors', 'surge_protection'), value: false },
    ])
    await setProductSpecs(db, actor, zeroJoules, [
      { definitionId: defId(raw, 'power-strips-surge-protectors', 'surge_rating_joules'), value: 0 },
    ])
    const vZero = await validateProduct(db, zeroJoules)
    expect(vZero?.status).toBe('failed')
    expect(vZero?.issues.some((i) => i.code === 'surge_rating_on_plain_strip')).toBe(true)
  })

  it('R5 basic floor: ergonomic supports fail without the floor and pass with it', async () => {
    const { db, raw } = freshCatalogDb()
    seedTaxonomy(raw)
    const actor = await owner(db)

    // Floor violation 1: no editorial summary.
    const noSummary = await addDraft(db, actor, 'ergonomic-supports', 'fixture-support-no-summary', '')
    await setProductSpecs(db, actor, noSummary, [
      { definitionId: defId(raw, 'ergonomic-supports', 'thickness_cm'), value: 5 },
    ])
    const v1 = await validateProduct(db, noSummary)
    expect(v1?.status).toBe('failed')
    expect(v1?.issues.some((i) => i.code === 'missing_summary')).toBe(true)

    // Floor violation 2: summary but zero recorded specifications.
    const noSpecs = await addDraft(db, actor, 'ergonomic-supports', 'fixture-support-no-specs')
    const v2 = await validateProduct(db, noSpecs)
    expect(v2?.status).toBe('failed')
    expect(v2?.issues.some((i) => i.code === 'missing_specs')).toBe(true)

    // Floor-complete: identity + original summary + >= 1 manufacturer-
    // published spec recorded (the category has NO required technical
    // attributes — one honestly published value satisfies the engine's
    // spec term) + a lawful offer. Validates, publishes through the
    // gate, and computes indexable.
    const complete = await addDraft(db, actor, 'ergonomic-supports', 'fixture-support-complete')
    await setProductSpecs(db, actor, complete, [
      { definitionId: defId(raw, 'ergonomic-supports', 'thickness_cm'), value: 5 },
    ])
    addLawfulOffer(raw, complete)
    const v3 = await runProductValidation(db, actor, complete)
    expect(v3?.status).toBe('passed')
    expect(await transitionProductStatus(db, actor, complete, 'published')).toEqual({ ok: true })
    const idx = await productIndexability(db, complete)
    expect(idx?.indexable).toBe(true)
    expect(idx?.reasons).toEqual([])
  })
})
