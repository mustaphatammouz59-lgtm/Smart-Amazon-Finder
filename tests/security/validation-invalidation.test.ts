import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createProduct, transitionProductStatus, type AdminActor } from '../../app/lib/db/admin'
import { setProductAttributes, setProductSpecs, updateProduct } from '../../app/lib/db/admin-products'
import { addProductMedia, deleteMediaRow, setPrimaryMedia } from '../../app/lib/db/admin-media'
import { createOffer, updateOffer } from '../../app/lib/db/admin-commerce'
import { runProductValidation, validateProduct } from '../../app/lib/product-validation'
import { runOfferValidation } from '../../app/lib/offer-validation'
import { getProductBySlug, listProducts } from '../../app/lib/db/catalog'
import { getProductOffers } from '../../app/lib/db/offers'
import { searchProducts } from '../../app/lib/db/search'

/**
 * Stage 04.2 regression suite — F-01 (HIGH): a stored validation verdict
 * must never outlive the data it was computed over.
 *
 * The audit proved end-to-end that a published + passed product edited
 * into invalidity (summary cleared, specs wiped) stayed publicly visible
 * in detail, lists and FTS search, and that an offer whose licence was
 * set to expired kept its 'passed' flag. The fix: every successful
 * gate-relevant write resets validation_status to 'pending' in the same
 * step (products via invalidateProductValidation, offers inside the
 * UPDATE statement itself), and the FTS projection is refreshed with it.
 */

type Raw = ReturnType<typeof freshCatalogDb>['raw']

function owner(raw: Raw): AdminActor {
  const row = raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
  return row
}

function flags(raw: Raw, productId: number): { status: string; validation_status: string } {
  return raw
    .prepare('SELECT status, validation_status FROM products WHERE id = ?')
    .get(productId) as { status: string; validation_status: string }
}

async function definitionId(raw: Raw, categorySlug: string, key: string): Promise<number> {
  const row = raw
    .prepare(
      `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
        WHERE c.slug = ? AND d.key = ?`,
    )
    .get(categorySlug, key) as { id: number }
  return row.id
}

/** Create a product, give it specs + a summary, validate and publish it. */
async function publishedProduct(raw: Raw, db: D1Database, actor: AdminActor, slug: string) {
  const created = await createProduct(db, actor, {
    categorySlug: 'home-office',
    slug,
    name: 'Lifecycle Widget',
    editorialSummary: 'A thoroughly described widget.',
  })
  if (!('id' in created)) throw new Error('create failed')
  const id = created.id
  const boolDef = await definitionId(raw, 'home-office', 'height_adjustable')
  await setProductSpecs(db, actor, id, [{ definitionId: boolDef, value: true }])
  const validation = await runProductValidation(db, actor, id)
  expect(validation?.status).toBe('passed')
  expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
  return id
}

async function expectInvisible(db: D1Database, slug: string) {
  expect(await getProductBySlug(db, slug, false)).toBeNull()
  const listed = await listProducts(db, { includeFixtures: false, limit: 60 })
  expect(listed.items.map((i) => i.slug)).not.toContain(slug)
  const searched = await searchProducts(db, { q: 'Lifecycle Widget', includeFixtures: false })
  expect(searched.items.map((i) => i.slug)).not.toContain(slug)
}

async function expectVisible(db: D1Database, slug: string) {
  expect(await getProductBySlug(db, slug, false)).not.toBeNull()
  const searched = await searchProducts(db, { q: 'Lifecycle Widget', includeFixtures: false })
  expect(searched.items.map((i) => i.slug)).toContain(slug)
}

describe('F-01 full regression lifecycle (brief §4)', () => {
  it('create → validate → publish → visible → clear summary → invisible everywhere → revalidate → publish → visible', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'lifecycle-widget')
    await expectVisible(db, 'lifecycle-widget')

    // The audit's exact reproduction: clear the summary.
    expect(await updateProduct(db, actor, id, { editorialSummary: '' })).toEqual({ ok: true })
    // Live validation now FAILS — and the stored verdict no longer claims otherwise.
    expect((await validateProduct(db, id))?.status).toBe('failed')
    expect(flags(raw, id)).toEqual({ status: 'published', validation_status: 'pending' })
    await expectInvisible(db, 'lifecycle-widget')

    // Revalidation records the failure; the gate stays shut.
    expect((await runProductValidation(db, actor, id))?.status).toBe('failed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({
      ok: false,
      reason: 'validation_gate',
    })
    await expectInvisible(db, 'lifecycle-widget')

    // Restore the data, revalidate, republish: visible again.
    expect(await updateProduct(db, actor, id, { editorialSummary: 'Restored summary.' })).toEqual({ ok: true })
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
    await expectVisible(db, 'lifecycle-widget')
  })

  it('specs wipe invalidates (a product left with no specs was publicly visible)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'specs-widget')
    await expectVisible(db, 'specs-widget')
    const boolDef = await definitionId(raw, 'home-office', 'height_adjustable')
    expect(await setProductSpecs(db, actor, id, [{ definitionId: boolDef, value: null }])).toEqual({ ok: true })
    expect(flags(raw, id).validation_status).toBe('pending')
    await expectInvisible(db, 'specs-widget')
  })

  it('licence expiry invalidates, and revalidation then fails', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'licence-widget')
    expect(await updateProduct(db, actor, id, { licenceStatus: 'expired' })).toEqual({ ok: true })
    expect(flags(raw, id).validation_status).toBe('pending')
    await expectInvisible(db, 'licence-widget')
    const v = await runProductValidation(db, actor, id)
    expect(v?.status).toBe('failed')
    expect(v?.issues.some((i) => i.code === 'licence_expired')).toBe(true)
  })

  it('category change invalidates', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'category-widget')
    expect(await updateProduct(db, actor, id, { categorySlug: 'electronics-accessories' })).toEqual({ ok: true })
    expect(flags(raw, id).validation_status).toBe('pending')
    await expectInvisible(db, 'category-widget')
  })

  it('attributes rewrite invalidates (uniform rule for product-owned data)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'attributes-widget')
    expect(await setProductAttributes(db, actor, id, [{ key: 'gift_for', value: 'gamers' }])).toEqual({ ok: true })
    expect(flags(raw, id).validation_status).toBe('pending')
    await expectInvisible(db, 'attributes-widget')
  })

  it('media add and delete invalidate; reordering (setPrimary) does not', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'media-widget')
    const added = await addProductMedia(db, actor, id, { key: 'products/x/widget.png' })
    if (!('id' in added)) throw new Error('media add failed')
    expect(flags(raw, id).validation_status).toBe('pending')
    await expectInvisible(db, 'media-widget')

    // Restore: revalidate + republish, then reorder — ordering is not a
    // validation input, so the verdict must survive a primary swap.
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
    const added2 = await addProductMedia(db, actor, id, { key: 'products/x/widget-2.png' })
    if (!('id' in added2)) throw new Error('media add 2 failed')
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
    expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
    expect(await setPrimaryMedia(db, actor, added2.id)).toEqual({ ok: true })
    expect(flags(raw, id).validation_status).toBe('passed')
    await expectVisible(db, 'media-widget')

    // Deleting media invalidates again.
    expect((await deleteMediaRow(db, actor, added2.id)).ok).toBe(true)
    expect(flags(raw, id).validation_status).toBe('pending')
    await expectInvisible(db, 'media-widget')
  })

  it('a REJECTED mutation invalidates nothing and changes nothing', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'stable-widget')
    const numDef = await definitionId(raw, 'home-office', 'max_load_kg')
    // Type mismatch: rejected before any write.
    expect(await setProductSpecs(db, actor, id, [{ definitionId: numDef, value: 'heavy' }])).toEqual({
      ok: false,
      reason: 'type_mismatch',
      definitionId: numDef,
    })
    // Unknown category: rejected before any write.
    expect(await updateProduct(db, actor, id, { categorySlug: 'no-such-category' })).toEqual({
      ok: false,
      reason: 'unknown_category',
    })
    expect(flags(raw, id)).toEqual({ status: 'published', validation_status: 'passed' })
    await expectVisible(db, 'stable-widget')
  })

  it('publish cannot resurrect a product invalidated after its validation read (F-13)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    // Passed but not yet published; an edit lands before the publish call.
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'race-widget',
      name: 'Race Widget',
      editorialSummary: 'Ready.',
    })
    if (!('id' in created)) throw new Error('create failed')
    const boolDef = await definitionId(raw, 'home-office', 'height_adjustable')
    await setProductSpecs(db, actor, created.id, [{ definitionId: boolDef, value: true }])
    expect((await runProductValidation(db, actor, created.id))?.status).toBe('passed')
    await updateProduct(db, actor, created.id, { editorialSummary: '' })
    // The conditional UPDATE in transitionProductStatus re-checks the gate
    // at write time — the stale 'passed' the caller may have seen is void.
    expect(await transitionProductStatus(db, actor, created.id, 'published')).toEqual({
      ok: false,
      reason: 'validation_gate',
    })
    expect(flags(raw, created.id).status).toBe('draft')
  })
})

describe('F-01 offer-side invalidation', () => {
  it('licence → expired on a passed offer: verdict voided in the same write, price + link withdrawn', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const productId = await publishedProduct(raw, db, actor, 'offer-widget')
    const merchant = raw.prepare("SELECT id FROM merchants WHERE slug = 'devmerchant'").get() as { id: number }
    const created = await createOffer(db, actor, {
      productId,
      merchantId: merchant.id,
      destinationUrl: 'https://merchant.example/widget',
      currency: 'USD',
      currentPriceCents: 4200,
      priceObservedAt: new Date().toISOString(),
      licenceStatus: 'licensed',
    })
    if (!('id' in created)) throw new Error('offer create failed')
    expect((await runOfferValidation(db, actor, created.id))?.status).toBe('passed')
    let offers = await getProductOffers(db, productId)
    expect(offers[0]?.price_cents).toBe(4200)
    expect(offers[0]?.destination_url).toBe('https://merchant.example/widget')

    expect(await updateOffer(db, actor, created.id, { licenceStatus: 'expired' })).toEqual({ ok: true })
    const stored = raw.prepare('SELECT validation_status FROM offers WHERE id = ?').get(created.id) as {
      validation_status: string
    }
    expect(stored.validation_status).toBe('pending')
    offers = await getProductOffers(db, productId)
    expect(offers[0]?.price_cents).toBeNull()
    expect(offers[0]?.destination_url).toBeNull()

    // Revalidation now fails (price stored under an expired licence).
    expect((await runOfferValidation(db, actor, created.id))?.status).toBe('failed')
  })

  it('any offer edit (price, URL, currency) resets the verdict; an empty patch does not', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
    const merchantRow = raw
      .prepare("INSERT INTO merchants (slug, name, base_domain) VALUES ('m-inv', 'Inv Merchant', 'inv.example') RETURNING id")
      .get() as { id: number }
    const created = await createOffer(db, actor, {
      productId: product.id,
      merchantId: merchantRow.id,
      destinationUrl: 'https://inv.example/item',
      licenceStatus: 'licensed',
      currentPriceCents: 1000,
      priceObservedAt: new Date().toISOString(),
    })
    if (!('id' in created)) throw new Error('offer create failed')
    expect((await runOfferValidation(db, actor, created.id))?.status).toBe('passed')
    expect(await updateOffer(db, actor, created.id, {})).toEqual({ ok: true })
    let stored = raw.prepare('SELECT validation_status FROM offers WHERE id = ?').get(created.id) as {
      validation_status: string
    }
    expect(stored.validation_status).toBe('passed')
    expect(await updateOffer(db, actor, created.id, { currentPriceCents: 1100 })).toEqual({ ok: true })
    stored = raw.prepare('SELECT validation_status FROM offers WHERE id = ?').get(created.id) as {
      validation_status: string
    }
    expect(stored.validation_status).toBe('pending')
  })

  it('a REJECTED offer edit leaves the verdict untouched', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
    const merchantRow = raw
      .prepare("INSERT INTO merchants (slug, name, base_domain) VALUES ('m-rej', 'Rej Merchant', 'rej.example') RETURNING id")
      .get() as { id: number }
    const created = await createOffer(db, actor, {
      productId: product.id,
      merchantId: merchantRow.id,
      destinationUrl: 'https://rej.example/item',
      licenceStatus: 'licensed',
    })
    if (!('id' in created)) throw new Error('offer create failed')
    expect((await runOfferValidation(db, actor, created.id))?.status).toBe('passed')
    expect(await updateOffer(db, actor, created.id, { destinationUrl: 'javascript:alert(1)' })).toEqual({
      ok: false,
      reason: 'invalid_destination',
    })
    const stored = raw
      .prepare('SELECT validation_status, destination_url FROM offers WHERE id = ?')
      .get(created.id) as { validation_status: string; destination_url: string }
    expect(stored.validation_status).toBe('passed')
    expect(stored.destination_url).toBe('https://rej.example/item')
  })
})
