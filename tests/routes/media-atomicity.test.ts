import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createJwksServer, type JwksServer } from '../helpers/jwks-server'
import { ADMIN_BASE, EMAILS, apiReq, expectError, invoke, seedAdminUsers, setupRouteEnv } from '../helpers/route-harness'
import { action as mediaUpload } from '../../app/routes/api.admin.product-media'
import { action as mediaAction } from '../../app/routes/api.admin.media'
import { loader as publicProduct } from '../../app/routes/api.v1.product'
import { createProduct, transitionProductStatus, type AdminActor } from '../../app/lib/db/admin'
import { setProductSpecs } from '../../app/lib/db/admin-products'
import { addProductMedia } from '../../app/lib/db/admin-media'
import { runProductValidation } from '../../app/lib/product-validation'

/**
 * Stage 04.6 route-level suite — 04.5-F1 §5.4 ordering between R2 and
 * D1. R2 is not transactional with D1, so the routes order operations
 * so the publication invariant never depends on R2:
 *
 *  - CREATE: object uploaded first, then the D1 row + verdict reset
 *    commit atomically inside the DAL. If the D1 commit fails, the
 *    route removes the object best-effort; an object whose cleanup
 *    also fails is an unreferenced orphan (no row points at it).
 *  - DELETE: the D1 row + verdict reset commit FIRST; the object is
 *    deleted afterwards, best-effort. A failing object delete still
 *    returns success with the row gone and the product unpublished —
 *    under the Stage 04 order (object first) the same failure aborted
 *    the request and left the row in place, so these assertions
 *    distinguish the two orders.
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

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ...new Array(32).fill(0),
])

function uploadRequest(productId: number, token: string): Request {
  const form = new FormData()
  form.set('file', new File([PNG_BYTES as BlobPart], 'widget.png', { type: 'application/octet-stream' }))
  const headers = new Headers()
  headers.set('Cf-Access-Jwt-Assertion', token)
  headers.set('Origin', ADMIN_BASE)
  return new Request(`${ADMIN_BASE}/api/admin/products/${productId}/media`, { method: 'POST', headers, body: form })
}

function ownerActor(): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

/** A published + validation-passed product, built through the real DAL. */
async function publishedProduct(slug: string): Promise<number> {
  const actor = ownerActor()
  const created = await createProduct(db, actor, {
    categorySlug: 'home-office',
    slug,
    name: 'Route Atomicity Widget',
    editorialSummary: 'A thoroughly described widget.',
  })
  if (!('id' in created)) throw new Error('create failed')
  const def = raw
    .prepare(
      `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
        WHERE c.slug = 'home-office' AND d.key = 'height_adjustable'`,
    )
    .get() as { id: number }
  await setProductSpecs(db, actor, created.id, [{ definitionId: def.id, value: true }])
  expect((await runProductValidation(db, actor, created.id))?.status).toBe('passed')
  expect(await transitionProductStatus(db, actor, created.id, 'published')).toEqual({ ok: true })
  return created.id
}

function productValidation(rawDb: typeof raw, productId: number): string {
  return (rawDb.prepare('SELECT validation_status FROM products WHERE id = ?').get(productId) as { validation_status: string })
    .validation_status
}

describe('media create ordering (R2 first, atomic D1 commit, cleanup on failure)', () => {
  it('upload to a published product: object stored, row committed, product immediately unpublished', async () => {
    const pid = await publishedProduct('r2-create')
    const visible = await invoke(publicProduct, apiReq('/api/v1/products/r2-create'), { slug: 'r2-create' })
    expect(visible.status).toBe(200)

    const res = await invoke(mediaUpload, uploadRequest(pid, tokens.editor), { id: String(pid) })
    expect(res.status).toBe(201)
    expect(env.bucket.objects.size).toBe(1)
    expect(raw.prepare('SELECT COUNT(*) AS n FROM product_media WHERE product_id = ?').get(pid)).toEqual({ n: 1 })
    expect(productValidation(raw, pid)).toBe('pending')
    await expectError(await invoke(publicProduct, apiReq('/api/v1/products/r2-create'), { slug: 'r2-create' }), 404, 'NOT_FOUND')
  })

  it('D1 commit failure after a successful upload: route cleans the object up, no row remains', async () => {
    const pid = await publishedProduct('r2-create-fail')
    // Re-wire the env to a db whose batch (the DAL's atomic commit)
    // always fails — the upload itself still succeeds against R2.
    const failingDb = {
      ...db,
      batch: async () => {
        throw new Error('injected D1 batch failure')
      },
    } as D1Database
    env = setupRouteEnv(failingDb, jwks)

    const res = await invoke(mediaUpload, uploadRequest(pid, tokens.editor), { id: String(pid) })
    expect(res.status).toBe(500)
    // Cleanup ran: the orphaned object was removed again.
    expect(env.bucket.objects.size).toBe(0)
    expect(raw.prepare('SELECT COUNT(*) AS n FROM product_media WHERE product_id = ?').get(pid)).toEqual({ n: 0 })
    // The failed mutation changed nothing: verdict and visibility stand.
    expect(productValidation(raw, pid)).toBe('passed')
    const visible = await invoke(publicProduct, apiReq('/api/v1/products/r2-create-fail'), { slug: 'r2-create-fail' })
    expect(visible.status).toBe(200)
  })
})

describe('media delete ordering (D1 commits first, object delete is best-effort after)', () => {
  async function publishedProductWithMedia(slug: string): Promise<{ pid: number; mediaId: number; key: string }> {
    const pid = await publishedProduct(slug)
    const actor = ownerActor()
    const key = `products/${pid}/seed.png`
    const added = await addProductMedia(db, actor, pid, { key })
    if (!('id' in added)) throw new Error('media seed failed')
    env.bucket.objects.set(key, { body: PNG_BYTES, contentType: 'image/png' })
    // Re-validate + re-publish so the delete starts from a live verdict.
    expect((await runProductValidation(db, actor, pid))?.status).toBe('passed')
    expect(productValidation(raw, pid)).toBe('passed')
    return { pid, mediaId: added.id, key }
  }

  it('happy path: row and object both removed, product unpublished', async () => {
    const { pid, mediaId, key } = await publishedProductWithMedia('r2-delete')
    const res = await invoke(
      mediaAction,
      apiReq(`/api/admin/media/${mediaId}`, { method: 'DELETE', token: tokens.editor }),
      { id: String(mediaId) },
    )
    expect(res.status).toBe(200)
    expect(raw.prepare('SELECT COUNT(*) AS n FROM product_media WHERE id = ?').get(mediaId)).toEqual({ n: 0 })
    expect(env.bucket.objects.has(key)).toBe(false)
    expect(productValidation(raw, pid)).toBe('pending')
    await expectError(await invoke(publicProduct, apiReq('/api/v1/products/r2-delete'), { slug: 'r2-delete' }), 404, 'NOT_FOUND')
  })

  it('R2 delete failure after the D1 commit: request still succeeds, row gone, object orphaned', async () => {
    const { pid, mediaId, key } = await publishedProductWithMedia('r2-delete-orphan')
    env.bucket.delete = async () => {
      throw new Error('injected R2 delete failure')
    }
    const res = await invoke(
      mediaAction,
      apiReq(`/api/admin/media/${mediaId}`, { method: 'DELETE', token: tokens.editor }),
      { id: String(mediaId) },
    )
    // Under the Stage 04 order this request FAILED (object delete ran
    // first and aborted the route) and the row survived; now the D1
    // commit stands and only the object remains, unreferenced.
    expect(res.status).toBe(200)
    expect(raw.prepare('SELECT COUNT(*) AS n FROM product_media WHERE id = ?').get(mediaId)).toEqual({ n: 0 })
    expect(productValidation(raw, pid)).toBe('pending')
    expect(env.bucket.objects.has(key)).toBe(true)
  })
})
