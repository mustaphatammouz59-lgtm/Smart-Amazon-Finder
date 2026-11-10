import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { freshCatalogDb } from '../helpers/sqlite-d1'
import { createJwksServer, type JwksServer } from '../helpers/jwks-server'
import { EMAILS, apiReq, bodyJson, invoke, seedAdminUsers, setupRouteEnv } from '../helpers/route-harness'
import { action as productsCreate } from '../../app/routes/api.admin.products'
import { action as productSpecs } from '../../app/routes/api.admin.product-specs'
import { action as productValidate } from '../../app/routes/api.admin.product-validate'
import { action as productPublish } from '../../app/routes/api.admin.product-publish'

/**
 * Stage 05.3 route-level proof (FI-1): the required-attribute rule
 * holds through the real admin API — there is no direct-API bypass.
 * A product created and specced entirely through route modules,
 * without its category's required attribute, fails the validate
 * route and is refused by the publish route (409); recording the
 * required spec through the route makes it validate and publish.
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
  // Seed (via raw) a category whose power_delivery_w definition is
  // required (is_required = 1, migration 0006) and whose note
  // definition is optional.
  raw
    .prepare(
      `INSERT INTO categories (slug, name, description, sort_order, is_indexable)
       VALUES ('route-req-category', 'Route Required Category', 'Stage 05.3 route fixture.', 99, 0)`,
    )
    .run()
  const insertDef = raw.prepare(
    `INSERT INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_required, is_comparison_criterion, sort_weight)
     SELECT id, ?, ?, ?, ?, 0, ?, 0, 0 FROM categories WHERE slug = 'route-req-category'`,
  )
  insertDef.run('power_delivery_w', 'Power delivery', 'W', 'number', 1)
  insertDef.run('optional_note', 'Optional note', null, 'text', 0)
})

function defId(key: string): number {
  return (
    raw
      .prepare(
        `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
          WHERE c.slug = 'route-req-category' AND d.key = ?`,
      )
      .get(key) as { id: number }
  ).id
}

const post = (path: string, token: string, json: unknown = {}) => apiReq(path, { method: 'POST', token, json })

describe('Stage 05.3: required attributes hold through the admin API (no bypass)', () => {
  it('create → specs without the required attr → validate failed → publish 409 → set required spec → validate passed → publish 200', async () => {
    // Create the product through the route (editor).
    const created = await invoke(
      productsCreate,
      post('/api/admin/products', tokens.editor, {
        categorySlug: 'route-req-category',
        slug: 'route-req-widget',
        name: 'Route Required Widget',
        editorialSummary: 'A widget created through the route-level Stage 05.3 flow.',
      }),
    )
    expect(created.status).toBe(201)
    const id = ((await bodyJson(created)).data as { id: number }).id

    const putSpecs = (specs: Array<{ definitionId: number; value: unknown }>) =>
      invoke(
        productSpecs,
        apiReq(`/api/admin/products/${id}/specs`, { method: 'PUT', token: tokens.editor, json: { specs } }),
        { id: String(id) },
      )

    // Set specs WITHOUT the required attribute (an optional spec only,
    // so the legacy >= 1-spec term is satisfied and only FI-1 can fail it).
    expect((await putSpecs([{ definitionId: defId('optional_note'), value: 'noted' }])).status).toBe(200)

    // Validate through the route → failed with the FI-1 code.
    const failedValidation = await invoke(productValidate, post(`/api/admin/products/${id}/validate`, tokens.editor), {
      id: String(id),
    })
    expect(failedValidation.status).toBe(200)
    const failedData = (await bodyJson(failedValidation)).data as {
      status: string
      issues: Array<{ code: string; field: string }>
    }
    expect(failedData.status).toBe('failed')
    expect(failedData.issues.some((i) => i.code === 'missing_required_attribute' && i.field === 'specs.power_delivery_w')).toBe(
      true,
    )

    // Publish through the route → refused (409 CONFLICT, the publish
    // route's existing behaviour for a non-passed validation status).
    const refused = await invoke(productPublish, post(`/api/admin/products/${id}/publish`, tokens.publisher), {
      id: String(id),
    })
    expect(refused.status).toBe(409)
    expect(((await bodyJson(refused)).error as { code: string }).code).toBe('CONFLICT')
    expect((raw.prepare('SELECT status FROM products WHERE id = ?').get(id) as { status: string }).status).toBe('draft')

    // Record the required spec through the route, revalidate, publish.
    expect((await putSpecs([{ definitionId: defId('power_delivery_w'), value: 65 }])).status).toBe(200)
    const passedValidation = await invoke(productValidate, post(`/api/admin/products/${id}/validate`, tokens.editor), {
      id: String(id),
    })
    expect(passedValidation.status).toBe(200)
    expect(((await bodyJson(passedValidation)).data as { status: string }).status).toBe('passed')

    const published = await invoke(productPublish, post(`/api/admin/products/${id}/publish`, tokens.publisher), {
      id: String(id),
    })
    expect(published.status).toBe(200)
    expect((raw.prepare('SELECT status FROM products WHERE id = ?').get(id) as { status: string }).status).toBe(
      'published',
    )
  })
})
