// Admin system surfaces — Stage 04 §9: audit log reads + immutability,
// user listings that never expose credentials, dashboard aggregates, and
// the same-origin guard for browser-triggered mutations.
import { describe, expect, it } from 'vitest'
import { createProduct, type AdminActor } from '../app/lib/db/admin'
import * as adminSystem from '../app/lib/db/admin-system'
import { getAdminDashboard } from '../app/lib/db/admin-dashboard'
import { assertSameOrigin } from '../app/lib/origin'
import { ApiError } from '../app/lib/api'
import { freshCatalogDb } from './helpers/sqlite-d1'

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

describe('audit log', () => {
  it('records mutations and filters by entity and action', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createProduct(db, actor, {
      categorySlug: 'home-office',
      slug: 'stage04-audited',
      name: 'Stage04 Audited Product',
    })
    if (!('id' in created)) throw new Error('create failed')
    const all = await adminSystem.listAudit(db, { entityType: 'product' })
    expect(all.items.some((r) => r.action === 'product.create' && r.entity_id === created.id)).toBe(true)
    expect(all.items[0]?.actor_email).toBe('owner@example.invalid')
    const byAction = await adminSystem.listAudit(db, { action: 'product.publish' })
    expect(byAction.items).toHaveLength(0)
    const byEntity = await adminSystem.listAudit(db, { entityType: 'product', entityId: created.id })
    expect(byEntity.items.every((r) => r.entity_id === created.id)).toBe(true)
  })

  it('exposes no mutation path for audit records', () => {
    const exported = Object.keys(adminSystem)
    expect(exported.some((name) => /delete|update|edit|remove/i.test(name))).toBe(false)
  })
})

describe('user listings', () => {
  it('lists administrators and never selects password hashes for public users', async () => {
    const { db } = freshCatalogDb()
    const admins = await adminSystem.listAdminUsers(db)
    expect(admins.map((a) => a.email)).toContain('owner@example.invalid')
    await db
      .prepare("INSERT INTO users (email, password_hash) VALUES ('reader@example.invalid', 'argon2-secret-hash')")
      .run()
    const { items } = await adminSystem.listPublicUsers(db, {})
    const reader = items.find((u) => u.email === 'reader@example.invalid')
    expect(reader).toBeDefined()
    expect(reader && 'password_hash' in reader).toBe(false)
    expect(JSON.stringify(reader)).not.toContain('argon2-secret-hash')
  })
})

describe('system status and analytics', () => {
  it('probes D1 live and reports bindings as presence-only', async () => {
    const { db } = freshCatalogDb()
    const status = await adminSystem.getSystemStatus(db, {})
    expect(status.d1).toBe('ok')
    expect(status.bindings).toEqual({
      kv: false,
      r2: false,
      queue: false,
      searchRateLimiter: false,
      adminRateLimiter: false,
    })
    expect(status.bindingCheck).toContain('presence-only')
    expect(status.queueNote).toContain('Queue depth and DLQ contents are not')
    expect(status.foundationMeta.length).toBeGreaterThan(0)
    const analytics = await adminSystem.getAnalytics(db)
    expect(analytics.daily).toEqual([])
    expect(analytics.clicks.total).toBe(0)
  })
})

describe('dashboard aggregates', () => {
  it('counts the fixture catalog exactly', async () => {
    const { db } = freshCatalogDb()
    const dashboard = await getAdminDashboard(db)
    expect(dashboard.counts).toMatchObject({
      products_total: 6,
      products_draft: 1,
      products_published: 5,
      validation_passed: 5,
      validation_failed: 1,
      validation_pending: 0,
      categories: 2,
      brands: 1,
      merchants: 1,
      offers: 2,
      media: 0,
      guides: 0,
      articles: 0,
    })
    expect(dashboard.offers_price_hidden).toBe(2)
    expect(dashboard.freshness).toEqual([
      { source_id: 'dev-fixture', products: 6, last_source_update: null },
    ])
    expect(dashboard.validation_failures.map((f) => f.slug)).toEqual(['dev-fixture-unvalidated-product'])
  })
})

describe('same-origin guard', () => {
  const request = (headers: Record<string, string>) =>
    new Request('https://admin.example.invalid/api/admin/products', { method: 'POST', headers })

  it('allows same-origin and header-less requests', () => {
    expect(() =>
      assertSameOrigin(request({ Origin: 'https://admin.example.invalid', Host: 'admin.example.invalid' })),
    ).not.toThrow()
    expect(() => assertSameOrigin(request({ Host: 'admin.example.invalid' }))).not.toThrow()
    expect(() =>
      assertSameOrigin(request({ Referer: 'https://admin.example.invalid/admin/products', Host: 'admin.example.invalid' })),
    ).not.toThrow()
  })

  it('rejects cross-origin mutations with a 403 envelope error', () => {
    try {
      assertSameOrigin(request({ Origin: 'https://evil.example', Host: 'admin.example.invalid' }))
      expect.unreachable('cross-origin request must be rejected')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe('FORBIDDEN')
    }
  })
})
