import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createJwksServer, type JwksServer } from '../helpers/jwks-server'
import { EMAILS, apiReq, bodyJson, invoke, seedAdminUsers, setupRouteEnv } from '../helpers/route-harness'
import { action as offersCreate } from '../../app/routes/api.admin.offers'
import { action as offerPatch } from '../../app/routes/api.admin.offer'
import { createProduct, type AdminActor } from '../../app/lib/db/admin'

/**
 * Stage 04.6 route-level suite — Part C (04.5-F2 residual): the
 * NF-3 `invalid_observed_at` → HTTP 400 mapping in the two admin offer
 * routes had DAL-level tests (Stage 04.4) but no route-level test.
 * These cases drive the REAL route modules (real JWKS auth, sqlite D1,
 * stub bindings) and assert the full contract for an unparseable
 * priceObservedAt:
 *
 *   - HTTP 400 with the structured VALIDATION_FAILED envelope and a
 *     fields.priceObservedAt message (the DAL conflict mapping, not a
 *     schema rejection — the zod layer accepts any short string);
 *   - no offer row is created / the stored row is byte-unchanged;
 *   - no success response and NO audit row (a rejected write must not
 *     leave a misleading 'offer.create' / 'offer.update' trail);
 *   - and that valid timestamps (ISO-Z, ISO with offset) still succeed
 *     and are stored in the canonical UTC SQLite form.
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

beforeEach(() => {
  const fresh = freshCatalogDb()
  db = fresh.db
  raw = fresh.raw
  seedAdminUsers(raw)
  setupRouteEnv(db, jwks)
})

function ownerActor(): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

async function setupProduct(): Promise<{ productId: number; merchantId: number }> {
  const created = await createProduct(db, ownerActor(), {
    categorySlug: 'home-office',
    slug: 'nf3-route-widget',
    name: 'NF3 Route Widget',
    editorialSummary: 'A widget for timestamp route tests.',
  })
  if (!('id' in created)) throw new Error('product create failed')
  const merchant = raw.prepare("SELECT id FROM merchants WHERE slug = 'devmerchant'").get() as { id: number }
  return { productId: created.id, merchantId: merchant.id }
}

function offerCount(productId: number): number {
  return (raw.prepare('SELECT COUNT(*) AS n FROM offers WHERE product_id = ?').get(productId) as { n: number }).n
}

function auditCount(action: string): number {
  return (raw.prepare('SELECT COUNT(*) AS n FROM audit_logs WHERE action = ?').get(action) as { n: number }).n
}

function storedObservedAt(offerId: number): string | null {
  return (raw.prepare('SELECT price_observed_at FROM offers WHERE id = ?').get(offerId) as { price_observed_at: string | null })
    .price_observed_at
}

async function expectInvalidObservedAt(res: Response): Promise<void> {
  expect(res.status).toBe(400)
  const body = (await bodyJson(res)) as { error?: { code?: string; fields?: Record<string, string> } }
  expect(body.error?.code).toBe('VALIDATION_FAILED')
  expect(body.error?.fields?.priceObservedAt).toContain('ISO 8601')
}

describe('NF-3 route mapping: POST /api/admin/offers (create)', () => {
  it('a Julian-day timestamp is rejected 400 — no row, no audit, no success body', async () => {
    const { productId, merchantId } = await setupProduct()
    const res = await invoke(
      offersCreate,
      apiReq('/api/admin/offers', {
        method: 'POST',
        token: tokens.editor,
        json: {
          productId,
          merchantId,
          destinationUrl: 'https://merchant.example/widget',
          currency: 'USD',
          currentPriceCents: 4200,
          // Valid to SQLite's julianday(), unparseable to the shared
          // strict parser — the NF-3 divergence value.
          priceObservedAt: '2461000.5',
          licenceStatus: 'licensed',
        },
      }),
    )
    await expectInvalidObservedAt(res)
    expect(offerCount(productId)).toBe(0)
    expect(auditCount('offer.create')).toBe(0)
  })

  it('a valid ISO-Z timestamp succeeds (201) and is stored canonical UTC', async () => {
    const { productId, merchantId } = await setupProduct()
    const res = await invoke(
      offersCreate,
      apiReq('/api/admin/offers', {
        method: 'POST',
        token: tokens.editor,
        json: {
          productId,
          merchantId,
          destinationUrl: 'https://merchant.example/widget',
          currency: 'USD',
          currentPriceCents: 4200,
          priceObservedAt: '2026-11-09T08:30:00Z',
          licenceStatus: 'licensed',
        },
      }),
    )
    expect(res.status).toBe(201)
    const id = ((await bodyJson(res)).data as { id: number }).id
    expect(storedObservedAt(id)).toBe('2026-11-09 08:30:00')
    expect(auditCount('offer.create')).toBe(1)
  })
})

describe('NF-3 route mapping: PATCH /api/admin/offers/:id (update)', () => {
  async function createValidOffer(): Promise<number> {
    const { productId, merchantId } = await setupProduct()
    const res = await invoke(
      offersCreate,
      apiReq('/api/admin/offers', {
        method: 'POST',
        token: tokens.editor,
        json: {
          productId,
          merchantId,
          destinationUrl: 'https://merchant.example/widget',
          currency: 'USD',
          currentPriceCents: 4200,
          priceObservedAt: '2026-11-09T08:30:00Z',
          licenceStatus: 'licensed',
        },
      }),
    )
    expect(res.status).toBe(201)
    return ((await bodyJson(res)).data as { id: number }).id
  }

  it('an unparseable timestamp is rejected 400 — row and audit untouched', async () => {
    const offerId = await createValidOffer()
    const auditsBefore = auditCount('offer.update')
    const res = await invoke(
      offerPatch,
      apiReq(`/api/admin/offers/${offerId}`, {
        method: 'PATCH',
        token: tokens.editor,
        json: { priceObservedAt: '2461000.5' },
      }),
      { id: String(offerId) },
    )
    await expectInvalidObservedAt(res)
    expect(storedObservedAt(offerId)).toBe('2026-11-09 08:30:00')
    expect(auditCount('offer.update')).toBe(auditsBefore)
  })

  it('a valid offset timestamp succeeds (200) and canonicalizes to UTC', async () => {
    const offerId = await createValidOffer()
    const res = await invoke(
      offerPatch,
      apiReq(`/api/admin/offers/${offerId}`, {
        method: 'PATCH',
        token: tokens.editor,
        json: { priceObservedAt: '2026-11-09T10:00:00+02:00' },
      }),
      { id: String(offerId) },
    )
    expect(res.status).toBe(200)
    expect(storedObservedAt(offerId)).toBe('2026-11-09 08:00:00')
    expect(auditCount('offer.update')).toBe(1)
  })
})
