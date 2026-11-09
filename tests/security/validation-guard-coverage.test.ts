import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createProduct, transitionProductStatus, type AdminActor } from '../../app/lib/db/admin'
import { setProductSpecs, updateProduct } from '../../app/lib/db/admin-products'
import {
  createMerchant,
  createOffer,
  createProgram,
  updateOffer,
  updateProgram,
} from '../../app/lib/db/admin-commerce'
import {
  beginProductValidation,
  commitProductValidation,
  runProductValidation,
  validateProduct,
} from '../../app/lib/product-validation'
import {
  beginOfferValidation,
  commitOfferValidation,
  runOfferValidation,
  validateOffer,
} from '../../app/lib/offer-validation'

/**
 * Stage 04.6 regression suite — 04.5-F2 (LOW, confirmed): the NF-2
 * snapshot guards in commitProductValidation / commitOfferValidation
 * re-check 22 input conditions, but the Stage 04.4 committed suite
 * detected removal of only 5 of them (product editorial_summary,
 * spec count, media count; offer current_price_cents, licence_status).
 * The other 17 conditions were correct in the shipped SQL and were
 * probe-proven by the 04.5 auditor, but had no durable committed test.
 *
 * This suite adds exactly one interleaving test per missing condition,
 * derived from the 04.5 §4.4 removal matrix — same construction as the
 * original suite (begin → ONE input changes mid-run through the real
 * DAL → commit must discard), so that removing or weakening that one
 * guard condition makes exactly this test fail (mutation-verified for
 * all 17 during Stage 04.6; results in the stage report). Conditions
 * with no DAL writer (product slug; category/merchant/product
 * existence) are mutated with raw SQL on the test connection — the
 * guard under test is fully real either way; the audit established
 * those arms are structurally unreachable through the DAL (in-use
 * deletes are refused), which is precisely why they need a committed
 * test that does not depend on a DAL path existing.
 *
 * The 17 conditions covered here:
 *   product: name, slug, category_id, brand_id, licence_status,
 *            category-EXISTS, offer-count
 *   offer:   destination_url, merchant_id, product_id, program_id,
 *            currency, price_observed_at, availability_state,
 *            merchant-EXISTS, product-EXISTS, program-status
 */

type Raw = ReturnType<typeof freshCatalogDb>['raw']

function owner(raw: Raw): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

function productValidationStatus(raw: Raw, productId: number): string {
  return (raw.prepare('SELECT validation_status FROM products WHERE id = ?').get(productId) as { validation_status: string })
    .validation_status
}

function offerValidationStatus(raw: Raw, offerId: number): string {
  return (raw.prepare('SELECT validation_status FROM offers WHERE id = ?').get(offerId) as { validation_status: string })
    .validation_status
}

function definitionId(raw: Raw, key: string): number {
  const row = raw
    .prepare(
      `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
        WHERE c.slug = 'home-office' AND d.key = ?`,
    )
    .get(key) as { id: number }
  return row.id
}

function merchantId(raw: Raw, slug: string): number {
  return (raw.prepare('SELECT id FROM merchants WHERE slug = ?').get(slug) as { id: number }).id
}

/** Create a fully valid product, validate it (passed) and publish it. */
async function publishedProduct(raw: Raw, db: D1Database, actor: AdminActor, slug: string): Promise<number> {
  const created = await createProduct(db, actor, {
    categorySlug: 'home-office',
    slug,
    name: 'Guard Widget',
    editorialSummary: 'A thoroughly described widget.',
  })
  if (!('id' in created)) throw new Error('create failed')
  await setProductSpecs(db, actor, created.id, [
    { definitionId: definitionId(raw, 'height_adjustable'), value: true },
  ])
  expect((await runProductValidation(db, actor, created.id))?.status).toBe('passed')
  expect(await transitionProductStatus(db, actor, created.id, 'published')).toEqual({ ok: true })
  return created.id
}

/** A passed offer on a fresh published product (devmerchant, USD 42.00). */
async function passedOffer(
  raw: Raw,
  db: D1Database,
  actor: AdminActor,
  slug: string,
  extra: { programId?: number; availabilityState?: string | null } = {},
): Promise<{ productId: number; offerId: number }> {
  const productId = await publishedProduct(raw, db, actor, slug)
  const created = await createOffer(db, actor, {
    productId,
    merchantId: merchantId(raw, 'devmerchant'),
    programId: extra.programId,
    destinationUrl: 'https://merchant.example/widget',
    currency: 'USD',
    currentPriceCents: 4200,
    priceObservedAt: new Date().toISOString(),
    availabilityState: extra.availabilityState,
    licenceStatus: 'licensed',
  })
  if (!('id' in created)) throw new Error('offer create failed')
  const run = await runOfferValidation(db, actor, created.id)
  expect(run?.status).toBe('passed')
  expect(run?.persistence).toBe('persisted')
  return { productId, offerId: created.id }
}

describe('NF-2 guard coverage — product conditions (04.5-F2)', () => {
  it('guard: product name — a mid-run rename discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-name')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateProduct(db, actor, id, { name: 'Guard Renamed Widget' })).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(productValidationStatus(raw, id)).toBe('pending')
  })

  it('guard: product slug — a mid-run slug change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-slug')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    // No DAL path mutates slug after creation, so the mid-run change is
    // written with raw SQL; the verdict the run computed over the old
    // slug must still be discarded, and a fresh run over the (invalid)
    // new slug must fail — the exact stale-pass shape NF-2 exists to
    // prevent.
    raw.prepare('UPDATE products SET slug = ? WHERE id = ?').run('INVALID SLUG', id)
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    const fresh = await runProductValidation(db, actor, id)
    expect(fresh?.status).toBe('failed')
    expect(productValidationStatus(raw, id)).toBe('failed')
  })

  it('guard: product category_id — a mid-run category change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-category')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateProduct(db, actor, id, { categorySlug: 'electronics-accessories' })).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(productValidationStatus(raw, id)).toBe('pending')
  })

  it('guard: product brand_id — a mid-run brand assignment discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-brand')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateProduct(db, actor, id, { brandSlug: 'devbrand' })).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(productValidationStatus(raw, id)).toBe('pending')
  })

  it('guard: product licence_status — a mid-run licence expiry discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-licence')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateProduct(db, actor, id, { licenceStatus: 'expired' })).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(productValidationStatus(raw, id)).toBe('pending')
    const fresh = await runProductValidation(db, actor, id)
    expect(fresh?.status).toBe('failed')
  })

  it('guard: product category existence — the category vanishing mid-run discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-category-exists')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    // deleteCategory refuses while a product references the category,
    // so this state is unreachable through the DAL; the guard term is
    // still load-bearing defence, exercised here with raw SQL
    // (FK enforcement suspended on the test connection only).
    raw.exec('PRAGMA foreign_keys=OFF')
    const categoryId = (raw.prepare('SELECT category_id FROM products WHERE id = ?').get(id) as { category_id: number })
      .category_id
    raw.prepare('DELETE FROM categories WHERE id = ?').run(categoryId)
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect((await validateProduct(db, id))?.status).toBe('failed')
  })

  it('guard: product offer count — a mid-run offer creation discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'guard-offer-count')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    const offer = await createOffer(db, actor, {
      productId: id,
      merchantId: merchantId(raw, 'devmerchant'),
      destinationUrl: 'https://merchant.example/widget',
      currency: 'USD',
      currentPriceCents: 4200,
      priceObservedAt: new Date().toISOString(),
      licenceStatus: 'licensed',
    })
    expect('id' in offer).toBe(true)
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    // Unlike the DAL-edit arms, nothing invalidated the product here:
    // offer creation does not reset the product verdict (the count is
    // a warning-only input, so the stored 'passed' remains CORRECT —
    // a fresh run over the new count still passes and persists). The
    // guard's job in this arm is only to stop the IN-FLIGHT run from
    // persisting a verdict computed over the old count.
    const fresh = await runProductValidation(db, actor, id)
    expect(fresh?.status).toBe('passed')
    expect(fresh?.persistence).toBe('persisted')
    expect(productValidationStatus(raw, id)).toBe('passed')
  })
})

describe('NF-2 guard coverage — offer conditions (04.5-F2)', () => {
  it('guard: offer destination_url — a mid-run destination change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { offerId } = await passedOffer(raw, db, actor, 'guard-destination')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateOffer(db, actor, offerId, { destinationUrl: 'https://other.example/item' })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer merchant_id — a mid-run merchant change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const other = await createMerchant(db, actor, {
      slug: 'guardmerchant',
      name: 'Guard Merchant',
      baseDomain: 'guard.example',
    })
    if (!('id' in other)) throw new Error('merchant create failed')
    const { offerId } = await passedOffer(raw, db, actor, 'guard-merchant')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateOffer(db, actor, offerId, { merchantId: other.id })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer product_id — a mid-run product change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const other = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'guard-other-product',
      name: 'Other Guard Product',
      editorialSummary: 'Another product.',
    })
    if (!('id' in other)) throw new Error('product create failed')
    const { offerId } = await passedOffer(raw, db, actor, 'guard-product')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateOffer(db, actor, offerId, { productId: other.id })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer program_id — switching between two ACTIVE programs mid-run discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const merchant = merchantId(raw, 'devmerchant')
    const programA = await createProgram(db, actor, {
      merchantId: merchant,
      name: 'Guard Program A',
      linkTemplate: 'https://merchant.example/?tag=a',
      status: 'active',
    })
    const programB = await createProgram(db, actor, {
      merchantId: merchant,
      name: 'Guard Program B',
      linkTemplate: 'https://merchant.example/?tag=b',
      status: 'active',
    })
    if (!('id' in programA) || !('id' in programB)) throw new Error('program create failed')
    const { offerId } = await passedOffer(raw, db, actor, 'guard-program', { programId: programA.id })
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    // Both programs are active, so ONLY program_id changes — the
    // program-status term alone could not catch this switch.
    expect(await updateOffer(db, actor, offerId, { programId: programB.id })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer currency — a mid-run currency change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { offerId } = await passedOffer(raw, db, actor, 'guard-currency')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateOffer(db, actor, offerId, { currency: 'EUR' })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer price_observed_at — a mid-run timestamp change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { offerId } = await passedOffer(raw, db, actor, 'guard-observed')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(
      await updateOffer(db, actor, offerId, { priceObservedAt: new Date(Date.now() - 3_600_000).toISOString() }),
    ).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer availability_state — a mid-run availability change discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { offerId } = await passedOffer(raw, db, actor, 'guard-availability')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateOffer(db, actor, offerId, { availabilityState: 'in_stock' })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerValidationStatus(raw, offerId)).toBe('pending')
  })

  it('guard: offer merchant existence — the merchant vanishing mid-run discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { offerId } = await passedOffer(raw, db, actor, 'guard-merchant-exists')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    // deleteMerchant refuses while offers reference the merchant, so
    // this state is unreachable through the DAL; raw SQL exercises the
    // guard term directly (FK enforcement suspended on the test
    // connection only). merchant_id itself does not change.
    raw.exec('PRAGMA foreign_keys=OFF')
    const mid = (raw.prepare('SELECT merchant_id FROM offers WHERE id = ?').get(offerId) as { merchant_id: number })
      .merchant_id
    raw.prepare('DELETE FROM merchants WHERE id = ?').run(mid)
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect((await validateOffer(db, offerId))?.status).toBe('failed')
  })

  it('guard: offer product existence — the product vanishing mid-run discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { productId, offerId } = await passedOffer(raw, db, actor, 'guard-product-exists')
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    // Products are never deleted through the DAL; raw SQL exercises
    // the guard term directly. product_id itself does not change.
    raw.exec('PRAGMA foreign_keys=OFF')
    raw.prepare('DELETE FROM products WHERE id = ?').run(productId)
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect((await validateOffer(db, offerId))?.status).toBe('failed')
  })

  it('guard: offer program status — a mid-run program status flip discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const merchant = merchantId(raw, 'devmerchant')
    const program = await createProgram(db, actor, {
      merchantId: merchant,
      name: 'Guard Program Status',
      linkTemplate: 'https://merchant.example/?tag=s',
      status: 'active',
    })
    if (!('id' in program)) throw new Error('program create failed')
    const { offerId } = await passedOffer(raw, db, actor, 'guard-program-status', { programId: program.id })
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    // program_id does not change — ONLY the linked program's status —
    // so the status subquery term alone must catch this.
    expect(await updateProgram(db, actor, program.id, { status: 'suspended' })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    // updateProgram does not reset the offer's stored verdict, and
    // program status is a warning-only input, so the stored 'passed'
    // remains correct over the new state (a fresh run still passes,
    // now with the program_inactive warning, and persists). The
    // guard's job here is only to stop the IN-FLIGHT run persisting a
    // verdict computed over the old status.
    const fresh = await runOfferValidation(db, actor, offerId)
    expect(fresh?.status).toBe('passed')
    expect(fresh?.persistence).toBe('persisted')
    expect(offerValidationStatus(raw, offerId)).toBe('passed')
  })
})
