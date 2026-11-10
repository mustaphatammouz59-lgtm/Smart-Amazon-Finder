import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createProduct, transitionProductStatus, type AdminActor } from '../../app/lib/db/admin'
import { setProductSpecs } from '../../app/lib/db/admin-products'
import { updateAttributeDefinition } from '../../app/lib/db/admin-taxonomy'
import {
  beginProductValidation,
  commitProductValidation,
  runProductValidation,
  validateProduct,
} from '../../app/lib/product-validation'
import { createTestDb, freshCatalogDb } from '../helpers/sqlite-d1'

/**
 * Stage 05.3 enforcement suite — FI-1 (required attributes, migration
 * 0006 `is_required`) + FI-2 (conditional surge rules VR-4 and
 * certification consistency VR-3) in the product validation engine.
 *
 * Every product here is otherwise complete (name ≥ 3 chars, valid
 * slug, original summary, ≥ 1 spec value) so the rule under test is
 * the only thing that can decide the verdict.
 */

type Raw = ReturnType<typeof freshCatalogDb>['raw']
type DefSpec = [key: string, type: 'number' | 'text' | 'bool', required: boolean]

function owner(raw: Raw): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

/** Insert a root category + its definitions (is_required set via SQL). */
function makeCategory(raw: Raw, slug: string, defs: DefSpec[]): void {
  raw.prepare(`INSERT INTO categories (slug, name, description, sort_order, is_indexable) VALUES (?, ?, 'Stage 05.3 fixture category.', 99, 0)`).run(slug, `Fixture ${slug}`)
  for (const [key, type, required] of defs) {
    raw
      .prepare(
        `INSERT INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
         SELECT id, ?, ?, NULL, ?, 0, 0, 0, ? FROM categories WHERE slug = ?`,
      )
      .run(key, `Fixture ${key}`, type, required ? 1 : 0, slug)
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

async function addProduct(
  db: D1Database,
  actor: AdminActor,
  categorySlug: string,
  slug: string,
): Promise<number> {
  const created = await createProduct(db, actor, {
    categorySlug,
    slug,
    name: `Fixture product ${slug}`,
    editorialSummary: 'An original fixture summary written for Stage 05.3 enforcement testing only.',
  })
  if ('conflict' in created) throw new Error(`product ${slug} conflict`)
  return created.id
}

async function setSpec(
  db: D1Database,
  raw: Raw,
  actor: AdminActor,
  productId: number,
  categorySlug: string,
  key: string,
  value: number | string | boolean,
): Promise<void> {
  const result = await setProductSpecs(db, actor, productId, [
    { definitionId: defId(raw, categorySlug, key), value },
  ])
  expect(result).toEqual({ ok: true })
}

function storedValidationStatus(raw: Raw, productId: number): string {
  return (raw.prepare('SELECT validation_status FROM products WHERE id = ?').get(productId) as { validation_status: string })
    .validation_status
}

function codes(validation: { issues: Array<{ code: string }> } | null): string[] {
  return (validation?.issues ?? []).map((i) => i.code)
}

describe('FI-1: required attributes (VR-2)', () => {
  it('1. a missing required attribute fails validation and publish is refused', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'req-widgets', [
      ['max_load_kg', 'number', true],
      ['foldable', 'bool', false],
    ])
    const id = await addProduct(db, actor, 'req-widgets', 'req-missing')
    await setSpec(db, raw, actor, id, 'req-widgets', 'foldable', true)
    const validation = await runProductValidation(db, actor, id)
    expect(validation?.status).toBe('failed')
    expect(validation?.persistence).toBe('persisted')
    const issue = validation?.issues.find((i) => i.code === 'missing_required_attribute')
    expect(issue?.field).toBe('specs.max_load_kg')
    expect(issue?.severity).toBe('error')
    expect(storedValidationStatus(raw, id)).toBe('failed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({
      ok: false,
      reason: 'validation_gate',
    })
  })

  it('2a. a required text attribute recorded as an empty string fails as missing', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'req-text-widgets', [['connector_type', 'text', true]])
    const id = await addProduct(db, actor, 'req-text-widgets', 'req-text-empty')
    // The DAL accepts '' for a text spec; an empty-text row counts in
    // the legacy spec count but is NO value for the required check.
    await setSpec(db, raw, actor, id, 'req-text-widgets', 'connector_type', '')
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    expect(codes(validation)).toContain('missing_required_attribute')
    expect(codes(validation)).not.toContain('missing_specs')
  })

  it('2b. a required bool recorded as false is a valid recorded value', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'req-bool-widgets', [['height_adjustable', 'bool', true]])
    const id = await addProduct(db, actor, 'req-bool-widgets', 'req-bool-false')
    await setSpec(db, raw, actor, id, 'req-bool-widgets', 'height_adjustable', false)
    const validation = await runProductValidation(db, actor, id)
    expect(validation?.status).toBe('passed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
  })

  it('3. a required number with its value in the wrong column is invalid', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'req-num-widgets', [
      ['max_load_kg', 'number', true],
      ['foldable', 'bool', false],
    ])
    const id = await addProduct(db, actor, 'req-num-widgets', 'req-num-wrong-column')
    await setSpec(db, raw, actor, id, 'req-num-widgets', 'foldable', true)
    // Raw SQL: the write path would refuse this, but a value sitting
    // in value_text on a number definition must read as invalid.
    raw
      .prepare(
        `INSERT INTO product_specs (product_id, definition_id, value_number, value_text, value_bool) VALUES (?, ?, NULL, 'heavy', NULL)`,
      )
      .run(id, defId(raw, 'req-num-widgets', 'max_load_kg'))
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    const issue = validation?.issues.find((i) => i.code === 'invalid_required_attribute')
    expect(issue?.field).toBe('specs.max_load_kg')
  })

  it('4. an optional attribute may be missing without failing', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'opt-widgets', [
      ['height_adjustable', 'bool', true],
      ['warranty_years', 'number', false],
    ])
    const id = await addProduct(db, actor, 'opt-widgets', 'opt-missing-ok')
    await setSpec(db, raw, actor, id, 'opt-widgets', 'height_adjustable', true)
    const validation = await runProductValidation(db, actor, id)
    expect(validation?.status).toBe('passed')
    expect(codes(validation)).not.toContain('missing_required_attribute')
  })

  it('5. publish after a persisted failed validation is refused and the product stays draft', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'gate-widgets', [
      ['max_load_kg', 'number', true],
      ['foldable', 'bool', false],
    ])
    const id = await addProduct(db, actor, 'gate-widgets', 'gate-blocked')
    await setSpec(db, raw, actor, id, 'gate-widgets', 'foldable', false)
    expect((await runProductValidation(db, actor, id))?.status).toBe('failed')
    const attempt = await transitionProductStatus(db, actor, id, 'published')
    expect(attempt.ok).toBe(false)
    expect((raw.prepare('SELECT status FROM products WHERE id = ?').get(id) as { status: string }).status).toBe('draft')
  })

  it('7. editing a validated, published product to remove a required attribute invalidates it and blocks re-publication', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'edit-widgets', [
      ['max_load_kg', 'number', true],
      ['foldable', 'bool', false],
    ])
    const id = await addProduct(db, actor, 'edit-widgets', 'edit-removal')
    await setSpec(db, raw, actor, id, 'edit-widgets', 'max_load_kg', 12)
    await setSpec(db, raw, actor, id, 'edit-widgets', 'foldable', true)
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })

    // The edit: remove the required spec through the real write path.
    // Stage 04.6: the spec delete and the verdict reset commit in one
    // batch, so the stored verdict is voided in the same step.
    const removal = await setProductSpecs(db, actor, id, [
      { definitionId: defId(raw, 'edit-widgets', 'max_load_kg'), value: null },
    ])
    expect(removal).toEqual({ ok: true })
    expect(storedValidationStatus(raw, id)).toBe('pending')

    // Revalidation fails on the now-missing required attribute, and
    // the publish gate refuses to re-assert the published status.
    const revalidation = await runProductValidation(db, actor, id)
    expect(revalidation?.status).toBe('failed')
    expect(codes(revalidation)).toContain('missing_required_attribute')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({
      ok: false,
      reason: 'validation_gate',
    })
  })

  it('8. docks vs hubs: identical dictionaries, ethernet_port required on docks only', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const dictionary = (ethernetRequired: boolean): DefSpec[] => [
      ['usb_c_ports', 'number', true],
      ['ethernet_port', 'bool', ethernetRequired],
    ]
    makeCategory(raw, 'fixture-hubs', dictionary(false))
    makeCategory(raw, 'fixture-docks', dictionary(true))

    const hub = await addProduct(db, actor, 'fixture-hubs', 'hub-no-ethernet')
    await setSpec(db, raw, actor, hub, 'fixture-hubs', 'usb_c_ports', 2)
    expect((await validateProduct(db, hub))?.status).toBe('passed')

    const dock = await addProduct(db, actor, 'fixture-docks', 'dock-no-ethernet')
    await setSpec(db, raw, actor, dock, 'fixture-docks', 'usb_c_ports', 2)
    const dockValidation = await validateProduct(db, dock)
    expect(dockValidation?.status).toBe('failed')
    expect(dockValidation?.issues.find((i) => i.code === 'missing_required_attribute')?.field).toBe(
      'specs.ethernet_port',
    )
  })
})

describe('Stage 05.3 fingerprint guard (begin/commit interleave)', () => {
  it('6a. flipping is_required mid-run discards the verdict; the stored status is unchanged', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'flip-widgets', [
      ['foldable', 'bool', false],
      ['max_load_kg', 'number', false],
    ])
    const id = await addProduct(db, actor, 'flip-widgets', 'flip-required')
    await setSpec(db, raw, actor, id, 'flip-widgets', 'foldable', true)
    const before = storedValidationStatus(raw, id)

    const begun = await beginProductValidation(db, id)
    expect(begun?.validation.status).toBe('passed')
    // Mid-run: max_load_kg becomes required (the DAL path an ingestion
    // or an editor would use). The spec count does not change — only
    // the fingerprint can catch this.
    expect(
      await updateAttributeDefinition(db, actor, defId(raw, 'flip-widgets', 'max_load_kg'), { isRequired: true }),
    ).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(storedValidationStatus(raw, id)).toBe(before)
    // A fresh run over the new flag fails as it should.
    expect((await runProductValidation(db, actor, id))?.status).toBe('failed')
  })

  it('6b. a mid-run spec VALUE change (same spec count) discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    makeCategory(raw, 'flip-power', [
      ['surge_protection', 'bool', true],
      ['surge_rating_joules', 'number', false],
      ['ac_outlets', 'number', false],
    ])
    const id = await addProduct(db, actor, 'flip-power', 'flip-joules')
    await setSpec(db, raw, actor, id, 'flip-power', 'surge_protection', true)
    await setSpec(db, raw, actor, id, 'flip-power', 'surge_rating_joules', 1080)
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')

    const begun = await beginProductValidation(db, id)
    expect(begun?.validation.status).toBe('passed')
    // Raw value change 1080 → 0: identical spec count, identical
    // product row — only the fingerprint sees it.
    raw
      .prepare('UPDATE product_specs SET value_number = 0 WHERE product_id = ? AND definition_id = ?')
      .run(id, defId(raw, 'flip-power', 'surge_rating_joules'))
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    const fresh = await runProductValidation(db, actor, id)
    expect(fresh?.status).toBe('failed')
    expect(codes(fresh)).toContain('invalid_surge_rating')
  })
})

describe('FI-2: conditional surge rules (VR-4)', () => {
  const POWER_DEFS: DefSpec[] = [
    ['surge_protection', 'bool', true],
    ['surge_rating_joules', 'number', false],
    ['ac_outlets', 'number', false],
    ['safety_certification_body', 'text', false],
    ['safety_certification_status', 'text', false],
  ]

  async function powerProduct(
    db: D1Database,
    raw: Raw,
    actor: AdminActor,
    slug: string,
    specs: Array<[string, number | string | boolean]>,
  ): Promise<number> {
    makeCategory(raw, `power-${slug}`, POWER_DEFS)
    const id = await addProduct(db, actor, `power-${slug}`, slug)
    for (const [key, value] of specs) await setSpec(db, raw, actor, id, `power-${slug}`, key, value)
    return id
  }

  it('7a. a surge protector with a 0-joule rating fails as invalid', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await powerProduct(db, raw, actor, 'protector-zero', [
      ['surge_protection', true],
      ['surge_rating_joules', 0],
      ['ac_outlets', 6],
    ])
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    expect(codes(validation)).toContain('invalid_surge_rating')
  })

  it('7b. a surge protector with a valid rating and a verified cert pair passes', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await powerProduct(db, raw, actor, 'protector-valid', [
      ['surge_protection', true],
      ['surge_rating_joules', 1080],
      ['ac_outlets', 6],
      ['safety_certification_body', 'UL'],
      ['safety_certification_status', 'verified_certifier_database'],
    ])
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
  })

  it('7c. a plain strip with no surge rating passes (all required present)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await powerProduct(db, raw, actor, 'plain-strip-ok', [
      ['surge_protection', false],
      ['ac_outlets', 4],
    ])
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
  })
})

describe('FI-2: certification consistency (VR-3)', () => {
  async function certProduct(
    db: D1Database,
    raw: Raw,
    actor: AdminActor,
    slug: string,
    body: string,
    status: string,
  ): Promise<number> {
    makeCategory(raw, `cert-${slug}`, [
      ['safety_certification_body', 'text', false],
      ['safety_certification_status', 'text', false],
    ])
    const id = await addProduct(db, actor, `cert-${slug}`, slug)
    await setSpec(db, raw, actor, id, `cert-${slug}`, 'safety_certification_body', body)
    await setSpec(db, raw, actor, id, `cert-${slug}`, 'safety_certification_status', status)
    return id
  }

  it('9i. CE + a verified status is an unverifiable claim', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await certProduct(db, raw, actor, 'cert-ce-verified', 'CE', 'verified_certifier_database')
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    expect(codes(validation)).toContain('certification_claim_unverifiable')
  })

  it('9ii. FCC + verified manufacturer documentation is an unverifiable claim', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await certProduct(db, raw, actor, 'cert-fcc-verified', 'FCC', 'verified_manufacturer_documentation')
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    expect(codes(validation)).toContain('certification_claim_unverifiable')
  })

  it('9iii. UL + claimed_unverified is honest and passes (not certified, not an error)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await certProduct(db, raw, actor, 'cert-ul-claimed', 'UL', 'claimed_unverified')
    expect((await validateProduct(db, id))?.status).toBe('passed')
  })

  it('9iv. UL + not_certified is contradictory', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await certProduct(db, raw, actor, 'cert-ul-contradiction', 'UL', 'not_certified')
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    expect(codes(validation)).toContain('certification_contradictory')
  })

  it('9v. none + not_certified is an honest uncertified record and passes', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await certProduct(db, raw, actor, 'cert-none', 'none', 'not_certified')
    expect((await validateProduct(db, id))?.status).toBe('passed')
  })

  it('9vi. an out-of-vocabulary body fails as invalid_certification_body', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await certProduct(db, raw, actor, 'cert-acme', 'ACME', 'claimed_unverified')
    const validation = await validateProduct(db, id)
    expect(validation?.status).toBe('failed')
    expect(codes(validation)).toContain('invalid_certification_body')
  })
})

describe('migration 0006', () => {
  it('10. applying 0006 after 0001–0005 adds is_required defaulting existing rows to 0; a fresh full apply seeds all 0', () => {
    const { raw } = createTestDb()
    const dir = join(process.cwd(), 'migrations')
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const file of files.filter((f) => f < '0006')) {
      raw.exec(readFileSync(join(dir, file), 'utf-8'))
    }
    raw
      .prepare(`INSERT INTO categories (slug, name, description, sort_order, is_indexable) VALUES ('mig-cat', 'Mig Cat', NULL, 0, 0)`)
      .run()
    raw
      .prepare(
        `INSERT INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
         SELECT id, 'mig_key', 'Mig Key', NULL, 'number', 0, 0, 0 FROM categories WHERE slug = 'mig-cat'`,
      )
      .run()
    const migration0006 = files.find((f) => f.startsWith('0006'))
    expect(migration0006).toBeDefined()
    raw.exec(readFileSync(join(dir, migration0006!), 'utf-8'))
    const columns = raw.prepare('PRAGMA table_info(attribute_definitions)').all() as Array<{ name: string }>
    expect(columns.map((c) => c.name)).toContain('is_required')
    expect(raw.prepare('SELECT is_required FROM attribute_definitions WHERE key = ?').get('mig_key')).toEqual({
      is_required: 0,
    })

    const fresh = freshCatalogDb()
    const freshColumns = fresh.raw.prepare('PRAGMA table_info(attribute_definitions)').all() as Array<{ name: string }>
    expect(freshColumns.map((c) => c.name)).toContain('is_required')
    const seeded = fresh.raw.prepare('SELECT COUNT(*) AS total, SUM(is_required) AS required_sum FROM attribute_definitions').get() as {
      total: number
      required_sum: number
    }
    expect(seeded.total).toBeGreaterThan(0)
    expect(seeded.required_sum).toBe(0)
  })
})
