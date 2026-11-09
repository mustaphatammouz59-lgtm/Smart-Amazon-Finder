// Admin product management — Stage 04 §9: CRUD, typed specs, the validation
// engine, and the publish gate together with its public-visibility effect.
import { describe, expect, it } from 'vitest'
import { createProduct, transitionProductStatus, type AdminActor } from '../app/lib/db/admin'
import {
  createVariant,
  deleteVariant,
  getAdminProduct,
  listAdminProducts,
  listVariants,
  setProductAttributes,
  setProductSpecs,
  updateProduct,
} from '../app/lib/db/admin-products'
import { runProductValidation, validateProduct } from '../app/lib/product-validation'
import { getProductBySlug } from '../app/lib/db/catalog'
import { freshCatalogDb } from './helpers/sqlite-d1'

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

async function productId(db: D1Database, slug: string): Promise<number> {
  const row = await db.prepare('SELECT id FROM products WHERE slug = ?').bind(slug).first<{ id: number }>()
  if (!row) throw new Error(`product ${slug} missing`)
  return row.id
}

async function definitionId(db: D1Database, key: string): Promise<number> {
  const row = await db
    .prepare('SELECT id FROM attribute_definitions WHERE key = ?')
    .bind(key)
    .first<{ id: number }>()
  if (!row) throw new Error(`definition ${key} missing`)
  return row.id
}

describe('admin product listing', () => {
  it('lists all products including drafts and failed-validation rows', async () => {
    const { db } = freshCatalogDb()
    const { items, nextCursor } = await listAdminProducts(db, {})
    expect(items).toHaveLength(6)
    expect(nextCursor).toBeNull()
  })

  it('filters by status, validation status, category and search text', async () => {
    const { db } = freshCatalogDb()
    expect((await listAdminProducts(db, { status: 'draft' })).items.map((p) => p.slug)).toEqual([
      'dev-fixture-draft-product',
    ])
    expect((await listAdminProducts(db, { validationStatus: 'failed' })).items).toHaveLength(1)
    expect((await listAdminProducts(db, { categorySlug: 'home-office' })).items).toHaveLength(4)
    expect((await listAdminProducts(db, { q: 'DESK RISER' })).items.map((p) => p.slug)).toEqual([
      'dev-fixture-desk-riser',
    ])
  })

  it('paginates with an opaque cursor without overlap', async () => {
    const { db } = freshCatalogDb()
    const page1 = await listAdminProducts(db, { limit: 2 })
    expect(page1.items).toHaveLength(2)
    expect(page1.nextCursor).not.toBeNull()
    const page2 = await listAdminProducts(db, { limit: 2, cursor: page1.nextCursor ?? undefined })
    expect(page2.items).toHaveLength(2)
    const ids = new Set([...page1.items, ...page2.items].map((p) => p.id))
    expect(ids.size).toBe(4)
  })
})

describe('admin product updates and audit', () => {
  it('updates fields and writes an audit row', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-lamp')
    expect(await updateProduct(db, actor, id, { name: '[DEV FIXTURE] Renamed Lamp' })).toEqual({ ok: true })
    const audit = await db
      .prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'product.update' AND entity_id = ?")
      .bind(id)
      .first<{ n: number }>()
    expect(audit?.n).toBe(1)
  })

  it('refuses unknown category and brand slugs', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-lamp')
    expect(await updateProduct(db, actor, id, { categorySlug: 'no-such-category' })).toEqual({
      ok: false,
      reason: 'unknown_category',
    })
    expect(await updateProduct(db, actor, id, { brandSlug: 'no-such-brand' })).toEqual({
      ok: false,
      reason: 'unknown_brand',
    })
  })
})

describe('typed product specs', () => {
  it('round-trips typed values and exposes every category definition', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-riser')
    const detail = await getAdminProduct(db, id)
    expect(detail?.specs.map((s) => s.key)).toEqual(['height_adjustable', 'max_load_kg', 'warranty_years', 'width_cm'])
    const warranty = await definitionId(db, 'warranty_years')
    expect(await setProductSpecs(db, actor, id, [{ definitionId: warranty, value: 5 }])).toEqual({ ok: true })
    const after = await getAdminProduct(db, id)
    expect(after?.specs.find((s) => s.key === 'warranty_years')?.value_number).toBe(5)
    // Clearing with null removes the stored value.
    expect(await setProductSpecs(db, actor, id, [{ definitionId: warranty, value: null }])).toEqual({ ok: true })
    const cleared = await getAdminProduct(db, id)
    expect(cleared?.specs.find((s) => s.key === 'warranty_years')?.value_number).toBeNull()
  })

  it('rejects type mismatches and definitions from other categories before mutating', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-riser')
    const adjustable = await definitionId(db, 'height_adjustable')
    expect(await setProductSpecs(db, actor, id, [{ definitionId: adjustable, value: 'yes' }])).toEqual({
      ok: false,
      reason: 'type_mismatch',
      definitionId: adjustable,
    })
    const usbPorts = await definitionId(db, 'usb_c_ports')
    expect(await setProductSpecs(db, actor, id, [{ definitionId: usbPorts, value: 3 }])).toEqual({
      ok: false,
      reason: 'unknown_definition',
      definitionId: usbPorts,
    })
  })

  it('replaces editorial attributes as a set', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-lamp')
    expect(
      await setProductAttributes(db, actor, id, [
        { key: 'occasion', value: 'birthday' },
        { key: 'audience', value: 'colleague' },
      ]),
    ).toEqual({ ok: true })
    const detail = await getAdminProduct(db, id)
    expect(detail?.attributes).toEqual([
      { key: 'audience', value: 'colleague' },
      { key: 'occasion', value: 'birthday' },
    ])
    expect(await setProductAttributes(db, actor, id, [{ key: 'Bad Key', value: 'x' }])).toEqual({
      ok: false,
      reason: 'invalid_key',
    })
  })
})

describe('product variants', () => {
  it('creates, conflicts on duplicates and deletes', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-riser')
    const created = await createVariant(db, actor, id, { variantKey: 'size-large', label: 'Large' })
    expect('id' in created).toBe(true)
    expect(await createVariant(db, actor, id, { variantKey: 'size-large', label: 'Large again' })).toEqual({
      conflict: true,
    })
    expect(await listVariants(db, id)).toHaveLength(1)
    if ('id' in created) {
      expect(await deleteVariant(db, actor, id, created.id)).toEqual({ ok: true })
      expect(await deleteVariant(db, actor, id, created.id)).toEqual({ ok: false })
    }
  })
})

describe('validation engine and the publish gate', () => {
  it('fails a bare product with summary and specs errors, then passes when complete', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'stage04-bare',
      name: 'Stage04 Bare Product',
    })
    expect('id' in created).toBe(true)
    if (!('id' in created)) return
    const id = created.id

    const first = await validateProduct(db, id)
    expect(first?.status).toBe('failed')
    const codes = (first?.issues ?? []).map((i) => i.code)
    expect(codes).toContain('missing_summary')
    expect(codes).toContain('missing_specs')

    // The gate is closed while validation has not passed.
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({
      ok: false,
      reason: 'validation_gate',
    })

    await updateProduct(db, actor, id, { editorialSummary: 'A complete editorial summary.' })
    const warranty = await definitionId(db, 'warranty_years')
    await setProductSpecs(db, actor, id, [{ definitionId: warranty, value: 2 }])
    expect((await runProductValidation(db, actor, id)).status).toBe('passed')
    const row = await db
      .prepare('SELECT validation_status, validated_at FROM products WHERE id = ?')
      .bind(id)
      .first<{ validation_status: string; validated_at: string | null }>()
    expect(row?.validation_status).toBe('passed')
    expect(row?.validated_at).not.toBeNull()

    // Published + passed + manual-entry source → visible to the public DAL.
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
    expect(await getProductBySlug(db, 'stage04-bare', false)).not.toBeNull()

    // Unpublishing hides it again.
    expect(await transitionProductStatus(db, actor, id, 'draft')).toEqual({ ok: true })
    expect(await getProductBySlug(db, 'stage04-bare', false)).toBeNull()
  })

  it('excludes a published product from public queries when re-validation fails', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'stage04-regression',
      name: 'Stage04 Regression Product',
      editorialSummary: 'Summary present.',
    })
    if (!('id' in created)) throw new Error('create failed')
    const warranty = await definitionId(db, 'warranty_years')
    await setProductSpecs(db, actor, created.id, [{ definitionId: warranty, value: 1 }])
    expect((await runProductValidation(db, actor, created.id)).status).toBe('passed')
    expect(await transitionProductStatus(db, actor, created.id, 'published')).toEqual({ ok: true })
    expect(await getProductBySlug(db, 'stage04-regression', false)).not.toBeNull()

    await updateProduct(db, actor, created.id, { editorialSummary: '' })
    expect((await runProductValidation(db, actor, created.id)).status).toBe('failed')
    expect(await getProductBySlug(db, 'stage04-regression', false)).toBeNull()
  })

  it('flags an expired licence as a validation error', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'stage04-expired',
      name: 'Stage04 Expired Product',
      editorialSummary: 'Summary present.',
    })
    if (!('id' in created)) throw new Error('create failed')
    await updateProduct(db, actor, created.id, { licenceStatus: 'expired' })
    const result = await validateProduct(db, created.id)
    expect(result?.issues.some((i) => i.code === 'licence_expired' && i.severity === 'error')).toBe(true)
    expect(result?.status).toBe('failed')
  })
})
