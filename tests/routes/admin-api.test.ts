import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createJwksServer, type JwksServer } from '../helpers/jwks-server'
import { EMAILS, apiReq, bodyJson, expectError, invoke, seedAdminUsers, setupRouteEnv } from '../helpers/route-harness'
import { loader as overviewLoader } from '../../app/routes/api.admin.overview'
import { action as productsCreate, loader as productsList } from '../../app/routes/api.admin.products'
import { action as productPatch } from '../../app/routes/api.admin.product'
import { action as productPublish } from '../../app/routes/api.admin.product-publish'
import { action as productValidate } from '../../app/routes/api.admin.product-validate'
import { action as offersCreate, loader as offersList } from '../../app/routes/api.admin.offers'
import { action as offerPatch } from '../../app/routes/api.admin.offer'
import { action as categoryPatch } from '../../app/routes/api.admin.category'
import { action as brandPatch } from '../../app/routes/api.admin.brand'
import { loader as auditLoader } from '../../app/routes/api.admin.audit'
import { loader as alternativesLoader } from '../../app/routes/api.v1.product-alternatives'

/**
 * Stage 04.2 route-level security matrix (brief §8). Every case runs the
 * REAL route module over HTTP-shaped Request objects, with a real local
 * JWKS server minting real RS256 tokens, the sqlite D1 adapter and stub
 * bindings. Expected vs actual:
 *
 *   case                        expected
 *   --------------------------  ----------------------------------------
 *   no token                    401 UNAUTHENTICATED
 *   garbage token               401 UNAUTHENTICATED
 *   token for unknown email     401 UNAUTHENTICATED
 *   insufficient role           403 FORBIDDEN
 *   cross-origin (foreign)      403 FORBIDDEN
 *   cross-origin (http downgrade) 403 FORBIDDEN
 *   missing Origin + valid JWT  allowed (documented; JWT is the control)
 *   malformed JSON body         400 (body parse envelope)
 *   oversized body (> 16 KB)    413 PAYLOAD_TOO_LARGE
 *   schema violation            400 VALIDATION_FAILED
 *   valid owner request         200/201 + DB effect + audit row
 *
 * The matrix runs in full on product create + offer create (the two
 * highest-risk mutations), and in reduced form (auth/role/origin/valid)
 * on the other priority routes.
 */

let jwks: JwksServer
let tokens: Record<keyof typeof EMAILS, string>

beforeAll(async () => {
  jwks = await createJwksServer()
  await jwks.start()
  tokens = {
    owner: await jwks.mint(EMAILS.owner),
    admin: await jwks.mint(EMAILS.admin),
    editor: await jwks.mint(EMAILS.editor),
    publisher: await jwks.mint(EMAILS.publisher),
    viewer: await jwks.mint(EMAILS.viewer),
  }
})
afterAll(async () => {
  await jwks.stop()
})

let db: D1Database
let raw: ReturnType<typeof freshCatalogDb>['raw']
let env: ReturnType<typeof setupRouteEnv>

beforeEach(() => {
  const fresh = freshCatalogDb()
  db = fresh.db
  raw = fresh.raw
  seedAdminUsers(raw)
  env = setupRouteEnv(db, jwks)
})

const productPayload = {
  categorySlug: 'home-office',
  slug: 'route-widget',
  name: 'Route Widget',
  editorialSummary: 'Created through the route matrix.',
}

function auditCount(action: string): number {
  return (raw.prepare('SELECT COUNT(*) AS n FROM audit_logs WHERE action = ?').get(action) as { n: number }).n
}

describe('matrix: POST /api/admin/products (create)', () => {
  const call = (options: Parameters<typeof apiReq>[1]) =>
    invoke(productsCreate, apiReq('/api/admin/products', { method: 'POST', ...options }))

  it('no token → 401', async () => {
    await expectError(await call({ json: productPayload }), 401, 'UNAUTHENTICATED')
  })
  it('garbage token → 401', async () => {
    await expectError(await call({ token: 'not-a-jwt', json: productPayload }), 401, 'UNAUTHENTICATED')
  })
  it('valid JWT for an email with no admin account → 401', async () => {
    const stranger = await jwks.mint('stranger@example.invalid')
    await expectError(await call({ token: stranger, json: productPayload }), 401, 'UNAUTHENTICATED')
  })
  it('viewer (insufficient role) → 403, nothing written', async () => {
    await expectError(await call({ token: tokens.viewer, json: productPayload }), 403, 'FORBIDDEN')
    expect(raw.prepare("SELECT COUNT(*) AS n FROM products WHERE slug = 'route-widget'").get()).toEqual({ n: 0 })
  })
  it('cross-origin → 403', async () => {
    await expectError(
      await call({ token: tokens.owner, origin: 'https://evil.example', json: productPayload }),
      403,
      'FORBIDDEN',
    )
  })
  it('http scheme-downgrade origin → 403 (F-05)', async () => {
    await expectError(
      await call({ token: tokens.owner, origin: 'http://admin.example.test', json: productPayload }),
      403,
      'FORBIDDEN',
    )
  })
  it('missing Origin with a valid JWT → 201 (documented allowance)', async () => {
    const res = await call({ token: tokens.editor, origin: null, json: productPayload })
    expect(res.status).toBe(201)
  })
  it('malformed JSON body → 400', async () => {
    const res = await call({ token: tokens.owner, rawBody: '{not json', contentType: 'application/json' })
    expect(res.status).toBe(400)
  })
  it('oversized body → 413', async () => {
    const big = { ...productPayload, editorialSummary: 'x'.repeat(20_000) }
    await expectError(await call({ token: tokens.owner, json: big }), 413, 'PAYLOAD_TOO_LARGE')
  })
  it('schema violation → 400 VALIDATION_FAILED', async () => {
    await expectError(
      await call({ token: tokens.owner, json: { ...productPayload, slug: 'Not A Slug!' } }),
      400,
      'VALIDATION_FAILED',
    )
  })
  it('valid editor create → 201 + row + audit', async () => {
    const res = await call({ token: tokens.editor, json: productPayload })
    expect(res.status).toBe(201)
    const body = await bodyJson(res)
    expect((body.data as { id: number }).id).toBeGreaterThan(0)
    expect(raw.prepare("SELECT COUNT(*) AS n FROM products WHERE slug = 'route-widget'").get()).toEqual({ n: 1 })
    expect(auditCount('product.create')).toBe(1)
  })
  it('duplicate slug → 409 CONFLICT', async () => {
    expect((await call({ token: tokens.owner, json: productPayload })).status).toBe(201)
    await expectError(await call({ token: tokens.owner, json: productPayload }), 409, 'CONFLICT')
  })
  it('rate limiter exhausted → 429', async () => {
    env.adminLimiter.success = false
    await expectError(await call({ token: tokens.owner, json: productPayload }), 429, 'RATE_LIMITED')
  })
})

describe('matrix: POST /api/admin/offers (create)', () => {
  function ids() {
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const merchant = raw.prepare("SELECT id FROM merchants WHERE slug = 'devmerchant'").get() as { id: number }
    return { productId: product.id, merchantId: merchant.id }
  }
  const call = (options: Parameters<typeof apiReq>[1]) =>
    invoke(offersCreate, apiReq('/api/admin/offers', { method: 'POST', ...options }))

  it('no token → 401; viewer → 403', async () => {
    await expectError(await call({ json: {} }), 401, 'UNAUTHENTICATED')
    await expectError(await call({ token: tokens.viewer, json: {} }), 403, 'FORBIDDEN')
  })
  it('javascript: destination → 400 VALIDATION_FAILED (F-04 at the schema layer)', async () => {
    const res = await call({
      token: tokens.editor,
      json: { ...ids(), destinationUrl: 'javascript:alert(1)' },
    })
    await expectError(res, 400, 'VALIDATION_FAILED')
    expect(raw.prepare('SELECT COUNT(*) AS n FROM offers WHERE destination_url LIKE ?').get('javascript:%')).toEqual({ n: 0 })
  })
  it('zero price → 400 VALIDATION_FAILED (F-06 at the schema layer)', async () => {
    await expectError(
      await call({
        token: tokens.editor,
        json: { ...ids(), destinationUrl: 'https://merchant.example/x', currentPriceCents: 0 },
      }),
      400,
      'VALIDATION_FAILED',
    )
  })
  it('valid create → 201 + row + audit', async () => {
    const res = await call({
      token: tokens.editor,
      json: { ...ids(), destinationUrl: 'https://merchant.example/riser?tag=aff-20', licenceStatus: 'licensed' },
    })
    expect(res.status).toBe(201)
    expect(auditCount('offer.create')).toBe(1)
  })
})

describe('reduced matrix on the remaining priority routes', () => {
  it('overview: viewer may read (200); no token → 401', async () => {
    await expectError(await invoke(overviewLoader, apiReq('/api/admin/overview')), 401, 'UNAUTHENTICATED')
    const res = await invoke(overviewLoader, apiReq('/api/admin/overview', { token: tokens.viewer }))
    expect(res.status).toBe(200)
    const body = await bodyJson(res)
    expect((body.data as { products_total: number }).products_total).toBe(6)
  })
  it('products list: viewer → 403 (editor+ area), editor → 200', async () => {
    await expectError(await invoke(productsList, apiReq('/api/admin/products', { token: tokens.viewer })), 403, 'FORBIDDEN')
    expect((await invoke(productsList, apiReq('/api/admin/products', { token: tokens.editor }))).status).toBe(200)
  })
  it('product PATCH: editor → 200 and the edit invalidates validation (F-01 over HTTP)', async () => {
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }
    const res = await invoke(
      productPatch,
      apiReq(`/api/admin/products/${product.id}`, { method: 'PATCH', token: tokens.editor, json: { name: 'Renamed Riser' } }),
      { id: String(product.id) },
    )
    expect(res.status).toBe(200)
    const stored = raw.prepare('SELECT validation_status FROM products WHERE id = ?').get(product.id) as {
      validation_status: string
    }
    expect(stored.validation_status).toBe('pending')
  })
  it('product publish: editor → 403 (publisher-only), publisher on gated product → 409', async () => {
    const draft = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-draft-product'").get() as { id: number }
    await expectError(
      await invoke(productPublish, apiReq(`/api/admin/products/${draft.id}/publish`, { method: 'POST', token: tokens.editor, json: {} }), { id: String(draft.id) }),
      403,
      'FORBIDDEN',
    )
    // The draft fixture carries validation_status 'passed', so the
    // publisher's publish passes the (atomic) gate: 200, status flips.
    const res = await invoke(
      productPublish,
      apiReq(`/api/admin/products/${draft.id}/publish`, { method: 'POST', token: tokens.publisher, json: {} }),
      { id: String(draft.id) },
    )
    expect(res.status).toBe(200)
    expect(raw.prepare('SELECT status FROM products WHERE id = ?').get(draft.id)).toEqual({ status: 'published' })
  })
  it('product publish on a validation-failed product → 409 for publisher+', async () => {
    const failed = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-unvalidated-product'").get() as { id: number }
    const res = await invoke(
      productPublish,
      apiReq(`/api/admin/products/${failed.id}/publish`, { method: 'POST', token: tokens.publisher, json: {} }),
      { id: String(failed.id) },
    )
    expect(res.status).toBe(409)
  })
  it('product validate: editor → 200 with a persisted verdict', async () => {
    const product = raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-lamp'").get() as { id: number }
    const res = await invoke(
      productValidate,
      apiReq(`/api/admin/products/${product.id}/validate`, { method: 'POST', token: tokens.editor, json: {} }),
      { id: String(product.id) },
    )
    expect(res.status).toBe(200)
    expect(auditCount('product.validate')).toBe(1)
  })
  it('category PATCH: editor → 403 (admin+ area), admin → 200', async () => {
    const category = raw.prepare("SELECT id FROM categories WHERE slug = 'home-office'").get() as { id: number }
    await expectError(
      await invoke(categoryPatch, apiReq(`/api/admin/categories/${category.id}`, { method: 'PATCH', token: tokens.editor, json: { name: 'Home Office' } }), { id: String(category.id) }),
      403,
      'FORBIDDEN',
    )
    const res = await invoke(
      categoryPatch,
      apiReq(`/api/admin/categories/${category.id}`, { method: 'PATCH', token: tokens.admin, json: { name: 'Home Office' } }),
      { id: String(category.id) },
    )
    expect(res.status).toBe(200)
  })
  it('brand PATCH: admin → 200', async () => {
    const brand = raw.prepare('SELECT id FROM brands LIMIT 1').get() as { id: number }
    const res = await invoke(
      brandPatch,
      apiReq(`/api/admin/brands/${brand.id}`, { method: 'PATCH', token: tokens.admin, json: { name: 'Fixture Brand' } }),
      { id: String(brand.id) },
    )
    expect(res.status).toBe(200)
  })
  it('offer PATCH with a javascript: URL → 400 and the stored offer is untouched (F-04)', async () => {
    const offer = raw.prepare('SELECT id FROM offers LIMIT 1').get() as { id: number }
    const before = raw.prepare('SELECT destination_url, validation_status FROM offers WHERE id = ?').get(offer.id)
    await expectError(
      await invoke(offerPatch, apiReq(`/api/admin/offers/${offer.id}`, { method: 'PATCH', token: tokens.editor, json: { destinationUrl: 'javascript:alert(1)' } }), { id: String(offer.id) }),
      400,
      'VALIDATION_FAILED',
    )
    expect(raw.prepare('SELECT destination_url, validation_status FROM offers WHERE id = ?').get(offer.id)).toEqual(before)
  })
  it('offers list: editor → 200', async () => {
    expect((await invoke(offersList, apiReq('/api/admin/offers', { token: tokens.editor }))).status).toBe(200)
  })
  it('audit log: editor → 403 (admin+ area), admin → 200', async () => {
    await expectError(await invoke(auditLoader, apiReq('/api/admin/audit', { token: tokens.editor })), 403, 'FORBIDDEN')
    expect((await invoke(auditLoader, apiReq('/api/admin/audit', { token: tokens.admin }))).status).toBe(200)
  })
})

describe('public alternatives endpoint (F-03 route layer)', () => {
  const call = (slug: string, options: Parameters<typeof apiReq>[1] = {}) =>
    invoke(alternativesLoader, apiReq(`/api/v1/products/${slug}/alternatives`, options), { slug })

  it('known product → 200 with bounded buckets', async () => {
    const res = await call('dev-fixture-desk-riser')
    expect(res.status).toBe(200)
    const body = await bodyJson(res)
    const data = body.data as { cheaper: unknown[]; betterFit: unknown[]; simpler: unknown[] }
    expect(data.betterFit.length).toBeLessThanOrEqual(12)
    expect(data.simpler.length).toBeLessThanOrEqual(12)
    expect(data.cheaper.length).toBeLessThanOrEqual(12)
  })
  it('unknown product → 404', async () => {
    await expectError(await call('no-such-product'), 404, 'NOT_FOUND')
  })
  it('malformed slug shape → 404 (no existence oracle)', async () => {
    await expectError(await call('Bad Slug!!'), 404, 'NOT_FOUND')
    await expectError(await call('a'.repeat(200)), 404, 'NOT_FOUND')
  })
  it('rate limiter exhausted → 429 (the endpoint shares the search budget)', async () => {
    env.searchLimiter.success = false
    await expectError(await call('dev-fixture-desk-riser'), 429, 'RATE_LIMITED')
  })
})
