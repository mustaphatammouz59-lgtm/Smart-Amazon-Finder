import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createProduct, transitionProductStatus, type AdminActor } from '../../app/lib/db/admin'
import { setProductSpecs, updateProduct } from '../../app/lib/db/admin-products'
import { addProductMedia } from '../../app/lib/db/admin-media'
import { createOffer, updateOffer } from '../../app/lib/db/admin-commerce'
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
} from '../../app/lib/offer-validation'
import { getAlternatives, getProductBySlug, listProducts } from '../../app/lib/db/catalog'
import { getProductOffers } from '../../app/lib/db/offers'
import { searchProducts } from '../../app/lib/db/search'

/**
 * Stage 04.4 regression suite — NF-2 (MEDIUM, Stage 04.3): validation
 * verdict persistence was not concurrency-safe. runProductValidation /
 * runOfferValidation computed a verdict across several statements and
 * persisted it with an UNCONDITIONAL update, so an invalidating edit
 * landing mid-run was overwritten by the stale verdict:
 * computed=passed → stored 'passed' → live validation 'failed'.
 *
 * The fix splits each run into begin (capture the input snapshot +
 * compute over it) and commit (a single conditional UPDATE that
 * re-states the snapshot in its WHERE clause; zero changed rows means
 * the data moved and the verdict is discarded as
 * 'data_changed_retry_required'). These tests drive the EXACT audit
 * interleaving through the real DAL and real persistence — the
 * conditional write is never mocked.
 */

type Raw = ReturnType<typeof freshCatalogDb>['raw']

function owner(raw: Raw): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

function productFlags(raw: Raw, productId: number): { status: string; validation_status: string } {
  return raw
    .prepare('SELECT status, validation_status FROM products WHERE id = ?')
    .get(productId) as { status: string; validation_status: string }
}

function offerStatus(raw: Raw, offerId: number): string {
  const row = raw.prepare('SELECT validation_status FROM offers WHERE id = ?').get(offerId) as {
    validation_status: string
  }
  return row.validation_status
}

function lastValidateAudit(raw: Raw, action: string): string {
  const row = raw
    .prepare('SELECT after_json FROM audit_logs WHERE action = ? ORDER BY id DESC LIMIT 1')
    .get(action) as { after_json: string }
  return row.after_json
}

async function definitionId(raw: Raw, key: string): Promise<number> {
  const row = raw
    .prepare(
      `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
        WHERE c.slug = 'home-office' AND d.key = ?`,
    )
    .get(key) as { id: number }
  return row.id
}

/** Create a fully valid product, validate it and publish it. */
async function publishedProduct(raw: Raw, db: D1Database, actor: AdminActor, slug: string) {
  const created = await createProduct(db, actor, {
    categorySlug: 'home-office',
    slug,
    name: 'Concurrency Widget',
    editorialSummary: 'A thoroughly described widget.',
  })
  if (!('id' in created)) throw new Error('create failed')
  const id = created.id
  const boolDef = await definitionId(raw, 'height_adjustable')
  await setProductSpecs(db, actor, id, [{ definitionId: boolDef, value: true }])
  expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
  expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
  return id
}

async function expectInvisibleEverywhere(db: D1Database, slug: string) {
  expect(await getProductBySlug(db, slug, false)).toBeNull()
  const listed = await listProducts(db, { includeFixtures: false, limit: 60 })
  expect(listed.items.map((i) => i.slug)).not.toContain(slug)
  const searched = await searchProducts(db, { q: 'Concurrency Widget', includeFixtures: false })
  expect(searched.items.map((i) => i.slug)).not.toContain(slug)
  expect(await getAlternatives(db, slug, false)).toBeNull()
}

describe('NF-2 product validate-vs-edit race', () => {
  it('the exact Stage 04.3 interleaving: a mid-run summary edit discards the stale passed verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'race-widget')
    expect(await getProductBySlug(db, 'race-widget', false)).not.toBeNull()

    // Phase 1: a validation run starts over the valid, published data.
    const begun = await beginProductValidation(db, id)
    expect(begun).not.toBeNull()
    expect(begun!.validation.status).toBe('passed')

    // Mid-run: a real invalidating edit lands through the actual DAL
    // (data write + F-01 invalidation to 'pending').
    expect(await updateProduct(db, actor, id, { editorialSummary: '' })).toEqual({ ok: true })
    expect(productFlags(raw, id).validation_status).toBe('pending')

    // Phase 2: the stale verdict must be DISCARDED, never persisted.
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.status).toBe('passed') // the computation is reported…
    expect(committed.persistence).toBe('data_changed_retry_required') // …but not stored
    expect(productFlags(raw, id)).toEqual({ status: 'published', validation_status: 'pending' })
    expect((await validateProduct(db, id))?.status).toBe('failed')
    await expectInvisibleEverywhere(db, 'race-widget')

    // The audit trail records the discard honestly.
    expect(lastValidateAudit(raw, 'product.validate')).toContain('data_changed_retry_required')

    // A fresh validation of the changed data produces — and persists —
    // the correct failed verdict.
    const fresh = await runProductValidation(db, actor, id)
    expect(fresh?.status).toBe('failed')
    expect(fresh?.persistence).toBe('persisted')
    expect(productFlags(raw, id).validation_status).toBe('failed')
    await expectInvisibleEverywhere(db, 'race-widget')
  })

  it('a mid-run specs wipe discards the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'race-specs-widget')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    const boolDef = await definitionId(raw, 'height_adjustable')
    expect(await setProductSpecs(db, actor, id, [{ definitionId: boolDef, value: null }])).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(productFlags(raw, id).validation_status).toBe('pending')
    expect((await validateProduct(db, id))?.status).toBe('failed')
  })

  it('a mid-run media add discards the verdict (warning-level inputs are guarded too)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'race-media-widget')
    const begun = await beginProductValidation(db, id)
    expect(begun!.validation.status).toBe('passed')
    const added = await addProductMedia(db, actor, id, { key: 'products/x/race.png' })
    expect('id' in added).toBe(true)
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(productFlags(raw, id).validation_status).toBe('pending')
  })

  it('commit with no intervening change persists the verdict (draft and published)', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'calm-widget',
      name: 'Calm Widget',
      editorialSummary: 'Described.',
    })
    if (!('id' in created)) throw new Error('create failed')
    const boolDef = await definitionId(raw, 'height_adjustable')
    await setProductSpecs(db, actor, created.id, [{ definitionId: boolDef, value: true }])
    const begun = await beginProductValidation(db, created.id)
    const committed = await commitProductValidation(db, actor, created.id, begun!)
    expect(committed.persistence).toBe('persisted')
    expect(productFlags(raw, created.id).validation_status).toBe('passed')
    expect(lastValidateAudit(raw, 'product.validate')).toContain('"persisted"')
  })

  it('concurrent validations of an unchanged product behave deterministically', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'race-calm-widget')
    const first = await beginProductValidation(db, id)
    const second = await beginProductValidation(db, id)
    const a = await commitProductValidation(db, actor, id, first!)
    const b = await commitProductValidation(db, actor, id, second!)
    expect(a.persistence).toBe('persisted')
    expect(b.persistence).toBe('persisted')
    expect(a.status).toBe(b.status)
    expect(productFlags(raw, id)).toEqual({ status: 'published', validation_status: 'passed' })
    expect(await getProductBySlug(db, 'race-calm-widget', false)).not.toBeNull()
  })

  it('an edit to a non-verdict field (model_ref) does NOT discard the verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'race-model-widget')
    const begun = await beginProductValidation(db, id)
    // model_ref is not read by the validation engine; the edit still
    // invalidates conservatively (F-01), but the in-flight verdict was
    // computed over inputs that did not change, so it may persist.
    expect(await updateProduct(db, actor, id, { modelRef: 'MK-II' })).toEqual({ ok: true })
    const committed = await commitProductValidation(db, actor, id, begun!)
    expect(committed.persistence).toBe('persisted')
    expect(productFlags(raw, id)).toEqual({ status: 'published', validation_status: 'passed' })
    expect(await getProductBySlug(db, 'race-model-widget', false)).not.toBeNull()
  })
})

describe('NF-2 offer validate-vs-edit race', () => {
  async function passedOffer(raw: Raw, db: D1Database, actor: AdminActor) {
    const productId = await publishedProduct(raw, db, actor, 'race-offer-widget')
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
    const run = await runOfferValidation(db, actor, created.id)
    expect(run?.status).toBe('passed')
    expect(run?.persistence).toBe('persisted')
    return { productId, offerId: created.id }
  }

  it('the exact interleaving: a mid-run licence expiry discards the stale passed verdict', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { productId, offerId } = await passedOffer(raw, db, actor)
    let offers = await getProductOffers(db, productId)
    expect(offers[0]?.price_cents).toBe(4200)
    expect(offers[0]?.destination_url).toBe('https://merchant.example/widget')

    // Phase 1: validation begins over the valid offer.
    const begun = await beginOfferValidation(db, offerId)
    expect(begun).not.toBeNull()
    expect(begun!.validation.status).toBe('passed')

    // Mid-run: the licence is expired through the real DAL (which also
    // resets the stored verdict to 'pending' in the same statement).
    expect(await updateOffer(db, actor, offerId, { licenceStatus: 'expired' })).toEqual({ ok: true })
    expect(offerStatus(raw, offerId)).toBe('pending')

    // Phase 2: the stale verdict is discarded; exposure follows the
    // CURRENT row (expired licence + pending verdict → nothing shown).
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.status).toBe('passed')
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerStatus(raw, offerId)).toBe('pending')
    expect(lastValidateAudit(raw, 'offer.validate')).toContain('data_changed_retry_required')
    offers = await getProductOffers(db, productId)
    expect(offers[0]?.price_cents).toBeNull()
    expect(offers[0]?.destination_url).toBeNull()

    // A fresh run computes — and persists — the correct failure.
    const fresh = await runOfferValidation(db, actor, offerId)
    expect(fresh?.status).toBe('failed')
    expect(fresh?.persistence).toBe('persisted')
    expect(offerStatus(raw, offerId)).toBe('failed')
  })

  it('a mid-run price edit discards; revalidation then exposes the CURRENT price', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { productId, offerId } = await passedOffer(raw, db, actor)
    const begun = await beginOfferValidation(db, offerId)
    expect(begun!.validation.status).toBe('passed')
    expect(await updateOffer(db, actor, offerId, { currentPriceCents: 9999 })).toEqual({ ok: true })
    const committed = await commitOfferValidation(db, actor, offerId, begun!)
    expect(committed.persistence).toBe('data_changed_retry_required')
    expect(offerStatus(raw, offerId)).toBe('pending')
    const fresh = await runOfferValidation(db, actor, offerId)
    expect(fresh?.status).toBe('passed')
    expect(fresh?.persistence).toBe('persisted')
    const offers = await getProductOffers(db, productId)
    expect(offers[0]?.price_cents).toBe(9999)
  })

  it('concurrent validations of an unchanged offer behave deterministically', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const { offerId } = await passedOffer(raw, db, actor)
    const first = await beginOfferValidation(db, offerId)
    const second = await beginOfferValidation(db, offerId)
    const a = await commitOfferValidation(db, actor, offerId, first!)
    const b = await commitOfferValidation(db, actor, offerId, second!)
    expect(a.persistence).toBe('persisted')
    expect(b.persistence).toBe('persisted')
    expect(a.status).toBe(b.status)
    expect(offerStatus(raw, offerId)).toBe('passed')
  })
})
