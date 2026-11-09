import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createJwksServer, type JwksServer } from '../helpers/jwks-server'
import { ADMIN_BASE, EMAILS, apiReq, bodyJson, expectError, invoke, seedAdminUsers, setupRouteEnv } from '../helpers/route-harness'
import { action as productsCreate } from '../../app/routes/api.admin.products'
import { action as productSpecs } from '../../app/routes/api.admin.product-specs'
import { action as productValidate } from '../../app/routes/api.admin.product-validate'
import { action as productPublish } from '../../app/routes/api.admin.product-publish'
import { action as productPatch } from '../../app/routes/api.admin.product'
import { action as mediaUpload, loader as mediaList } from '../../app/routes/api.admin.product-media'
import { loader as mediaContent } from '../../app/routes/api.admin.media-content'
import { action as mediaPatch } from '../../app/routes/api.admin.media'
import { action as articleStatus } from '../../app/routes/api.admin.article-status'
import { loader as publicProduct } from '../../app/routes/api.v1.product'

/**
 * Stage 04.2 route-level flows: the F-01 lifecycle driven entirely over
 * HTTP route modules, media upload/content round-trip through the R2
 * stub, and editorial status RBAC. Same harness as admin-api.test.ts
 * (real local JWKS, sqlite D1, stub bindings; no production contact).
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

const post = (path: string, token: string, json: unknown = {}) =>
  apiReq(path, { method: 'POST', token, json })

describe('HTTP lifecycle: create → specs → validate → publish → public → edit → gone (F-01)', () => {
  it('runs the whole gate cycle through route modules', async () => {
    // Create (editor).
    const created = await invoke(
      productsCreate,
      post('/api/admin/products', tokens.editor, {
        categorySlug: 'home-office',
        slug: 'http-widget',
        name: 'HTTP Widget',
        editorialSummary: 'A widget created over HTTP.',
      }),
    )
    expect(created.status).toBe(201)
    const id = ((await bodyJson(created)).data as { id: number }).id

    // Specs (editor).
    const def = raw
      .prepare(
        `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
          WHERE c.slug = 'home-office' AND d.key = 'height_adjustable'`,
      )
      .get() as { id: number }
    const specs = await invoke(
      productSpecs,
      apiReq(`/api/admin/products/${id}/specs`, {
        method: 'PUT',
        token: tokens.editor,
        json: { specs: [{ definitionId: def.id, value: true }] },
      }),
      { id: String(id) },
    )
    expect(specs.status).toBe(200)

    // Validate (editor) → passed; publish (publisher) → 200.
    const validated = await invoke(productValidate, post(`/api/admin/products/${id}/validate`, tokens.editor), { id: String(id) })
    expect(validated.status).toBe(200)
    expect(((await bodyJson(validated)).data as { status: string }).status).toBe('passed')
    const published = await invoke(productPublish, post(`/api/admin/products/${id}/publish`, tokens.publisher), { id: String(id) })
    expect(published.status).toBe(200)

    // Publicly visible through the public API.
    const pub = await invoke(publicProduct, apiReq('/api/v1/products/http-widget'), { slug: 'http-widget' })
    expect(pub.status).toBe(200)

    // Edit the summary away (editor): the product vanishes publicly.
    const patched = await invoke(
      productPatch,
      apiReq(`/api/admin/products/${id}`, { method: 'PATCH', token: tokens.editor, json: { editorialSummary: '' } }),
      { id: String(id) },
    )
    expect(patched.status).toBe(200)
    await expectError(await invoke(publicProduct, apiReq('/api/v1/products/http-widget'), { slug: 'http-widget' }), 404, 'NOT_FOUND')

    // And the publisher can no longer publish it (gate holds over HTTP).
    const republish = await invoke(productPublish, post(`/api/admin/products/${id}/publish`, tokens.publisher), { id: String(id) })
    expect(republish.status).toBe(409)
  })
})

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR start
  ...new Array(32).fill(0),
])

function uploadRequest(productId: number, token: string | null, bytes: Uint8Array, filename: string): Request {
  const form = new FormData()
  form.set('file', new File([bytes as BlobPart], filename, { type: 'application/octet-stream' }))
  const headers = new Headers()
  if (token) headers.set('Cf-Access-Jwt-Assertion', token)
  headers.set('Origin', ADMIN_BASE)
  return new Request(`${ADMIN_BASE}/api/admin/products/${productId}/media`, { method: 'POST', headers, body: form })
}

describe('media upload + content round-trip', () => {
  function productId(): number {
    return (raw.prepare("SELECT id FROM products WHERE slug = 'dev-fixture-desk-riser'").get() as { id: number }).id
  }

  it('uploads a real PNG (201), stores it in R2, lists it, serves it back', async () => {
    const pid = productId()
    const res = await invoke(mediaUpload, uploadRequest(pid, tokens.editor, PNG_BYTES, 'widget.png'), { id: String(pid) })
    expect(res.status).toBe(201)
    expect(env.bucket.objects.size).toBe(1)

    const list = await invoke(mediaList, apiReq(`/api/admin/products/${pid}/media`, { token: tokens.editor }), { id: String(pid) })
    expect(list.status).toBe(200)
    const items = ((await bodyJson(list)).data as Array<{ id: number }>).filter((m) =>
      raw.prepare('SELECT product_id FROM product_media WHERE id = ?').get(m.id),
    )
    expect(items.length).toBeGreaterThanOrEqual(1)
    const mediaId = items[items.length - 1].id

    const content = await invoke(mediaContent, apiReq(`/api/admin/media/${mediaId}/content`, { token: tokens.editor }), { id: String(mediaId) })
    expect(content.status).toBe(200)
    expect(content.headers.get('Content-Type')).toBe('image/png')
  })

  it('rejects a text file masquerading as an image (magic-byte sniffing)', async () => {
    const pid = productId()
    const res = await invoke(mediaUpload, uploadRequest(pid, tokens.editor, new TextEncoder().encode('not an image'), 'fake.png'), { id: String(pid) })
    expect(res.status).toBe(400)
    expect(env.bucket.objects.size).toBe(0)
  })

  it('upload without a token → 401; content without a token → 401', async () => {
    const pid = productId()
    await expectError(await invoke(mediaUpload, uploadRequest(pid, null, PNG_BYTES, 'x.png'), { id: String(pid) }), 401, 'UNAUTHENTICATED')
    const ok = await invoke(mediaUpload, uploadRequest(pid, tokens.editor, PNG_BYTES, 'x.png'), { id: String(pid) })
    expect(ok.status).toBe(201)
    const mediaId = (raw.prepare('SELECT MAX(id) AS id FROM product_media').get() as { id: number }).id
    await expectError(await invoke(mediaContent, apiReq(`/api/admin/media/${mediaId}/content`), { id: String(mediaId) }), 401, 'UNAUTHENTICATED')
  })

  it('media PATCH with an empty body writes NO audit row (F-17)', async () => {
    const pid = productId()
    const ok = await invoke(mediaUpload, uploadRequest(pid, tokens.editor, PNG_BYTES, 'x.png'), { id: String(pid) })
    expect(ok.status).toBe(201)
    const mediaId = (raw.prepare('SELECT MAX(id) AS id FROM product_media').get() as { id: number }).id
    const auditsBefore = (raw.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'product_media.update'").get() as { n: number }).n
    const res = await invoke(
      mediaPatch,
      apiReq(`/api/admin/media/${mediaId}`, { method: 'PATCH', token: tokens.editor, json: {} }),
      { id: String(mediaId) },
    )
    expect(res.status).toBe(200)
    const auditsAfter = (raw.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'product_media.update'").get() as { n: number }).n
    expect(auditsAfter).toBe(auditsBefore)
  })
})

describe('editorial status transitions (content RBAC)', () => {
  function articleId(): number {
    const row = raw
      .prepare(
        `INSERT INTO articles (slug, title, status, author_admin_id)
         SELECT 'route-article', 'Route Article', 'draft', id FROM admin_users WHERE email = 'owner@example.invalid'
         RETURNING id`,
      )
      .get() as { id: number }
    return row.id
  }

  it('editor may move draft → in_review (200)', async () => {
    const id = articleId()
    const res = await invoke(articleStatus, post(`/api/admin/articles/${id}/status`, tokens.editor, { status: 'in_review' }), { id: String(id) })
    expect(res.status).toBe(200)
    expect(raw.prepare('SELECT status FROM articles WHERE id = ?').get(id)).toEqual({ status: 'in_review' })
  })

  it('editor may NOT publish (403 — publisher-only action)', async () => {
    const id = articleId()
    await expectError(
      await invoke(articleStatus, post(`/api/admin/articles/${id}/status`, tokens.editor, { status: 'published' }), { id: String(id) }),
      403,
      'FORBIDDEN',
    )
    expect(raw.prepare('SELECT status FROM articles WHERE id = ?').get(id)).toEqual({ status: 'draft' })
  })

  it('viewer may not transition at all (403)', async () => {
    const id = articleId()
    await expectError(
      await invoke(articleStatus, post(`/api/admin/articles/${id}/status`, tokens.viewer, { status: 'in_review' }), { id: String(id) }),
      403,
      'FORBIDDEN',
    )
  })
})
